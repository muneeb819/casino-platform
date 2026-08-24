export const ROLES = ["PLAYER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ["ACTIVE", "SUSPENDED", "SELF_EXCLUDED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const KYC_STATUSES = ["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

export const ACCOUNT_KINDS = ["REAL", "BONUS", "HOUSE"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export const TX_TYPES = [
  "DEPOSIT",
  "WITHDRAWAL",
  "BET",
  "WIN",
  "ROLLBACK",
  "BONUS_CREDIT",
  "ADJUSTMENT",
] as const;
export type TxType = (typeof TX_TYPES)[number];

export const DIRECTIONS = ["DEBIT", "CREDIT"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const GAME_CATEGORIES = ["SLOT", "FISHING", "ARCADE", "TABLE", "CRASH"] as const;
export type GameCategory = (typeof GAME_CATEGORIES)[number];

export const PROVIDERS = [
  { code: "jili", name: "Jili" },
  { code: "acewin", name: "AceWin" },
  { code: "pocketsoft", name: "PocketSoft" },
] as const;

export interface PublicUser {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  kycStatus: KycStatus;
  currency: string;
  locale: string;
  affiliateCode: string;
  excludedUntil: string | null;
  createdAt: string;
}

export interface AccountDto {
  id: string;
  kind: AccountKind;
  currency: string;
  balanceCents: number;
}

export interface GameDto {
  id: string;
  providerCode: string;
  providerName: string;
  name: string;
  category: GameCategory;
  thumbnail: string;
  rtp: number | null;
}

export interface TransactionDto {
  id: string;
  type: TxType;
  reference: string | null;
  gameId: string | null;
  amountCents: number;
  meta: string | null;
  createdAt: string;
}

export interface SessionDto {
  sessionId: string;
  launchUrl: string;
  game: GameDto;
}

export interface SpinResultDto {
  reels: [string, string, string];
  payoutCents: number;
  balanceCents: number;
}

export interface GgrRow {
  providerCode: string;
  gameId: string | null;
  gameName: string | null;
  betCents: number;
  winCents: number;
  ggrCents: number;
  rounds: number;
}

export const MIN_WITHDRAWAL_CENTS = 2000;

export function formatCents(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}
