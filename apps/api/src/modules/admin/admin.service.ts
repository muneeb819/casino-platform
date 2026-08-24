import { BadRequestException, Injectable } from "@nestjs/common";
import type { GgrRow } from "@platform/shared";
import { PrismaService } from "../../common/prisma.service";
import { WalletService } from "../wallet/wallet.service";

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
  ) {}

  async overview() {
    const agg = await this.prisma.transaction.groupBy({
      by: ["type"],
      _sum: { amountCents: true },
      _count: { _all: true },
    });
    const sumOf = (t: string) => agg.find((a) => a.type === t)?._sum.amountCents ?? 0;
    const players = await this.prisma.user.count({ where: { role: "PLAYER" } });
    const sessions = await this.prisma.gameSession.count();
    return {
      players,
      sessions,
      depositsCents: sumOf("DEPOSIT"),
      withdrawalsCents: Math.abs(sumOf("WITHDRAWAL")),
      wageredCents: Math.abs(sumOf("BET")),
      wonCents: sumOf("WIN"),
      ggrCents: Math.abs(sumOf("BET")) - sumOf("WIN"),
      bonusCreditedCents: sumOf("BONUS_CREDIT"),
    };
  }

  async players(q?: string) {
    const users = await this.prisma.user.findMany({
      where: q ? { email: { contains: q } } : {},
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        accounts: { where: { kind: { in: ["REAL", "BONUS"] } } },
        kycDocuments: true,
      },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      status: u.status,
      kycStatus: u.kycStatus,
      currency: u.currency,
      affiliateCode: u.affiliateCode,
      createdAt: u.createdAt,
      realBalanceCents: u.accounts.find((a) => a.kind === "REAL")?.balanceCents ?? 0,
      bonusBalanceCents: u.accounts.find((a) => a.kind === "BONUS")?.balanceCents ?? 0,
      pendingKycDocs: u.kycDocuments.filter((d) => d.status === "PENDING").length,
    }));
  }

  async setStatus(userId: string, status: "ACTIVE" | "SUSPENDED") {
    if (!["ACTIVE", "SUSPENDED"].includes(status)) throw new BadRequestException("Bad status");
    await this.prisma.user.update({
      where: { id: userId },
      data: { status, ...(status === "ACTIVE" ? { excludedUntil: null } : {}) },
    });
    return { ok: true };
  }

  adjust(userId: string, kind: "REAL" | "BONUS", amountCents: number, reason: string) {
    return this.wallet.adjustBalance(userId, kind, amountCents, reason);
  }

  async kycQueue() {
    return this.prisma.kycDocument.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { email: true, id: true } } },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
  }

  async reviewKyc(docId: string, decision: "APPROVED" | "REJECTED", note?: string) {
    const doc = await this.prisma.kycDocument.update({
      where: { id: docId },
      data: { status: decision, note: note ?? null },
    });
    await this.prisma.user.update({
      where: { id: doc.userId },
      data: { kycStatus: decision === "APPROVED" ? "VERIFIED" : "REJECTED" },
    });
    return doc;
  }

  async submitKyc(userId: string, docType: string, fileRef: string) {
    await this.prisma.kycDocument.create({ data: { userId, docType, fileRef } });
    await this.prisma.user.update({ where: { id: userId }, data: { kycStatus: "PENDING" } });
    return { ok: true };
  }

  async ggr(fromIso?: string, toIso?: string): Promise<GgrRow[]> {
    const range = {
      ...(fromIso ? { gte: new Date(fromIso) } : {}),
      ...(toIso ? { lte: new Date(toIso) } : {}),
    };
    const groups = await this.prisma.transaction.groupBy({
      by: ["gameId", "type"],
      where: { type: { in: ["BET", "WIN"] }, createdAt: range },
      _sum: { amountCents: true },
      _count: { _all: true },
    });
    const gameIds = [...new Set(groups.map((g) => g.gameId).filter((v): v is string => !!v))];
    const games = await this.prisma.game.findMany({ where: { id: { in: gameIds } } });

    const merged = new Map<string, GgrRow>();
    for (const g of groups) {
      const game = games.find((x) => x.id === g.gameId);
      const key = g.gameId ?? "unattributed";
      const row =
        merged.get(key) ??
        ({
          providerCode: game?.providerCode ?? "-",
          gameId: g.gameId,
          gameName: game?.name ?? "Unattributed",
          betCents: 0,
          winCents: 0,
          ggrCents: 0,
          rounds: 0,
        } satisfies GgrRow);
      if (g.type === "BET") {
        row.betCents += Math.abs(g._sum.amountCents ?? 0);
        row.rounds = g._count._all;
      } else if (g.type === "WIN") {
        row.winCents += g._sum.amountCents ?? 0;
      }
      row.ggrCents = row.betCents - row.winCents;
      merged.set(key, row);
    }
    return [...merged.values()].sort((a, b) => b.ggrCents - a.ggrCents);
  }
}
