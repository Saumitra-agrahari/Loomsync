"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { StatusChip } from "@/components/StatusChip";
import { SkeletonRow } from "@/components/Skeleton";
import { EmptyState, ErrorBanner } from "@/components/States";
import { useI18n } from "@/lib/i18n";

export default function WarningInboxPage() {
  const { t, translateStage, translateCategory } = useI18n();

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
      if (!res.ok) throw new Error(t("errors.networkError"));
      const data = await res.json();
      setWarnings(data.warnings || []);
    } catch (err: any) {
      setError(err.message || t("errors.networkError"));
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
        showToast(t("warnings.toastConfirmed", { poNo }));
        fetchWarnings();
      } else {
        const data = await res.json();
        showToast(data.error?.message || t("errors.unknownError"));
      }
    } catch {
      showToast(t("errors.networkError"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismiss = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dismissReason.trim()) {
      setDismissError(t("warnings.dismissReasonLabel"));
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
        setDismissingId(null);
        setDismissReason("");
        setDismissError(null);
        showToast(t("warnings.toastDismissed"));
        fetchWarnings();
      } else {
        const data = await res.json();
        setDismissError(data.error?.message || t("errors.unknownError"));
      }
    } catch {
      setDismissError(t("errors.networkError"));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col text-textPrimary">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-textPrimary tracking-tight">
            {t("warnings.title")}
          </h1>
          <p className="text-xs sm:text-sm text-textMuted mt-1">
            {t("warnings.subtitle")}
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
            {t("warnings.tabDrafts")}
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
            {t("warnings.tabConfirmed")}
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
            {t("warnings.tabDismissed")}
          </button>
        </div>

        {error && <ErrorBanner message={error} onRetry={fetchWarnings} />}

        {loading ? (
          <SkeletonRow count={3} />
        ) : warnings.length === 0 ? (
          <EmptyState
            message={
              tab === "draft"
                ? t("warnings.noDraftsEmpty")
                : tab === "confirmed"
                ? t("warnings.noConfirmedEmpty")
                : t("warnings.noDismissedEmpty")
            }
          />
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
                      {w.style} • {t("detail.buyerLabel")}:{" "}
                      <strong className="text-textPrimary font-semibold">{w.buyerName}</strong> • {t("detail.stageBadge")}:{" "}
                      <strong className="text-textPrimary font-semibold">{translateStage(w.stage)}</strong>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-textMuted">
                      {t("warnings.projectedDelay")}
                    </span>
                    <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-status-red">
                      {t("warnings.delayDays", { days: w.slipDays })}
                    </div>
                  </div>
                </div>

                {/* Maths Snapshot */}
                <div className="p-3.5 bg-surface-raised rounded-lg border border-border text-xs sm:text-sm font-medium">
                  <div className="font-bold text-textPrimary mb-1 text-xs uppercase tracking-wider">
                    {t("warnings.mathsTitle")}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-textMuted">
                    <span>
                      {t("warnings.targetRate", { rate: Math.round(w.requiredRate) })}
                    </span>
                    <span>•</span>
                    <span>
                      {t("warnings.actualRate", { rate: Math.round(w.actualRate) })}
                    </span>
                    <span>•</span>
                    <span>
                      {t("warnings.remainingQtyInDays", {
                        qty: w.remaining.toLocaleString(),
                        days: w.daysAvailable,
                      })}
                    </span>
                  </div>
                </div>

                {/* Supervisor Floor Note if present */}
                {w.latestNote && w.latestNote.original && (
                  <div className="p-3.5 bg-status-amber-bg border border-status-amber/25 rounded-lg text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-status-amber">
                        {t("warnings.supervisorNoteTitle")}
                      </span>
                      {w.latestNote.category && (
                        <span className="bg-surface px-2 py-0.5 rounded text-[11px] font-semibold text-textPrimary border border-border">
                          {t("warnings.aiConfidence", {
                            category: translateCategory(w.latestNote.category),
                            conf: w.latestNote.confidence ? (w.latestNote.confidence * 100).toFixed(0) : "100",
                          })}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-[11px] font-semibold text-textMuted block mb-0.5">
                          {t("warnings.originalTamil")}:
                        </span>
                        <p className="font-tamil text-textPrimary leading-relaxed">
                          {w.latestNote.original}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-textMuted block mb-0.5">
                          {t("warnings.translationEnglish")}:
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
                      {t("warnings.dismissButton")}
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading === w.id}
                      onClick={() => handleConfirm(w.id, w.poNo)}
                      className="px-4.5 py-2 bg-accent text-white rounded-lg text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 focus-ring tap-target shadow-xs"
                    >
                      {actionLoading === w.id ? t("warnings.confirmingButton") : t("warnings.confirmButton")}
                    </button>
                  </div>
                )}

                {/* Dismiss reason display if dismissed */}
                {tab === "dismissed" && w.dismissReason && (
                  <div className="p-3 bg-surface-raised rounded-md border border-border text-xs text-textMuted">
                    <span>{t("warnings.dismissedReasonPrefix", { reason: w.dismissReason })}</span>
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
                  {t("warnings.dismissModalTitle")}
                </h3>
                <p className="text-xs text-textMuted mt-1">
                  {t("warnings.dismissModalSubtitle")}
                </p>
              </div>

              {dismissError && <ErrorBanner message={dismissError} />}

              <form onSubmit={handleDismiss} className="space-y-4">
                <div>
                  <label
                    htmlFor="dismiss-reason-text"
                    className="block text-xs font-semibold uppercase tracking-wider text-textMuted mb-1"
                  >
                    {t("warnings.dismissReasonLabel")}
                  </label>
                  <textarea
                    id="dismiss-reason-text"
                    rows={3}
                    value={dismissReason}
                    onChange={(e) => setDismissReason(e.target.value)}
                    required
                    placeholder={t("warnings.dismissReasonPlaceholder")}
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
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading === dismissingId}
                    className="px-4 py-2 bg-surface-raised border border-border text-textPrimary hover:bg-surface-hover rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 focus-ring tap-target"
                  >
                    {actionLoading === dismissingId ? t("warnings.dismissingButton") : t("warnings.confirmDismissButton")}
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
