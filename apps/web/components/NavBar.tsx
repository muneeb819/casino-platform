"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import type { AccountDto } from "@platform/shared";

export function NavBar() {
  const { user, accounts, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const real = accounts.find((a) => a.kind === "REAL") as AccountDto | undefined;
  const balance = real ? `$${(real.balanceCents / 100).toFixed(2)}` : null;

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-800 bg-casino-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-black tracking-widest text-casino-accent">
          GOLDEN<span className="text-slate-100">SPIN</span>
        </Link>
        <div className="flex flex-1 items-center gap-1 text-sm">
          <NavLink href="/lobby" active={pathname === "/lobby"}>
            Lobby
          </NavLink>
          {user && (
            <>
              <NavLink href="/wallet" active={pathname === "/wallet"}>
                Wallet
              </NavLink>
              {user.role === "ADMIN" && (
                <NavLink href="/admin" active={pathname === "/admin"}>
                  Admin
                </NavLink>
              )}
            </>
          )}
        </div>
        {user ? (
          <div className="flex items-center gap-3 text-sm">
            {balance && (
              <span className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-bold text-emerald-300">
                {balance}
              </span>
            )}
            <span className="hidden text-slate-400 sm:inline">{user.email}</span>
            <button
              className="btn-ghost !py-1 text-xs"
              onClick={async () => {
                await logout();
                router.push("/");
              }}
            >
              Log out
            </button>
          </div>
        ) : (
          <div className="flex gap-2 text-sm">
            <Link href="/login" className="btn-ghost !py-1">
              Log in
            </Link>
            <Link href="/register" className="btn-primary !py-1">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1 transition ${
        active ? "bg-casino-card font-bold text-casino-accent" : "text-slate-300 hover:bg-casino-card"
      }`}
    >
      {children}
    </Link>
  );
}
