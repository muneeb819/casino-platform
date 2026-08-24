"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, type GgrRow } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { formatCents } from "@platform/shared";

interface Overview {
  players: number;
  sessions: number;
  depositsCents: number;
  withdrawalsCents: number;
  wageredCents: number;
  wonCents: number;
  ggrCents: number;
  bonusCreditedCents: number;
}

interface PlayerRow {
  id: string;
  email: string;
  status: string;
  kycStatus: string;
  currency: string;
  createdAt: string;
  realBalanceCents: number;
  bonusBalanceCents: number;
  pendingKycDocs: number;
}

interface KycRow {
  id: string;
  docType: string;
  fileRef: string;
  status: string;
  user: { id: string; email: string };
}

const TABS = ["Overview", "Players", "KYC Queue", "GGR Report"] as const;

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");

  if (!loading && (!user || user.role !== "ADMIN")) {
    return (
      <div className="panel mx-auto max-w-md text-center">
        <p>Admin access only.</p>
        <Link href="/login" className="btn-primary mt-3 inline-block">
          Log in as admin
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Back Office</h1>
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1 text-sm transition ${
                tab === t
                  ? "bg-casino-accent font-bold text-gray-900"
                  : "border border-slate-700 text-slate-300 hover:bg-casino-card"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      {tab === "Overview" && <OverviewTab />}
      {tab === "Players" && <PlayersTab />}
      {tab === "KYC Queue" && <KycTab />}
      {tab === "GGR Report" && <GgrTab />}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="panel">
      <div className="text-xs uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-black ${tone ?? "text-slate-100"}`}>{value}</div>
    </div>
  );
}

function OverviewTab() {
  const [data, setData] = useState<Overview | null>(null);
  useEffect(() => {
    api.get<Overview>("/admin/overview").then(setData).catch(() => {});
  }, []);
  if (!data) return <div className="h-24 animate-pulse rounded-xl bg-casino-card" />;
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Stat label="Players" value={String(data.players)} />
      <Stat label="Game sessions" value={String(data.sessions)} />
      <Stat label="Deposits" value={formatCents(data.depositsCents)} tone="text-emerald-400" />
      <Stat label="Withdrawals" value={formatCents(data.withdrawalsCents)} tone="text-sky-400" />
      <Stat label="Wagered" value={formatCents(data.wageredCents)} />
      <Stat label="Paid out" value={formatCents(data.wonCents)} tone="text-yellow-400" />
      <Stat label="GGR" value={formatCents(data.ggrCents)} tone="text-casino-accent" />
      <Stat label="Bonus credited" value={formatCents(data.bonusCreditedCents)} tone="text-purple-400" />
    </div>
  );
}

