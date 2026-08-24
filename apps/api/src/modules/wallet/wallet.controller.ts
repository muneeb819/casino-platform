import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from "@nestjs/common";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { JwtAuthGuard, CurrentUser, type AuthedUser } from "../../common/auth.guards";
import { SignatureGuard } from "../../common/signature.guard";
import type { Transaction } from "@prisma/client";
import {
  MIN_WITHDRAWAL_CENTS,
  type AccountDto,
  type TransactionDto,
} from "@platform/shared";
import { WalletService } from "./wallet.service";
import { AppError } from "../../common/errors";

class DepositDto {
  @IsInt() @Min(100) @Max(50_000_00)
  amountCents: number;
}

class WithdrawDto {
  @IsInt() @Min(MIN_WITHDRAWAL_CENTS) @Max(50_000_00)
  amountCents: number;
}

class ProviderBetDto {
  @IsString() userId: string;
  @IsString() roundId: string;
  @IsInt() @Min(1)
  amountCents: number;
  @IsString() @IsOptional()
  gameId?: string;
}

class ProviderRollbackDto {
  @IsString() userId: string;
  @IsString() roundId: string;
}

function toTxDto(t: Transaction): TransactionDto {
  return {
    id: t.id,
    type: t.type as TransactionDto["type"],
    reference: t.reference,
    gameId: t.gameId,
    amountCents: t.amountCents,
    meta: t.meta,
    createdAt: t.createdAt.toISOString(),
  };
}

@Controller()
export class WalletController {
  constructor(private wallet: WalletService) {}

  @UseGuards(JwtAuthGuard)
  @Get("wallet/accounts")
  async accounts(@CurrentUser() user: AuthedUser): Promise<AccountDto[]> {
    const accs = await this.wallet.listAccounts(user.id);
    return accs
      .filter((a) => a.kind !== "HOUSE")
      .map((a) => ({ id: a.id, kind: a.kind as AccountDto["kind"], currency: a.currency, balanceCents: a.balanceCents }));
  }

  @UseGuards(JwtAuthGuard)
  @Get("wallet/transactions")
  async transactions(
    @CurrentUser() user: AuthedUser,
    @Query("take") take = "50",
  ): Promise<TransactionDto[]> {
    const rows = await this.wallet.listTransactions(user.id, Math.min(Number(take) || 50, 200));
    return rows.map(toTxDto);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post("payments/deposit")
  async deposit(@CurrentUser() user: AuthedUser, @Body() dto: DepositDto) {
    const ref = `psp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const tx = await this.wallet.deposit(user.id, dto.amountCents, ref, { psp: "mock-psp", status: "APPROVED" });
    return { transaction: toTxDto(tx), balanceCents: await this.wallet.balanceOf(user.id) };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post("payments/withdraw")
  async withdraw(@CurrentUser() user: AuthedUser, @Body() dto: WithdrawDto) {
    const ref = `psp_w_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const tx = await this.wallet.withdraw(user.id, dto.amountCents, ref);
    return { transaction: toTxDto(tx), balanceCents: await this.wallet.balanceOf(user.id) };
  }
}

@Controller("provider/wallet")
@UseGuards(SignatureGuard)
export class ProviderWalletController {
  constructor(private wallet: WalletService) {}

  @HttpCode(200)
  @Post("bet")
  async bet(@Body() dto: ProviderBetDto) {
    try {
      const res = await this.wallet.placeBet({
        userId: dto.userId,
        gameId: dto.gameId ?? null,
        roundId: dto.roundId,
        amountCents: dto.amountCents,
      });
      return { ok: true, balanceCents: res.balanceCents };
    } catch (e) {
      return this.mapError(e);
    }
  }

  @HttpCode(200)
  @Post("win")
  async win(@Body() dto: ProviderBetDto) {
    try {
      const res = await this.wallet.settleWin({
        userId: dto.userId,
        gameId: dto.gameId ?? null,
        roundId: dto.roundId,
        amountCents: dto.amountCents,
      });
      return { ok: true, balanceCents: res.balanceCents };
    } catch (e) {
      return this.mapError(e);
    }
  }

  @HttpCode(200)
  @Post("rollback")
  async rollback(@Body() dto: ProviderRollbackDto) {
    try {
      const res = await this.wallet.rollbackRound(dto.userId, dto.roundId);
      return { ok: true, balanceCents: res.balanceCents };
    } catch (e) {
      return this.mapError(e);
    }
  }

  private mapError(e: unknown) {
    if (e instanceof AppError) return { ok: false, error: e.code };
    return { ok: false, error: "UNKNOWN_ERROR" };
  }
}
