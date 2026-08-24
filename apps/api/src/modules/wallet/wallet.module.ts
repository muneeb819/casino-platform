import { Module } from "@nestjs/common";
import { WalletService } from "./wallet.service";
import { WalletController, ProviderWalletController } from "./wallet.controller";

@Module({
  providers: [WalletService],
  controllers: [WalletController, ProviderWalletController],
  exports: [WalletService],
})
export class WalletModule {}
