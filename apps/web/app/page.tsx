"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { GameDto } from "@platform/shared";

const CATEGORIES = ["ALL", "SLOT", "FISHING", "TABLE", "ARCADE", "CRASH"] as const;

export default function HomePage() {
  const [featured, setFeatured] = useState<GameDto[]>([]);

  useEffect(() => {
    api
      .get<GameDto[]>("/games")
      .then((g) => setFeatured([...g].sort(() => Math.random() - 0.5).slice(0, 8)))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-r from-indigo-950 via-casino-panel to-slate-900 p-10">
        <div className="max-w-xl space-y-4">
          <h1 className="text-4xl font-black leading-tight text-slate-100">
            One lobby. <span className="text-casino-accent">Every provider.</span>
          </h1>
          <p className="text-slate-400">
            Jili, AceWin and PocketSoft-style games served through a single aggregator
            integration — seamless wallet, instant play.
          </p>
          <div className="flex gap-3 pt-2">
            <a href="/lobby" className="btn-primary">
              Enter Lobby
            </a>
            <a href="/register" className="btn-ghost">
              Create account
            </a>
          </div>
          <p className="pt-4 text-xs text-slate-500">
            Demo logins: demo@demo.local / Player1234! &nbsp;·&nbsp; admin@demo.local / Admin1234!
          </p>
        </div>
        <div className="pointer-events-none absolute -right-8 -top-8 rotate-12 text-[180px] opacity-10">🎰</div>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { icon: "⚡", title: "Seamless Wallet", desc: "Per-round bet/settle callbacks with double-entry ledger" },
          { icon: "🛡️", desc: "KYC queue, deposit limits, self-exclusion", title: "Player Protection" },
          { icon: "📊", desc: "Live GGR per provider, per game", title: "Back Office" },
          { icon: "🤝", desc: "Affiliate codes on every signup", title: "Referral Tracking" },
        ].map((f) => (
          <div key={f.title} className="panel space-y-1">
            <div className="text-2xl">{f.icon}</div>
            <div className="font-bold text-slate-200">{f.title}</div>
            <div className="text-xs text-slate-400">{f.desc}</div>
          </div>
        ))}
      </section>

      {featured.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Featured games</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {featured.map((g) => (
              <a
                key={g.id}
                href="/lobby"
                className="rounded-xl border border-slate-700/60 bg-casino-card p-4 transition hover:border-casino-accent/60"
              >
                <div className="mb-2 text-center text-5xl">{g.thumbnail}</div>
                <div className="truncate text-sm font-bold">{g.name}</div>
                <div className="text-xs uppercase tracking-wider text-slate-500">{g.providerName}</div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
