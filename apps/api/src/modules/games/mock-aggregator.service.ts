import { Injectable } from "@nestjs/common";
import { AppConfig } from "../../common/config";
import type { AggregatorAdapter, LaunchParams } from "./aggregator.interface";
import { CATALOG } from "./catalog.data";

@Injectable()
export class MockAggregatorService implements AggregatorAdapter {
  readonly code = "mock-aggregator";

  listGames() {
    return CATALOG;
  }

  async createSession(params: LaunchParams & { sessionToken: string }) {
    return {
      launchUrl: `${AppConfig.load().publicBaseUrl}/mock-game/${params.sessionToken}`,
    };
  }
}
