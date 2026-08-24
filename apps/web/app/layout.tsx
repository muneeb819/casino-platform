import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "GoldenSpin Casino",
  description: "Multi-provider online casino demo platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <AuthProvider>
          <NavBar />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <footer className="mx-auto mt-16 max-w-6xl px-4 pb-10 text-center text-xs text-slate-500">
            <p>
              Demo platform for engineering purposes — no real money is involved. Gambling can be
              addictive. Play responsibly. 18+ only.
            </p>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