function PlayersTab() {
  const [rows, setRows] = useState<PlayerRow[]>([]);
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    api
      .get<PlayerRow[]>(`/admin/players${q ? `?q=${encodeURIComponent(q)}` : ""}`)
      .then(setRows)
      .catch(() => {});
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleStatus(p: PlayerRow) {
    const next = p.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    await api.post(`/admin/players/${p.id}/status`, { status: next });
    load();
  }

  async function adjust(p: PlayerRow) {
    const input = window.prompt(
      `Adjust REAL balance for ${p.email}\nAmount in dollars (negative to debit):`,
      "10.00",
    );
    if (!input) return;
    const cents = Math.round(parseFloat(input) * 100);
    await api.post(`/admin/players/${p.id}/adjust`, {
      kind: "REAL",
      amountCents: cents,
      reason: "back-office manual adjustment",
    });
    load();
  }

  return (
    <div className="space-y-3">
      <input
        className="input max-w-xs"
        placeholder="Search by email..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="pb-2">Email</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">KYC</th>
              <th className="pb-2 text-right">Real</th>
              <th className="pb-2 text-right">Bonus</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-slate-800">
                <td className="py-2">{p.email}</td>
                <td className="py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                      p.status === "ACTIVE"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : p.status === "SELF_EXCLUDED"
                          ? "bg-purple-500/15 text-purple-300"
                          : "bg-red-500/15 text-red-300"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="py-2 text-slate-400">
                  {p.kycStatus}
                  {p.pendingKycDocs > 0 && (
                    <span className="ml-1 rounded bg-casino-accent px-1 text-[10px] font-bold text-gray-900">
                      {p.pendingKycDocs}
                    </span>
                  )}
                </td>
                <td className="py-2 text-right font-mono">{(p.realBalanceCents / 100).toFixed(2)}</td>
                <td className="py-2 text-right font-mono text-casino-accent">
                  {(p.bonusBalanceCents / 100).toFixed(2)}
                </td>
                <td className="space-x-2 py-2 text-right">
                  <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => adjust(p)}>
                    Adjust
                  </button>
                  <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => toggleStatus(p)}>
                    {p.status === "ACTIVE" ? "Suspend" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KycTab() {
  const [rows, setRows] = useState<KycRow[]>([]);
  const load = useCallback(() => {
    api.get<KycRow[]>("/admin/kyc").then(setRows).catch(() => {});
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function review(id: string, decision: "APPROVED" | "REJECTED") {
    await api.post(`/admin/kyc/${id}/review`, { decision });
    load();
  }

  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="pb-2">Player</th>
            <th className="pb-2">Document</th>
            <th className="pb-2">File ref</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id} className="border-t border-slate-800">
              <td className="py-2">{d.user?.email}</td>
              <td className="py-2">{d.docType.replace("_", " ")}</td>
              <td className="max-w-[220px] truncate py-2 font-mono text-xs text-slate-500">{d.fileRef}</td>
              <td className="space-x-2 py-2 text-right">
                <button className="btn-primary !px-2 !py-1 text-xs" onClick={() => review(d.id, "APPROVED")}>
                  Approve
                </button>
                <button
                  className="btn-ghost !border-red-500/40 !px-2 !py-1 text-xs text-red-300"
                  onClick={() => review(d.id, "REJECTED")}
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-slate-500">
                KYC queue is empty.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function GgrTab() {
  const [rows, setRows] = useState<GgrRow[]>([]);
  useEffect(() => {
    api.get<GgrRow[]>("/admin/ggr").then(setRows).catch(() => {});
  }, []);

  const totals = rows.reduce(
    (acc, r) => ({ bet: acc.bet + r.betCents, win: acc.win + r.winCents, ggr: acc.ggr + r.ggrCents }),
    { bet: 0, win: 0, ggr: 0 },
  );

  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[680px] text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="pb-2">Provider</th>
            <th className="pb-2">Game</th>
            <th className="pb-2 text-right">Rounds</th>
            <th className="pb-2 text-right">Wagered</th>
            <th className="pb-2 text-right">Paid out</th>
            <th className="pb-2 text-right">GGR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.gameId ?? r.providerCode} className="border-t border-slate-800">
              <td className="py-2 uppercase tracking-wider text-slate-400">{r.providerCode}</td>
              <td className="py-2">{r.gameName}</td>
              <td className="py-2 text-right">{r.rounds}</td>
              <td className="py-2 text-right font-mono">{formatCents(r.betCents)}</td>
              <td className="py-2 text-right font-mono">{formatCents(r.winCents)}</td>
              <td
                className={`py-2 text-right font-mono font-bold ${
                  r.ggrCents >= 0 ? "text-casino-accent" : "text-red-400"
                }`}
              >
                {formatCents(r.ggrCents)}
              </td>
            </tr>
          ))}
          {rows.length > 0 && (
            <tr className="border-t-2 border-slate-600 font-bold">
              <td colSpan={3} className="pt-3">
                Total (excl. rollbacks)
              </td>
              <td className="pt-3 text-right font-mono">{formatCents(totals.bet)}</td>
              <td className="pt-3 text-right font-mono">{formatCents(totals.win)}</td>
              <td className="pt-3 text-right font-mono text-casino-accent">{formatCents(totals.ggr)}</td>
            </tr>
          )}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-slate-500">
                No rounds recorded yet — play some games first.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
