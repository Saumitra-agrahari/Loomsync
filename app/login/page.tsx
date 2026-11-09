"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || "Invalid email or password");
        setLoading(false);
        return;
      }

      const role = data.user.role;
      if (role === "supervisor") {
        router.push("/s");
      } else if (role === "buyer") {
        router.push("/b");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch {
      setError("Network error. Please check connection and try again.");
      setLoading(false);
    }
  };

  const quickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Demo@12345");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-8 text-textPrimary relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md bg-surface border border-border rounded-xl p-6 sm:p-8 shadow-subtle space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-xl mx-auto shadow-subtle">
            🧵
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-textPrimary">
            Tiruppur Order Tracker
          </h1>
          <p className="text-xs sm:text-sm text-textMuted">
            Sign in to access real-time production tracking and TNA milestones
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 bg-status-red-bg border border-status-red/30 text-status-red rounded-lg text-xs font-semibold"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold uppercase tracking-wider text-textMuted mb-1"
            >
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="e.g. merch@demo.example"
              className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-textPrimary focus-ring tap-target text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold uppercase tracking-wider text-textMuted mb-1"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-textPrimary focus-ring tap-target text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-white font-bold rounded-lg transition-colors disabled:opacity-50 focus-ring tap-target text-sm shadow-xs"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Quick Demo Logins for Judges / Evaluators */}
        <div className="pt-4 border-t border-border space-y-3">
          <p className="text-[11px] font-bold text-textMuted uppercase tracking-wider text-center">
            Demo Accounts (1-Click Fill)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => quickFill("merch@demo.example")}
              className="p-2.5 border border-border rounded-lg bg-surface-raised hover:bg-surface-hover text-left focus-ring transition-colors"
            >
              <div className="font-semibold text-textPrimary">Merchandiser</div>
              <div className="text-textMuted text-[10px] truncate">merch@demo.example</div>
            </button>
            <button
              type="button"
              onClick={() => quickFill("sup1@demo.example")}
              className="p-2.5 border border-border rounded-lg bg-surface-raised hover:bg-surface-hover text-left focus-ring transition-colors"
            >
              <div className="font-semibold text-textPrimary">Supervisor (Unit 1)</div>
              <div className="text-textMuted text-[10px] truncate">sup1@demo.example</div>
            </button>
            <button
              type="button"
              onClick={() => quickFill("buyerb@demo.example")}
              className="p-2.5 border border-border rounded-lg bg-surface-raised hover:bg-surface-hover text-left focus-ring transition-colors"
            >
              <div className="font-semibold text-textPrimary">Buyer (Company B)</div>
              <div className="text-textMuted text-[10px] truncate">buyerb@demo.example</div>
            </button>
            <button
              type="button"
              onClick={() => quickFill("buyerc@demo.example")}
              className="p-2.5 border border-border rounded-lg bg-surface-raised hover:bg-surface-hover text-left focus-ring transition-colors"
            >
              <div className="font-semibold text-textPrimary">Buyer (Company C)</div>
              <div className="text-textMuted text-[10px] truncate">buyerc@demo.example</div>
            </button>
          </div>
          <p className="text-[11px] text-textMuted text-center">
            Default password for all demo accounts:{" "}
            <code className="bg-surface-raised border border-border px-1.5 py-0.5 rounded font-mono text-textPrimary">
              Demo@12345
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
