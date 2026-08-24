"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type GameDto } from "@/lib/api";

const CATEGORIES = ["ALL", "SLOT", "FISHING", "TABLE", "ARCADE", "CRASH"] as const;

export default function LobbyPage() {
  const [games, setGames] = useState<GameDto[]>([]);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<GameDto[]>("/games")
      .then(setGames)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = category === "ALL" ? games : games.filter((g) => g.category === category);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Game Lobby</h1>
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-lg px-3 py-1 text-sm transition ${
                category === c
                  ? "bg-casino-accent font-bold text-gray-900"
                  : "border border-slate-700 text-slate-300 hover:bg-casino-card"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-casino-card" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {filtered.map((g) => (
            <Link
              key={g.id}
              href={`/game/${g.id}`}
              className="group rounded-xl border border-slate-700/60 bg-casino-card p-4 text-center transition hover:-translate-y-1 hover:border-casino-accent/70"
            >
              <div className="mb-3 py-4 text-6xl transition group-hover:scale-110">{g.thumbnail}</div>
              <div className="truncate text-sm font-bold">{g.name}</div>
              <div className="mt-0.5 text-[11px] uppercase tracking-wider text-slate-500">
                {g.providerName} · RTP {g.rtp ?? "-"}%
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-center text-slate-500">No games in this category yet.</p>
      )}
    </div>
  );
}
