"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, type SessionDto } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

export default function GamePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [session, setSession] = useState<SessionDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!user) {
      setError("Log in to play");
      return;
    }
    if (started.current || !params?.id) return;
    started.current = true;
    api
      .post<SessionDto>(`/games/${params.id}/launch`)
      .then(setSession)
      .catch((e) => setError(e instanceof Error ? e.message : "Launch failed"));
  }, [params?.id, user]);

  if (error) {
    return (
      <div className="panel mx-auto max-w-md space-y-4 text-center">
        <p className="text-lg font-bold">{error}</p>
        <div className="flex justify-center gap-2">
          {!user && (
            <Link href="/login" className="btn-primary">
              Log in
            </Link>
          )}
          <Link href="/lobby" className="btn-ghost">
            Back to lobby
          </Link>
        </div>
      </div>
    );
  }

  if (!session) {
    return <div className="mx-auto mt-20 h-12 w-12 animate-spin rounded-full border-4 border-casino-accent border-t-transparent" />;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-casino-bg">
      <div className="flex items-center gap-4 border-b border-slate-800 px-4 py-2">
        <button onClick={() => router.push("/lobby")} className="btn-ghost !py-1 text-sm">
          ← Lobby
        </button>
        <span className="font-bold text-casino-accent">{session.game.name}</span>
        <span className="text-xs uppercase tracking-widest text-slate-500">{session.game.providerName}</span>
        <span className="ml-auto rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-0.5 text-sm font-bold text-emerald-300">
          Demo mode
        </span>
      </div>
      <iframe src={session.launchUrl} className="flex-1" title={session.game.name} />
    </div>
  );
}
