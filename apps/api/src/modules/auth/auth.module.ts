import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { WalletModule } from "../wallet/wallet.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { AppConfig } from "../../common/config";
import { PrismaService } from "../../common/prisma.service";

@Module({
  imports: [
    WalletModule,
    JwtModule.register({ secret: AppConfig.load().jwtSecret }),
  ],
  providers: [AuthService, PrismaService],
  controllers: [AuthController],
})
export class AuthModule {}
