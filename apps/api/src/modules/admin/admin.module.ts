import { Module } from "@nestjs/common";
import { WalletModule } from "../wallet/wallet.module";
import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";

@Module({
  imports: [WalletModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
