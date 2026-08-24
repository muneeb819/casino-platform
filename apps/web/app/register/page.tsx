"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await register(email, password);
      router.push("/lobby");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Create account</h1>
      <form onSubmit={submit} className="panel space-y-3">
        <input
          className="input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Password (min 8 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <input
          className="input"
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "..." : "Sign up & claim demo bonus"}
        </button>
        <p className="text-center text-xs text-slate-500">
          Already registered?{" "}
          <Link href="/login" className="text-casino-accent hover:underline">
            Log in
          </Link>
        </p>
        <p className="text-center text-[10px] leading-relaxed text-slate-600">
          By registering you confirm you are 18+ and accept the demo terms. Gambling can be
          addictive — play responsibly.
        </p>
      </form>
    </div>
  );
}
