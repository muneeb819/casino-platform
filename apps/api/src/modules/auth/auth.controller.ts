import { Body, Controller, Get, HttpCode, Post, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, CurrentUser, type AuthedUser } from "../../common/auth.guards";
import { AuthService } from "./auth.service";
import { LimitsDto, LoginDto, RefreshDto, RegisterDto, SelfExcludeDto } from "./auth.dto";
import { PrismaService } from "../../common/prisma.service";

@Controller("auth")
export class AuthController {
  constructor(
    private auth: AuthService,
    private prisma: PrismaService,
  ) {}

  @HttpCode(200)
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @HttpCode(200)
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @HttpCode(200)
  @Post("refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto);
  }

  @HttpCode(200)
  @Post("logout")
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: AuthedUser) {
    return this.auth.me(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put("me/rg/limits")
  async setLimits(@CurrentUser() user: AuthedUser, @Body() dto: LimitsDto) {
    const limit = await this.prisma.depositLimit.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...dto },
      update: { ...dto },
    });
    return limit;
  }

  @UseGuards(JwtAuthGuard)
  @Get("me/rg/limits")
  getLimits(@CurrentUser() user: AuthedUser) {
    return this.prisma.depositLimit.findUnique({ where: { userId: user.id } });
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post("me/rg/self-exclude")
  async selfExclude(@CurrentUser() user: AuthedUser, @Body() dto: SelfExcludeDto) {
    const until = new Date();
    until.setMonth(until.getMonth() + dto.months);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { status: "SELF_EXCLUDED", excludedUntil: until },
    });
    return { status: "SELF_EXCLUDED", excludedUntil: until.toISOString() };
  }
}
