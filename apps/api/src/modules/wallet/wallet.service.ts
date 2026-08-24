import { Injectable } from "@nestjs/common";
import { Prisma, type Account } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import {
  AppError,
  InsufficientFundsError,
  LimitExceededError,
  NotFoundError,
  PlayerBlockedError,
} from "../../common/errors";

type TxCli = Prisma.TransactionClient;
type Direction = "DEBIT" | "CREDIT";

interface Leg {
  account: Account;
  direction: Direction;
  amountCents: number;
}

export interface BetParams {
  userId: string;
  gameId?: string | null;
  roundId: string;
  amountCents: number;
  currency?: string;
}

function assertPositive(amountCents: number) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new AppError("INVALID_AMOUNT", "Amount must be a positive integer of minor units");
  }
}

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async assertPlayable(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundError("Player");
    if (u.status === "SUSPENDED") throw new PlayerBlockedError("suspended");
    if (u.status === "SELF_EXCLUDED" && u.excludedUntil && u.excludedUntil > new Date()) {
      throw new PlayerBlockedError("self-excluded");
    }
    return u;
  }

  listAccounts(userId: string) {
    return this.prisma.account.findMany({ where: { userId }, orderBy: { kind: "asc" } });
  }

  async balanceOf(userId: string, kind = "REAL", currency = "USD"): Promise<number> {
    const acc = await this.prisma.account.findFirst({ where: { userId, kind, currency } });
    return acc?.balanceCents ?? 0;
  }

  listTransactions(userId: string, take = 50, before?: Date) {
    return this.prisma.transaction.findMany({
      where: { userId, ...(before ? { createdAt: { lt: before } } : {}) },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  private async getOrCreateAccount(
    tx: TxCli,
    userId: string | null,
    kind: string,
    currency: string,
  ): Promise<Account> {
    const existing = await tx.account.findFirst({ where: { userId, kind, currency } });
    if (existing) return existing;
    return tx.account.create({ data: { userId, kind, currency } });
  }

  private async move(tx: TxCli, leg: Leg, transactionId: string): Promise<void> {
    assertPositive(leg.amountCents);
    if (leg.direction === "DEBIT") {
      const isHouse = leg.account.userId === null;
      const res = await tx.account.updateMany({
        where: {
          id: leg.account.id,
          ...(isHouse ? {} : { balanceCents: { gte: leg.amountCents } }),
        },
        data: { balanceCents: { decrement: leg.amountCents } },
      });
      if (res.count === 0) throw new InsufficientFundsError();
    } else {
      await tx.account.update({
        where: { id: leg.account.id },
        data: { balanceCents: { increment: leg.amountCents } },
      });
    }
    const fresh = await tx.account.findUniqueOrThrow({ where: { id: leg.account.id } });
    await tx.ledgerEntry.create({
      data: {
        transactionId,
        accountId: leg.account.id,
        direction: leg.direction,
        amountCents: leg.amountCents,
        balanceAfterCents: fresh.balanceCents,
      },
    });
  }

  private async record(tx: TxCli, head: Prisma.TransactionUncheckedCreateInput, legs: Leg[]) {
    const t = await tx.transaction.create({ data: head });
    for (const leg of legs) await this.move(tx, leg, t.id);
    return t;
  }

  async deposit(userId: string, amountCents: number, reference?: string, meta?: Record<string, unknown>) {
    assertPositive(amountCents);
    await this.assertPlayable(userId);
    await this.assertDepositLimits(userId, amountCents);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const player = await this.getOrCreateAccount(tx, userId, "REAL", user.currency);
      const house = await this.getOrCreateAccount(tx, null, "REAL", user.currency);
      return this.record(
        tx,
        {
          type: "DEPOSIT",
          userId,
          reference: reference ?? null,
          amountCents,
          meta: meta ? JSON.stringify(meta) : null,
        },
        [
          { account: house, direction: "DEBIT", amountCents },
          { account: player, direction: "CREDIT", amountCents },
        ],
      );
    });
  }

  async withdraw(userId: string, amountCents: number, reference?: string) {
    assertPositive(amountCents);
    await this.assertPlayable(userId);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const player = await this.getOrCreateAccount(tx, userId, "REAL", user.currency);
      const house = await this.getOrCreateAccount(tx, null, "REAL", user.currency);
      return this.record(
        tx,
        { type: "WITHDRAWAL", userId, reference: reference ?? null, amountCents: -amountCents },
        [
          { account: player, direction: "DEBIT", amountCents },
          { account: house, direction: "CREDIT", amountCents },
        ],
      );
    });
  }

  private async assertDepositLimits(userId: string, incomingCents: number) {
    const limit = await this.prisma.depositLimit.findUnique({ where: { userId } });
    if (!limit) return;
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 3600e3);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600e3);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 3600e3);
    const sumSince = async (since: Date) => {
      const agg = await this.prisma.transaction.aggregate({
        where: { userId, type: "DEPOSIT", createdAt: { gte: since } },
        _sum: { amountCents: true },
      });
      return agg._sum.amountCents ?? 0;
    };
    if ((await sumSince(dayAgo)) + incomingCents > limit.dailyLimitCents)
      throw new LimitExceededError("Daily");
    if ((await sumSince(weekAgo)) + incomingCents > limit.weeklyLimitCents)
      throw new LimitExceededError("Weekly");
    if ((await sumSince(monthAgo)) + incomingCents > limit.monthlyLimitCents)
      throw new LimitExceededError("Monthly");
  }

  async placeBet(params: BetParams): Promise<{ balanceCents: number; duplicate: boolean }> {
    const { userId, gameId, roundId, amountCents } = params;
    assertPositive(amountCents);
    await this.assertPlayable(params.userId);

    try {
      const balanceCents = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
        const player = await this.getOrCreateAccount(tx, userId, "REAL", user.currency);
        const house = await this.getOrCreateAccount(tx, null, "REAL", user.currency);
        await this.record(
          tx,
          {
            type: "BET",
            userId,
            gameId: gameId ?? null,
            providerRoundId: roundId,
            amountCents: -amountCents,
          },
          [
            { account: player, direction: "DEBIT", amountCents },
            { account: house, direction: "CREDIT", amountCents },
          ],
        );
        const fresh = await tx.account.findUniqueOrThrow({ where: { id: player.id } });
        return fresh.balanceCents;
      });
      return { balanceCents, duplicate: false };
    } catch (e) {
      if (this.isUniqueViolation(e)) {
        return { balanceCents: await this.balanceOf(userId), duplicate: true };
      }
      throw e;
    }
  }

  async settleWin(params: BetParams): Promise<{ balanceCents: number }> {
    const { userId, gameId, roundId, amountCents } = params;
    if (amountCents === 0) return { balanceCents: await this.balanceOf(userId) };
    assertPositive(amountCents);

    try {
      const balanceCents = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
        const player = await this.getOrCreateAccount(tx, userId, "REAL", user.currency);
        const house = await this.getOrCreateAccount(tx, null, "REAL", user.currency);
        await this.record(
          tx,
          {
            type: "WIN",
            userId,
            gameId: gameId ?? null,
            providerRoundId: roundId,
            amountCents,
          },
          [
            { account: house, direction: "DEBIT", amountCents },
            { account: player, direction: "CREDIT", amountCents },
          ],
        );
        const fresh = await tx.account.findUniqueOrThrow({ where: { id: player.id } });
        return fresh.balanceCents;
      });
      return { balanceCents };
    } catch (e) {
      if (this.isUniqueViolation(e)) {
        return { balanceCents: await this.balanceOf(userId) };
      }
      throw e;
    }
  }

  async rollbackRound(userId: string, roundId: string): Promise<{ balanceCents: number }> {
    return this.prisma.$transaction(async (tx) => {
      const already = await tx.transaction.findUnique({
        where: { providerRoundId_type: { providerRoundId: roundId, type: "ROLLBACK" } },
      });
      if (already) return { balanceCents: await this.balanceOf(userId) };

      const bet = await tx.transaction.findUnique({
        where: { providerRoundId_type: { providerRoundId: roundId, type: "BET" } },
      });
      if (!bet) throw new NotFoundError("Bet round");
      const settled = await tx.transaction.findUnique({
        where: { providerRoundId_type: { providerRoundId: roundId, type: "WIN" } },
      });
      if (settled) throw new AppError("ROUND_ALREADY_SETTLED", "Round already has a win");

      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const player = await this.getOrCreateAccount(tx, userId, "REAL", user.currency);
      const house = await this.getOrCreateAccount(tx, null, "REAL", user.currency);
      const amount = Math.abs(bet.amountCents);
      await this.record(
        tx,
        {
          type: "ROLLBACK",
          userId,
          gameId: bet.gameId,
          providerRoundId: roundId,
          amountCents: amount,
          meta: JSON.stringify({ revertedBetTx: bet.id }),
        },
        [
          { account: house, direction: "DEBIT", amountCents: amount },
          { account: player, direction: "CREDIT", amountCents: amount },
        ],
      );
      const fresh = await tx.account.findUniqueOrThrow({ where: { id: player.id } });
      return { balanceCents: fresh.balanceCents };
    });
  }

  async adjustBalance(
    targetUserId: string,
    kind: "REAL" | "BONUS",
    amountCents: number,
    reason: string,
  ) {
    if (!Number.isInteger(amountCents) || amountCents === 0) {
      throw new AppError("INVALID_AMOUNT", "Adjustment must be non-zero integer");
    }
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundError("Player");

    return this.prisma.$transaction(async (tx) => {
      const player = await this.getOrCreateAccount(tx, targetUserId, kind, user.currency);
      const house = await this.getOrCreateAccount(tx, null, kind, user.currency);
      const credit = amountCents > 0;
      return this.record(
        tx,
        {
          type: "ADJUSTMENT",
          userId: targetUserId,
          amountCents,
          meta: JSON.stringify({ reason }),
        },
        credit
          ? [
              { account: house, direction: "DEBIT", amountCents },
              { account: player, direction: "CREDIT", amountCents },
            ]
          : [
              { account: player, direction: "DEBIT", amountCents: -amountCents },
              { account: house, direction: "CREDIT", amountCents: -amountCents },
            ],
      );
    });
  }

  async grantWelcomeBonus(userId: string, amountCents: number) {
    if (amountCents <= 0) return null;
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.prisma.$transaction(async (tx) => {
      const player = await this.getOrCreateAccount(tx, userId, "BONUS", user.currency);
      const house = await this.getOrCreateAccount(tx, null, "BONUS", user.currency);
      return this.record(
        tx,
        { type: "BONUS_CREDIT", userId, amountCents, meta: JSON.stringify({ reason: "welcome" }) },
        [
          { account: house, direction: "DEBIT", amountCents },
          { account: player, direction: "CREDIT", amountCents },
        ],
      );
    });
  }

  private isUniqueViolation(e: unknown): boolean {
    return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
  }
}
