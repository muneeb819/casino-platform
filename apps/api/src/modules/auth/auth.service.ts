import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import crypto from "crypto";
import * as bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { WalletService } from "../wallet/wallet.service";
import { AppConfig } from "../../common/config";
import type { PublicUser } from "@platform/shared";
import { LoginDto, RefreshDto, RegisterDto } from "./auth.dto";

const REFRESH_TTL_MS = 7 * 24 * 3600e3;

function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    email: u.email,
    role: u.role as PublicUser["role"],
    status: u.status as PublicUser["status"],
    kycStatus: u.kycStatus as PublicUser["kycStatus"],
    currency: u.currency,
    locale: u.locale,
    affiliateCode: u.affiliateCode,
    excludedUntil: u.excludedUntil ? u.excludedUntil.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
  };
}

@Injectable()
export class AuthService {
  private jwt = new JwtService({ secret: AppConfig.load().jwtSecret });

  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: PublicUser; accessToken: string; refreshToken: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException("Email already registered");

    let referredBy: string | null = null;
    if (dto.affiliateRef) {
      const ref = await this.prisma.user.findUnique({ where: { affiliateCode: dto.affiliateRef } });
      referredBy = ref?.id ?? null;
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        currency: dto.currency ?? "USD",
        locale: dto.locale ?? "en",
        referredBy,
      },
    });
    await this.wallet.grantWelcomeBonus(user.id, AppConfig.load().demoBonusCents);
    return this.issueTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return this.issueTokens(user);
  }

  async refresh(dto: RefreshDto) {
    const tokenHash = crypto.createHash("sha256").update(dto.refreshToken).digest("hex");
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid refresh token");
    }
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.issueTokens(stored.user);
  }

  async logout(refreshToken: string) {
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    await this.prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revokedAt: new Date() } });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const accounts = (await this.wallet.listAccounts(userId)).filter((a) => a.kind !== "HOUSE");
    return { user: toPublicUser(user), accounts };
  }

  private async issueTokens(user: User) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role }, { expiresIn: "15m" });
    const refreshToken = crypto.randomBytes(48).toString("hex");
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: crypto.createHash("sha256").update(refreshToken).digest("hex"),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    return { user: toPublicUser(user), accessToken, refreshToken };
  }
}
