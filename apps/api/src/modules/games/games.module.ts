import { Module } from "@nestjs/common";
import { WalletModule } from "../wallet/wallet.module";
import { GamesService } from "./games.service";
import { GamesController } from "./games.controller";
import { MockAggregatorService } from "./mock-aggregator.service";
import { MockGameController } from "./mock-game.controller";

@Module({
  imports: [WalletModule],
  providers: [GamesService, MockAggregatorService],
  controllers: [GamesController, MockGameController],
})
export class GamesModule {}
