"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

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

  const handleConfirm = async (id: string, poNo: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/warnings/${id}/confirm`, { method: "POST" });
      if (res.ok) {
        showToast(`Delay warning for ${poNo} confirmed and notified to buyer.`);
        fetchWarnings();
      } else {
        const data = await res.json();
        showToast(data.error?.message || "Failed to confirm warning.");
      }
    } catch {
      showToast("Network error while confirming warning.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismiss = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dismissReason.trim()) {
      setDismissError("Dismissal reason is required");
      return;
    }
    if (!dismissingId) return;

    setActionLoading(dismissingId);
    try {
      const res = await fetch(`/api/warnings/${dismissingId}/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: dismissReason }),
      });
      if (res.ok) {
        const id = dismissingId;
        setDismissingId(null);
        setDismissReason("");
        setDismissError(null);
        showToast("Delay warning dismissed.");
        fetchWarnings();
      } else {
        const data = await res.json();
        setDismissError(data.error?.message || "Failed to dismiss warning");
      }
    } catch {
      setDismissError("Failed to dismiss warning");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col text-textPrimary">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-textPrimary tracking-tight">
            Delay Warning Review Inbox
          </h1>
          <p className="text-xs sm:text-sm text-textMuted mt-1">
            Review algorithmic run-rate warnings before they reach buyers. Only confirmed warnings appear in buyer portals.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-border gap-6 text-xs sm:text-sm font-semibold">
          <button
            type="button"
            onClick={() => setTab("draft")}
            className={`pb-3 border-b-2 transition-colors focus-ring rounded-t ${
              tab === "draft"
                ? "border-accent text-accent"
                : "border-transparent text-textMuted hover:text-textPrimary"
            }`}
          >
            Pending Review (Drafts)
          </button>
          <button
            type="button"
            onClick={() => setTab("confirmed")}
            className={`pb-3 border-b-2 transition-colors focus-ring rounded-t ${
              tab === "confirmed"
                ? "border-accent text-accent"
                : "border-transparent text-textMuted hover:text-textPrimary"
            }`}
          >
            Confirmed (Visible to Buyer)
          </button>
          <button
            type="button"
            onClick={() => setTab("dismissed")}
            className={`pb-3 border-b-2 transition-colors focus-ring rounded-t ${
              tab === "dismissed"
                ? "border-accent text-accent"
                : "border-transparent text-textMuted hover:text-textPrimary"
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
                className="bg-surface border border-border rounded-lg p-5 sm:p-6 shadow-subtle space-y-4 transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <Link
                        href={`/orders/${w.orderId || w.id}`}
                        className="text-lg font-bold font-mono tracking-tight text-accent hover:underline focus-ring rounded"
                      >
                        {w.poNo}
                      </Link>
                      <StatusChip status={w.status} />
                    </div>
                    <p className="text-xs text-textMuted">
                      {w.style} • Buyer:{" "}
                      <strong className="text-textPrimary font-semibold">{w.buyerName}</strong> • Stage:{" "}
                      <strong className="text-textPrimary font-semibold">{w.stage}</strong>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-textMuted">
                      Projected Delay
                    </span>
                    <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-status-red">
                      +{w.slipDays} working days
                    </div>
                  </div>
                </div>

                {/* Maths Snapshot */}
                <div className="p-3.5 bg-surface-raised rounded-lg border border-border text-xs sm:text-sm font-medium">
                  <div className="font-bold text-textPrimary mb-1 text-xs uppercase tracking-wider">
                    The Maths Breakdown
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-textMuted">
                    <span>
                      Target Rate:{" "}
                      <strong className="text-accent underline tabular-nums font-bold">
                        {Math.round(w.requiredRate)}/day
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Actual Rate:{" "}
                      <strong className="text-status-red underline tabular-nums font-bold">
                        {Math.round(w.actualRate)}/day
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Remaining:{" "}
                      <strong className="text-textPrimary tabular-nums font-semibold">
                        {w.remaining.toLocaleString()} pcs
                      </strong>{" "}
                      in{" "}
                      <strong className="text-textPrimary tabular-nums font-semibold">
                        {w.daysAvailable} days
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Supervisor Floor Note if present */}
                {w.latestNote && w.latestNote.original && (
                  <div className="p-3.5 bg-status-amber-bg border border-status-amber/25 rounded-lg text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-status-amber">
                        Floor Supervisor Note
                      </span>
                      {w.latestNote.category && (
                        <span className="bg-surface px-2 py-0.5 rounded text-[11px] font-semibold text-textPrimary border border-border">
                          AI: {w.latestNote.category.replace(/_/g, " ")}{" "}
                          {w.latestNote.confidence && `(${(w.latestNote.confidence * 100).toFixed(0)}%)`}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-[11px] font-semibold text-textMuted block mb-0.5">
                          Original (Tamil):
                        </span>
                        <p className="font-tamil text-textPrimary leading-relaxed">
                          {w.latestNote.original}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-textMuted block mb-0.5">
                          English Translation:
                        </span>
                        <p className="text-textPrimary leading-relaxed">
                          {w.latestNote.translation || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions for Draft Warnings */}
                {tab === "draft" && (
                  <div className="flex flex-wrap justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      disabled={actionLoading === w.id}
                      onClick={() => {
                        setDismissingId(w.id);
                        setDismissReason("");
                        setDismissError(null);
                      }}
                      className="px-4 py-2 border border-border rounded-lg text-xs font-semibold text-textPrimary hover:bg-surface-hover transition-colors focus-ring tap-target"
                    >
                      Dismiss (Requires Reason)
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading === w.id}
                      onClick={() => handleConfirm(w.id, w.poNo)}
                      className="px-4.5 py-2 bg-accent text-white rounded-lg text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 focus-ring tap-target shadow-xs"
                    >
                      {actionLoading === w.id ? "Sending..." : "Confirm & Notify Buyer"}
                    </button>
                  </div>
                )}

                {/* Dismiss reason display if dismissed */}
                {tab === "dismissed" && w.dismissReason && (
                  <div className="p-3 bg-surface-raised rounded-md border border-border text-xs text-textMuted">
                    <span className="font-semibold text-textPrimary">Dismissal Reason: </span>
                    <span>&ldquo;{w.dismissReason}&rdquo;</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Dismiss Modal */}
        {dismissingId && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dismiss-modal-title"
          >
            <div className="bg-surface rounded-lg max-w-md w-full p-6 shadow-xl border border-border space-y-4">
              <div>
                <h3 id="dismiss-modal-title" className="text-lg font-bold text-textPrimary">
                  Dismiss Delay Warning
                </h3>
                <p className="text-xs text-textMuted mt-1">
                  Explain why this delay warning is being dismissed without alerting the buyer. This will be preserved in the audit log.
                </p>
              </div>

              {dismissError && <ErrorBanner message={dismissError} />}

              <form onSubmit={handleDismiss} className="space-y-4">
                <div>
                  <label
                    htmlFor="dismiss-reason-text"
                    className="block text-xs font-semibold uppercase tracking-wider text-textMuted mb-1"
                  >
                    Dismissal Reason * (Mandatory)
                  </label>
                  <textarea
                    id="dismiss-reason-text"
                    rows={3}
                    value={dismissReason}
                    onChange={(e) => setDismissReason(e.target.value)}
                    required
                    placeholder="e.g. Added a second shift to recover 80 pcs/day deficit; yarn arriving tonight"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-textPrimary text-sm focus-ring"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setDismissingId(null);
                      setDismissReason("");
                      setDismissError(null);
                    }}
                    className="px-4 py-2 border border-border rounded-lg text-xs font-medium text-textPrimary hover:bg-surface-hover focus-ring tap-target"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading === dismissingId}
                    className="px-4 py-2 bg-surface-raised border border-border text-textPrimary hover:bg-surface-hover rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 focus-ring tap-target"
                  >
                    {actionLoading === dismissingId ? "Dismissing..." : "Confirm Dismissal"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Floating Notification Toast */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-surface-raised text-textPrimary border border-border rounded-lg shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in"
          >
            <span className="text-status-green">✓</span>
            <span>{toastMessage}</span>
          </div>
        )}
      </main>
    </div>
  );
}
