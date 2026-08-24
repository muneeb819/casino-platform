import { Injectable, OnModuleInit } from "@nestjs/common";
import crypto from "crypto";
import type { Game } from "@prisma/client";
import { PROVIDERS, type GameCategory, type GameDto, type SessionDto } from "@platform/shared";
import { PrismaService } from "../../common/prisma.service";
import { WalletService } from "../wallet/wallet.service";
import type { AggregatorAdapter } from "./aggregator.interface";
import { MockAggregatorService } from "./mock-aggregator.service";

@Injectable()
export class GamesService implements OnModuleInit {
  private aggregator: AggregatorAdapter;

  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
    mockAgg: MockAggregatorService,
  ) {
    this.aggregator = mockAgg;
  }

  async onModuleInit() {
    await this.syncCatalog();
  }

  private async syncCatalog() {
    for (const item of this.aggregator.listGames()) {
      await this.prisma.game.upsert({
        where: { providerCode_providerGameId: {
          providerCode: item.providerCode,
          providerGameId: item.providerGameId,
        } },
        create: item,
        update: { name: item.name, category: item.category, thumbnail: item.thumbnail, rtp: item.rtp },
      });
    }
  }

  async listGames(category?: string): Promise<GameDto[]> {
    const games = await this.prisma.game.findMany({
      where: { active: true, ...(category ? { category } : {}) },
      orderBy: [{ providerCode: "asc" }, { name: "asc" }],
    });
    return games.map((g) => this.toDto(g));
  }

  async getGame(id: string) {
    const g = await this.prisma.game.findUnique({ where: { id } });
    return g ? this.toDto(g) : null;
  }

  async launch(userId: string, gameId: string): Promise<SessionDto> {
    await this.wallet.assertPlayable(userId);
    const game = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!game || !game.active) throw new Error("Game not found");
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const sessionToken = crypto.randomBytes(24).toString("hex");
    const { launchUrl } = await this.aggregator.createSession({
      userId,
      game: {
        providerCode: game.providerCode,
        providerGameId: game.providerGameId,
        name: game.name,
        category: game.category as never,
        thumbnail: game.thumbnail,
        rtp: game.rtp ?? 96,
      },
      currency: user.currency,
      locale: user.locale,
      sessionToken,
    });

    const session = await this.prisma.gameSession.create({
      data: { userId, gameId, sessionToken, launchUrl, currency: user.currency, locale: user.locale },
    });

    return {
      sessionId: session.id,
      launchUrl,
      game: this.toDto(game),
    };
  }

  private toDto(g: Game): GameDto {
    return {
      id: g.id,
      providerCode: g.providerCode,
      providerName: PROVIDERS.find((p) => p.code === g.providerCode)?.name ?? g.providerCode,
      name: g.name,
      category: g.category as GameCategory,
      thumbnail: g.thumbnail,
      rtp: g.rtp,
    };
  }
}
