"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { StatusChip } from "@/components/StatusChip";
import { SkeletonRow } from "@/components/Skeleton";
import { EmptyState, ErrorBanner } from "@/components/States";

export default function WarningInboxPage() {
  const [warnings, setWarnings] = useState<any[]>([]);
  const [tab, setTab] = useState<"draft" | "confirmed" | "dismissed">("draft");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dismiss modal
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [dismissReason, setDismissReason] = useState("");
  const [dismissError, setDismissError] = useState<string | null>(null);

  const fetchWarnings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/warnings?status=${tab}`);
      if (!res.ok) throw new Error("Failed to load warnings");
      const data = await res.json();
      setWarnings(data.warnings || []);
    } catch (err: any) {
      setError(err.message || "Failed to load warnings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarnings();
  }, [tab]);

  const handleConfirm = async (id: string) => {
    try {
      const res = await fetch(`/api/warnings/${id}/confirm`, { method: "POST" });
      if (res.ok) {
        fetchWarnings();
      }
    } catch {
      // silent catch
    }
  };

  const handleDismiss = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dismissReason.trim()) {
      setDismissError("Dismissal reason is required");
      return;
    }
    if (!dismissingId) return;

    try {
      const res = await fetch(`/api/warnings/${dismissingId}/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: dismissReason }),
      });
      if (res.ok) {
        setDismissingId(null);
        setDismissReason("");
        fetchWarnings();
      }
    } catch {
      setDismissError("Failed to dismiss warning");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-textPrimary">Delay Warning Review Inbox</h1>
          <p className="text-xs sm:text-sm text-textSecondary">
            Review AI run-rate warnings before they reach buyers. Only confirmed warnings are visible to buyers.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-6 gap-6 text-sm font-semibold">
          <button
            onClick={() => setTab("draft")}
            className={`pb-2.5 border-b-2 transition-colors ${
              tab === "draft" ? "border-accent text-accent" : "border-transparent text-textSecondary hover:text-textPrimary"
            }`}
          >
            Pending Review (Drafts)
          </button>
          <button
            onClick={() => setTab("confirmed")}
            className={`pb-2.5 border-b-2 transition-colors ${
              tab === "confirmed" ? "border-accent text-accent" : "border-transparent text-textSecondary hover:text-textPrimary"
            }`}
          >
            Confirmed (Visible to Buyer)
          </button>
          <button
            onClick={() => setTab("dismissed")}
            className={`pb-2.5 border-b-2 transition-colors ${
              tab === "dismissed" ? "border-accent text-accent" : "border-transparent text-textSecondary hover:text-textPrimary"
            }`}
          >
            Dismissed
          </button>
        </div>

        {error && <ErrorBanner message={error} onRetry={fetchWarnings} />}

        {loading ? (
          <SkeletonRow count={3} />
        ) : warnings.length === 0 ? (
          <EmptyState message={`No ${tab} warnings at this time.`} />
        ) : (
          <div className="space-y-4">
            {warnings.map((w) => (
              <div
                key={w.id}
                className="bg-white border border-border rounded-lg p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-accent">{w.poNo}</span>
                      <StatusChip status={w.status} />
                    </div>
                    <p className="text-xs text-textSecondary mt-0.5">
                      {w.style} · Buyer: <strong>{w.buyerName}</strong> · Stage: <strong>{w.stage}</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-textSecondary">Projected Delay:</span>
                    <div className="text-base font-bold text-rose-700">+{w.slipDays} working days</div>
                  </div>
                </div>

                {/* Maths Snapshot */}
                <div className="p-3 bg-surface rounded-md text-xs sm:text-sm font-medium border border-border">
                  <span className="font-bold text-textPrimary">The Maths Snapshot:</span>{" "}
                  Need <span className="text-accent underline font-bold">{Math.round(w.requiredRate)}/day</span> · Making{" "}
                  <span className="text-rose-700 underline font-bold">{Math.round(w.actualRate)}/day</span> · Remaining:{" "}
                  <strong>{w.remaining.toLocaleString()} pcs</strong> in <strong>{w.daysAvailable} days</strong>
                </div>

                {/* Supervisor Floor Note if present */}
                {w.latestNote && w.latestNote.original && (
                  <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-md text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-amber-900">Supervisor Floor Note:</span>
                      {w.latestNote.category && (
                        <span className="bg-white px-2 py-0.5 rounded text-[11px] font-semibold text-gray-700 border">
                          AI: {w.latestNote.category.replace(/_/g, " ")} ({(w.latestNote.confidence * 100).toFixed(0)}%)
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      <div>
                        <span className="text-textSecondary text-[11px]">Original (Tamil):</span>
                        <p className="font-tamil font-medium text-textPrimary">{w.latestNote.original}</p>
                      </div>
                      <div>
                        <span className="text-textSecondary text-[11px]">English Translation:</span>
                        <p className="text-textPrimary">{w.latestNote.translation || "—"}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions for Draft Warnings */}
                {tab === "draft" && (
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setDismissingId(w.id)}
                      className="px-4 py-2 border border-border rounded text-xs sm:text-sm font-medium hover:bg-surface text-gray-700 tap-target"
                    >
                      Dismiss (Requires Reason)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirm(w.id)}
                      className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs sm:text-sm font-semibold transition-colors tap-target"
                    >
                      Confirm Warning to Buyer
                    </button>
                  </div>
                )}

                {/* Dismiss reason display if dismissed */}
                {tab === "dismissed" && w.dismissReason && (
                  <p className="text-xs text-textSecondary italic pt-1">
                    Dismissal Reason: &ldquo;{w.dismissReason}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Dismiss Modal */}
        {dismissingId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-border">
              <h3 className="text-lg font-bold text-textPrimary mb-2">Dismiss Delay Warning</h3>
              <p className="text-xs text-textSecondary mb-4">
                Explain why this delay warning is being dismissed without alerting the buyer.
              </p>

              {dismissError && <div className="mb-3"><ErrorBanner message={dismissError} /></div>}

              <form onSubmit={handleDismiss} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                    Dismissal Reason * (Mandatory)
                  </label>
                  <textarea
                    rows={3}
                    value={dismissReason}
                    onChange={(e) => setDismissReason(e.target.value)}
                    required
                    placeholder="e.g. Added a second shift to recover 80 pcs/day deficit"
                    className="w-full px-3 py-2 border border-border rounded text-textPrimary text-sm tap-target"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDismissingId(null);
                      setDismissReason("");
                    }}
                    className="px-4 py-2 border border-border rounded text-xs font-medium tap-target"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gray-800 text-white rounded text-xs font-semibold hover:bg-black tap-target"
                  >
                    Confirm Dismissal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
