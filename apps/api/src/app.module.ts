import { Module } from "@nestjs/common";
import { PrismaModule } from "./common/prisma.service";
import { AuthModule } from "./modules/auth/auth.module";
import { WalletModule } from "./modules/wallet/wallet.module";
import { GamesModule } from "./modules/games/games.module";
import { AdminModule } from "./modules/admin/admin.module";

@Module({
  imports: [PrismaModule, AuthModule, WalletModule, GamesModule, AdminModule],
})
export class AppModule {}
