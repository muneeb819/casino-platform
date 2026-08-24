import type { CatalogItem } from "./catalog.data";

export interface LaunchParams {
  userId: string;
  game: CatalogItem;
  currency: string;
  locale: string;
}

export interface AggregatorAdapter {
  readonly code: string;
  listGames(): CatalogItem[];
  createSession(params: LaunchParams & { sessionToken: string }): Promise<{ launchUrl: string }>;
}
