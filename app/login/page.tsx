"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

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
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const quickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Demo@12345");
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md bg-white border border-border rounded-lg p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-bold text-lg mx-auto mb-2">
            T
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-textPrimary">Tiruppur Order Tracker</h1>
          <p className="text-xs sm:text-sm text-textSecondary mt-1">Sign in to your factory or buyer account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="e.g. merch@demo.example"
              className="w-full px-3 py-2 border border-border rounded-md text-textPrimary focus:outline-none focus:ring-2 focus:ring-accent tap-target"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-border rounded-md text-textPrimary focus:outline-none focus:ring-2 focus:ring-accent tap-target"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover text-white font-medium rounded-md transition-colors disabled:opacity-50 tap-target"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Quick Demo Logins for Judges / Reviewers */}
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2 text-center">
            Demo Logins (1-Click Fill)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => quickFill("merch@demo.example")}
              className="p-2 border border-border rounded bg-surface hover:bg-surfaceHover text-left"
            >
              <div className="font-semibold text-textPrimary">Merchandiser</div>
              <div className="text-textSecondary text-[11px] truncate">merch@demo.example</div>
            </button>
            <button
              type="button"
              onClick={() => quickFill("sup1@demo.example")}
              className="p-2 border border-border rounded bg-surface hover:bg-surfaceHover text-left"
            >
              <div className="font-semibold text-textPrimary">Supervisor (Unit 1)</div>
              <div className="text-textSecondary text-[11px] truncate">sup1@demo.example</div>
            </button>
            <button
              type="button"
              onClick={() => quickFill("buyerb@demo.example")}
              className="p-2 border border-border rounded bg-surface hover:bg-surfaceHover text-left"
            >
              <div className="font-semibold text-textPrimary">Buyer (Company B)</div>
              <div className="text-textSecondary text-[11px] truncate">buyerb@demo.example</div>
            </button>
            <button
              type="button"
              onClick={() => quickFill("buyerc@demo.example")}
              className="p-2 border border-border rounded bg-surface hover:bg-surfaceHover text-left"
            >
              <div className="font-semibold text-textPrimary">Buyer (Company C)</div>
              <div className="text-textSecondary text-[11px] truncate">buyerc@demo.example</div>
            </button>
          </div>
          <p className="text-[11px] text-textSecondary text-center mt-2">Password for all demo accounts: <code className="bg-surface px-1 py-0.5 rounded">Demo@12345</code></p>
        </div>
      </div>
    </div>
  );
}
