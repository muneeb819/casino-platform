import type { GameCategory } from "@platform/shared";

export interface CatalogItem {
  providerCode: string;
  providerGameId: string;
  name: string;
  category: GameCategory;
  thumbnail: string;
  rtp: number;
}

export const CATALOG: CatalogItem[] = [
  { providerCode: "jili", providerGameId: "jl-golden-empire", name: "Golden Empire", category: "SLOT", thumbnail: "🏛️", rtp: 96.5 },
  { providerCode: "jili", providerGameId: "jl-fortune-gems", name: "Fortune Gems", category: "SLOT", thumbnail: "💎", rtp: 97.1 },
  { providerCode: "jili", providerGameId: "jl-super-ace", name: "Super Ace", category: "SLOT", thumbnail: "🃏", rtp: 97.0 },
  { providerCode: "jili", providerGameId: "jl-boxing-king", name: "Boxing King", category: "SLOT", thumbnail: "🥊", rtp: 96.2 },
  { providerCode: "jili", providerGameId: "jl-money-coming", name: "Money Coming", category: "SLOT", thumbnail: "💸", rtp: 96.8 },
  { providerCode: "jili", providerGameId: "jl-charge-buffalo", name: "Charge Buffalo", category: "SLOT", thumbnail: "🐃", rtp: 96.4 },
  { providerCode: "jili", providerGameId: "jl-mega-fishing", name: "Mega Fishing", category: "FISHING", thumbnail: "🎣", rtp: 95.9 },
  { providerCode: "jili", providerGameId: "jl-jackpot-fishing", name: "Jackpot Fishing", category: "FISHING", thumbnail: "🐟", rtp: 95.7 },
  { providerCode: "jili", providerGameId: "jl-allstar-fishing", name: "All-Star Fishing", category: "FISHING", thumbnail: "🐠", rtp: 95.5 },
  { providerCode: "jili", providerGameId: "jl-tongits", name: "Tongits Star", category: "TABLE", thumbnail: "🎴", rtp: 98.0 },
  { providerCode: "acewin", providerGameId: "aw-dragon-legend", name: "Dragon Legend", category: "SLOT", thumbnail: "🐉", rtp: 96.3 },
  { providerCode: "acewin", providerGameId: "aw-phoenix-rises", name: "Phoenix Rises", category: "SLOT", thumbnail: "🔥", rtp: 96.6 },
  { providerCode: "acewin", providerGameId: "aw-lucky-koi", name: "Lucky Koi", category: "SLOT", thumbnail: "🎏", rtp: 96.1 },
  { providerCode: "acewin", providerGameId: "aw-emperors-gate", name: "Emperor's Gate", category: "SLOT", thumbnail: "🏯", rtp: 95.8 },
  { providerCode: "acewin", providerGameId: "aw-fishing-master", name: "Fishing Master", category: "FISHING", thumbnail: "🦈", rtp: 95.6 },
  { providerCode: "acewin", providerGameId: "aw-baccarat", name: "Speed Baccarat A", category: "TABLE", thumbnail: "🀄", rtp: 98.9 },
  { providerCode: "pocketsoft", providerGameId: "ps-sky-rush", name: "Sky Rush", category: "CRASH", thumbnail: "✈️", rtp: 97.0 },
  { providerCode: "pocketsoft", providerGameId: "ps-crash-x", name: "Crash X", category: "CRASH", thumbnail: "🚀", rtp: 96.9 },
  { providerCode: "pocketsoft", providerGameId: "ps-mines-dash", name: "Mines Dash", category: "ARCADE", thumbnail: "💣", rtp: 96.7 },
  { providerCode: "pocketsoft", providerGameId: "ps-plinko-pop", name: "Plinko Pop", category: "ARCADE", thumbnail: "🔻", rtp: 96.5 },
  { providerCode: "pocketsoft", providerGameId: "ps-wheel-bonanza", name: "Wheel Bonanza", category: "ARCADE", thumbnail: "🎡", rtp: 96.0 },
  { providerCode: "pocketsoft", providerGameId: "ps-dice-duel", name: "Dice Duel", category: "TABLE", thumbnail: "🎲", rtp: 98.5 },
];
