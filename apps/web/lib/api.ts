"use client";

import type {
  AccountDto,
  GameDto,
  GgrRow,
  PublicUser,
  SessionDto,
  SpinResultDto,
  TransactionDto,
} from "@platform/shared";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Tokens = { accessToken: string; refreshToken: string } | null;

let cached: Tokens = null;

export function loadTokens(): Tokens {
  if (cached) return cached;
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("casino.tokens");
    cached = raw ? JSON.parse(raw) : null;
  } catch {
    cached = null;
  }
  return cached;
}

export function saveTokens(t: Tokens) {
  cached = t;
  if (typeof window === "undefined") return;
  if (t) localStorage.setItem("casino.tokens", JSON.stringify(t));
  else localStorage.removeItem("casino.tokens");
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function raw(path: string, method: string, body?: unknown, retry = true): Promise<any> {
  const tokens = loadTokens();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && tokens && retry && path !== "/auth/refresh") {
    const refreshed = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    if (refreshed.ok) {
      const data = await refreshed.json();
      saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return raw(path, method, body, false);
    }
    saveTokens(null);
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    throw new ApiError(res.status, Array.isArray(data?.message) ? data.message.join(", ") : data?.message || res.statusText);
  }
  return data;
}

export const api = {
  get: <T,>(path: string) => raw(path, "GET") as Promise<T>,
  post: <T,>(path: string, body?: unknown) => raw(path, "POST", body) as Promise<T>,
  put: <T,>(path: string, body?: unknown) => raw(path, "PUT", body) as Promise<T>,
};

export interface MeResponse {
  user: PublicUser;
  accounts: AccountDto[];
}

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

export type {
  AccountDto,
  GameDto,
  GgrRow,
  PublicUser,
  SessionDto,
  SpinResultDto,
  TransactionDto,
};
