"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, type MeResponse, type TransactionDto } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { MIN_WITHDRAWAL_CENTS, formatCents } from "@platform/shared";

export default function WalletPage() {
  const { user, accounts, refreshMe } = useAuth();
  const [amount, setAmount] = useState("10.00");
  const [txs, setTxs] = useState<TransactionDto[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await api.get<TransactionDto[]>("/wallet/transactions?take=50");
      setTxs(rows);
    } catch {}
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (!user) {
    return (
      <div className="panel mx-auto max-w-md text-center">
        <p>Log in to view your wallet.</p>
        <Link href="/login" className="btn-primary mt-3 inline-block">
          Log in
        </Link>
      </div>
    );
  }

  const real = accounts.find((a) => a.kind === "REAL");
  const bonus = accounts.find((a) => a.kind === "BONUS");

  async function doDeposit() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const cents = Math.round(parseFloat(amount) * 100);
      const res = await api.post<{ balanceCents: number }>("/payments/deposit", { amountCents: cents });
      setMessage(`Deposited ${formatCents(cents)} — new balance ${formatCents(res.balanceCents)}`);
      await refreshMe();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deposit failed");
    } finally {
      setBusy(false);
    }
  }

  async function doWithdraw() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const cents = Math.round(parseFloat(amount) * 100);
      const res = await api.post<{ balanceCents: number }>("/payments/withdraw", { amountCents: cents });
      setMessage(`Withdrew ${formatCents(cents)} — new balance ${formatCents(res.balanceCents)}`);
      await refreshMe();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Withdrawal failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Wallet</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel">
          <div className="text-xs uppercase tracking-widest text-slate-500">Real balance</div>
          <div className="mt-1 text-3xl font-black text-emerald-400">
            {formatCents(real?.balanceCents ?? 0, user.currency)}
          </div>
        </div>
        <div className="panel">
          <div className="text-xs uppercase tracking-widest text-slate-500">Bonus balance</div>
          <div className="mt-1 text-3xl font-black text-casino-accent">
            {formatCents(bonus?.balanceCents ?? 0, user.currency)}
          </div>
        </div>
        <div className="panel space-y-2">
          <input
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={doDeposit} disabled={busy}>
              Deposit
            </button>
            <button
              className="btn-ghost flex-1"
              onClick={doWithdraw}
              disabled={busy}
              title={`Minimum withdrawal ${formatCents(MIN_WITHDRAWAL_CENTS)}`}
            >
              Withdraw
            </button>
          </div>
          {message && <p className="text-xs text-emerald-400">{message}</p>}
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      </div>

      <section className="panel overflow-x-auto">
        <h2 className="mb-3 font-bold">Transaction history</h2>
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="pb-2">Date</th>
              <th className="pb-2">Type</th>
              <th className="pb-2 text-right">Amount</th>
              <th className="pb-2">Ref</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((t) => (
              <tr key={t.id} className="border-t border-slate-800">
                <td className="py-2 text-slate-400">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="py-2">
                  <Badge type={t.type} />
                </td>
                <td
                  className={`py-2 text-right font-mono ${
                    t.amountCents >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {t.amountCents >= 0 ? "+" : ""}
                  {(t.amountCents / 100).toFixed(2)}
                </td>
                <td className="max-w-[160px] truncate py-2 font-mono text-xs text-slate-500">
                  {t.reference ?? t.gameId ?? "—"}
                </td>
              </tr>
            ))}
            {txs.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-500">
                  No transactions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <RgSection />
    </div>
  );
}

function Badge({ type }: { type: TransactionDto["type"] }) {
  const styles: Record<string, string> = {
    DEPOSIT: "bg-emerald-500/15 text-emerald-300",
    WITHDRAWAL: "bg-sky-500/15 text-sky-300",
    BET: "bg-red-500/15 text-red-300",
    WIN: "bg-yellow-500/15 text-yellow-300",
    ROLLBACK: "bg-slate-500/15 text-slate-300",
    BONUS_CREDIT: "bg-purple-500/15 text-purple-300",
    ADJUSTMENT: "bg-orange-500/15 text-orange-300",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase ${styles[type] ?? ""}`}>
      {type.replace("_", " ")}
    </span>
  );
}

function RgSection() {
  const { refreshMe } = useAuth();
  const [limits, setLimits] = useState({ dailyLimitCents: 100000, weeklyLimitCents: 500000, monthlyLimitCents: 2000000 });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .get<typeof limits>("/auth/me/rg/limits")
      .then((l) => l && setLimits(l))
      .catch(() => {});
  }, []);

  async function saveLimits() {
    await api.put("/auth/me/rg/limits", limits);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function selfExclude(months: number) {
    if (!window.confirm(`Self-exclude for ${months} month(s)? You will not be able to play until it expires.`)) return;
    await api.post("/auth/me/rg/self-exclude", { months });
    await refreshMe();
    window.alert("You are now self-excluded.");
  }

  return (
    <section className="panel space-y-4 border-amber-500/20">
      <h2 className="font-bold">Responsible gambling</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {(
          [
            ["dailyLimitCents", "Daily limit ($)"],
            ["weeklyLimitCents", "Weekly limit ($)"],
            ["monthlyLimitCents", "Monthly limit ($)"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="space-y-1 text-xs text-slate-400">
            {label}
            <input
              className="input"
              inputMode="numeric"
              value={(limits[key] / 100).toString()}
              onChange={(e) =>
                setLimits((prev) => ({
                  ...prev,
                  [key]: Math.round(parseFloat(e.target.value || "0") * 100),
                }))
              }
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-ghost" onClick={saveLimits}>
          Save limits {saved && "✓"}
        </button>
        {[1, 6, 12].map((m) => (
          <button key={m} className="btn-ghost !border-red-500/40 text-red-300" onClick={() => selfExclude(m)}>
            Self-exclude {m}m
          </button>
        ))}
      </div>
    </section>
  );
}
