"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, loadTokens, saveTokens, type AuthResponse, type MeResponse } from "@/lib/api";

interface AuthCtx {
  user: MeResponse["user"] | null;
  accounts: MeResponse["accounts"];
  loading: boolean;
  refreshMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null as never);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResponse["user"] | null>(null);
  const [accounts, setAccounts] = useState<MeResponse["accounts"]>([]);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    if (!loadTokens()) {
      setUser(null);
      setAccounts([]);
      setLoading(false);
      return;
    }
    try {
      const me = await api.get<MeResponse>("/auth/me");
      setUser(me.user);
      setAccounts(me.accounts);
    } catch {
      setUser(null);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<AuthResponse>("/auth/login", { email, password });
      saveTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      await refreshMe();
    },
    [refreshMe],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<AuthResponse>("/auth/register", { email, password });
      saveTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      await refreshMe();
    },
    [refreshMe],
  );

  const logout = useCallback(async () => {
    const tokens = loadTokens();
    try {
      if (tokens) await api.post("/auth/logout", { refreshToken: tokens.refreshToken });
    } catch {}
    saveTokens(null);
    setUser(null);
    setAccounts([]);
  }, []);

  return (
    <Ctx.Provider value={{ user, accounts, loading, refreshMe, login, register, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
