"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { StatusChip } from "@/components/StatusChip";
import { RunRateCard } from "@/components/RunRateCard";
import { SkeletonCard } from "@/components/Skeleton";
import { ErrorBanner } from "@/components/States";

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Date Modal state
  const [showDateModal, setShowDateModal] = useState(false);
  const [newExDate, setNewExDate] = useState("");
  const [dateReason, setDateReason] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);
  const [savingDate, setSavingDate] = useState(false);

  // Category override state
  const [overrideUpdateId, setOverrideUpdateId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("machine_breakdown");
  const [savingCategory, setSavingCategory] = useState(false);

  // Success toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const fetchOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Order not found");
        throw new Error("Failed to load order details");
      }
      const data = await res.json();
      setOrder(data.order);
      setNewExDate(data.order.exFactoryDate);
    } catch (err: any) {
      setError(err.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const handleDateUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setDateError(null);
    if (!dateReason.trim()) {
      setDateError("A valid reason is required for every date adjustment.");
      return;
    }

    setSavingDate(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/dates`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: "ex_factory_date",
          newDate: newExDate,
          reason: dateReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setDateError(data.error?.message || "Failed to update date");
        setSavingDate(false);
        return;
      }

      setShowDateModal(false);
      setDateReason("");
      showToast("Ex-factory date updated and recorded in compliance history.");
      fetchOrder();
    } catch {
      setDateError("Network error while updating date");
    } finally {
      setSavingDate(false);
    }
  };

  const handleCategoryOverride = async (updateId: string, category: string) => {
    setSavingCategory(true);
    try {
      const res = await fetch(`/api/updates/${updateId}/category`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      if (res.ok) {
        setOverrideUpdateId(null);
        showToast("Reason category updated (source recorded as human).");
        fetchOrder();
      }
    } catch {
      // silent catch
    } finally {
      setSavingCategory(false);
    }
  };

  // Flatten and sort updates reverse-chronologically
  const allUpdates = order?.stages
    ? (order.stages as any[])
        .flatMap((s: any) =>
          (s.updates || []).map((u: any) => ({
            ...u,
            stageName: s.stage,
            unitName: s.unitName,
          }))
        )
        .sort((a: any, b: any) => {
          const dComp = (b.reportedDate || "").localeCompare(a.reportedDate || "");
          if (dComp !== 0) return dComp;
          return (b.clientTs || "").localeCompare(a.clientTs || "");
        })
    : [];

  const uniqueColors = order?.lines
    ? Array.from(new Set((order.lines as any[]).map((l: any) => l.color)))
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <div className="min-h-screen bg-background flex flex-col text-textPrimary">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline focus-ring rounded"
          >
            ← Back to Order Board
          </Link>
        </div>

        {error && <ErrorBanner message={error} onRetry={fetchOrder} />}

        {loading ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : !order ? (
          <div className="text-center py-16 bg-surface border border-border rounded-lg text-textMuted">
            Order not found
          </div>
        ) : (
          <div className="space-y-6">
            {/* Order Header Card */}
            <div className="bg-surface border border-border rounded-lg p-5 sm:p-6 shadow-subtle flex flex-col md:flex-row md:items-start md:justify-between gap-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-textPrimary">
                    {order.poNo}
                  </h1>
                  <StatusChip status={order.runRate?.status || order.status} />
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-raised border border-border text-textMuted">
                    Stage: <span className="text-textPrimary font-bold">{order.activeStage || order.runRate?.stage || "—"}</span>
                  </span>
                </div>

                <div className="text-base font-semibold text-textPrimary">
                  {order.style}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-textMuted">
                  <span>
                    Buyer:{" "}
                    <strong className="text-textPrimary font-semibold">
                      {order.buyerName} ({order.buyerCountry})
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Colour:{" "}
                    <strong className="text-textPrimary font-semibold">
                      {uniqueColors || "Standard"}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Total Qty:{" "}
                    <strong className="tabular-nums text-textPrimary font-semibold">
                      {order.totalQty.toLocaleString()} pcs
                    </strong>
                  </span>
                </div>
              </div>

              {/* Ex-factory date & Adjust Button */}
              <div className="flex flex-col sm:items-end justify-between gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-border">
                <div className="sm:text-right">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-textMuted">
                    Ex-Factory Date
                  </div>
                  <div className="flex items-center sm:justify-end gap-2 mt-0.5">
                    {order.originalExFactoryDate &&
                      order.originalExFactoryDate !== order.exFactoryDate && (
                        <span className="text-xs line-through text-textMuted tabular-nums">
                          {order.originalExFactoryDate}
                        </span>
                      )}
                    <span className="text-lg sm:text-xl font-bold font-mono tabular-nums text-textPrimary">
                      {order.exFactoryDate}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDateModal(true)}
                  className="inline-flex items-center justify-center px-3.5 py-2 bg-surface-raised border border-border rounded-lg text-xs font-semibold text-accent hover:bg-surface-hover hover:border-accent/40 transition-colors focus-ring tap-target"
                >
                  Adjust Date (Requires Reason)
                </button>
              </div>
            </div>

            {/* Run-Rate Delay Engine Card (The Maths) */}
            {order.runRate && (
              <RunRateCard
                stage={order.runRate.stage}
                remaining={order.runRate.remaining}
                daysAvailable={order.runRate.days_available ?? order.runRate.daysAvailable}
                requiredRate={order.runRate.required_rate ?? order.runRate.requiredRate}
                actualRate={order.runRate.actual_rate ?? order.runRate.actualRate}
                ratio={order.runRate.ratio}
                status={order.runRate.status}
                statusReason={order.runRate.status_reason ?? order.runRate.statusReason}
                projectedFinish={order.runRate.projected_finish ?? order.runRate.projectedFinish}
                slipDays={order.runRate.slip_days ?? order.runRate.slipDays}
              />
            )}

            {/* TNA Milestones Timeline */}
            <div className="bg-surface border border-border rounded-lg p-5 sm:p-6 shadow-subtle space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-textPrimary">TNA Milestone Schedule</h2>
                  <p className="text-xs text-textMuted">
                    Target timeline vs actual production progress across stages
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {order.stages.map((stage: any) => {
                  const dateMoved =
                    stage.plannedEnd &&
                    stage.currentEnd &&
                    stage.plannedEnd !== stage.currentEnd;

                  return (
                    <div
                      key={stage.id}
                      className="p-4 bg-surface-raised rounded-lg border border-border transition-colors hover:border-border/80"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold font-mono">
                            {stage.seq}
                          </span>
                          <span className="font-bold text-sm text-textPrimary">
                            {stage.stage}
                          </span>
                          {stage.unitName && (
                            <span className="text-xs text-textMuted">
                              ({stage.unitName})
                            </span>
                          )}
                          {dateMoved && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-status-amber-bg text-status-amber border border-status-amber/20">
                              Date changed
                            </span>
                          )}
                        </div>

                        <div className="text-right text-xs">
                          <span className="font-bold tabular-nums text-textPrimary">
                            {stage.stageQtyDone.toLocaleString()}
                          </span>
                          <span className="text-textMuted">
                            {" "}
                            / {stage.targetQty.toLocaleString()} pcs
                          </span>{" "}
                          <span className="font-semibold text-accent">
                            ({stage.percentDone}%)
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div
                        className="w-full bg-surface border border-border rounded-full h-2 overflow-hidden my-2.5"
                        role="progressbar"
                        aria-valuenow={stage.percentDone}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="bg-accent h-full transition-all duration-300 rounded-full"
                          style={{ width: `${Math.min(100, stage.percentDone)}%` }}
                        />
                      </div>

                      <div className="flex flex-wrap justify-between items-center text-xs text-textMuted gap-2">
                        <span className="tabular-nums">
                          Planned: {stage.plannedStart} → {stage.plannedEnd}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums">
                            Current Target:{" "}
                            <strong className="text-textPrimary font-semibold">
                              {stage.currentEnd}
                            </strong>
                          </span>
                          {stage.actualEnd && (
                            <span className="text-[11px] font-semibold text-status-green bg-status-green-bg px-2 py-0.5 rounded border border-status-green/20">
                              Completed {stage.actualEnd}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily Floor Updates Table (Original Tamil Note + Translation + AI Category) */}
            <div className="bg-surface border border-border rounded-lg p-5 sm:p-6 shadow-subtle space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-textPrimary">
                    Daily Floor Updates & Notes
                  </h2>
                  <p className="text-xs text-textMuted">
                    Reverse-chronological production entries from floor supervisors
                  </p>
                </div>
                <div className="text-xs text-textMuted">
                  Total updates: <strong className="text-textPrimary tabular-nums">{allUpdates.length}</strong>
                </div>
              </div>

              {allUpdates.length === 0 ? (
                <div className="py-8 text-center text-xs text-textMuted bg-surface-raised rounded-lg border border-border">
                  No daily updates reported yet.
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full text-left text-xs sm:text-sm divide-y divide-border">
                    <thead className="bg-surface-raised text-textMuted uppercase tracking-wider text-[11px] font-semibold">
                      <tr>
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Stage</th>
                        <th className="py-3 px-3">Qty Done</th>
                        <th className="py-3 px-3">Supervisor</th>
                        <th className="py-3 px-3 min-w-[180px]">Original Note (Tamil / English)</th>
                        <th className="py-3 px-3 min-w-[180px]">English Translation</th>
                        <th className="py-3 px-3">Category & Source</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-surface">
                      {allUpdates.map((u: any) => {
                        const isAi = u.categorySource === "ai";
                        const isFallback = u.categorySource === "fallback";
                        const isHuman = u.categorySource === "human";

                        return (
                          <tr
                            key={u.id}
                            className="hover:bg-surface-hover/60 transition-colors"
                          >
                            <td className="py-3 px-3 font-mono tabular-nums whitespace-nowrap text-textPrimary">
                              {u.reportedDate}
                            </td>
                            <td className="py-3 px-3 font-semibold text-textPrimary whitespace-nowrap">
                              {u.stageName}
                            </td>
                            <td className="py-3 px-3 font-bold tabular-nums text-textPrimary whitespace-nowrap">
                              {u.qty.toLocaleString()} pcs
                            </td>
                            <td className="py-3 px-3 text-xs text-textMuted whitespace-nowrap">
                              {u.submittedBy ? `Sup. ${u.submittedBy.slice(-4)}` : "Supervisor"}
                            </td>
                            <td className="py-3 px-3">
                              {u.noteOriginal ? (
                                <span className="font-tamil text-textPrimary leading-relaxed">
                                  {u.noteOriginal}
                                </span>
                              ) : (
                                <span className="text-textMuted">—</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-textMuted">
                              {u.noteEn || (u.noteOriginal && u.noteLang === "en" ? u.noteOriginal : "—")}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              {u.reasonCategory ? (
                                <div className="inline-flex flex-col gap-1 items-start">
                                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-surface-raised border border-border text-textPrimary">
                                    {u.reasonCategory.replace(/_/g, " ")}
                                  </span>
                                  {isAi && (
                                    <span className="text-[10px] font-medium text-accent">
                                      AI suggested
                                    </span>
                                  )}
                                  {isFallback && (
                                    <span className="text-[10px] font-medium text-status-amber">
                                      Needs review
                                    </span>
                                  )}
                                  {isHuman && (
                                    <span className="text-[10px] font-medium text-textMuted">
                                      Manual override
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-textMuted">—</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              {u.noteOriginal && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewCategory(u.reasonCategory || "machine_breakdown");
                                    setOverrideUpdateId(u.id);
                                  }}
                                  className="text-xs font-semibold text-accent hover:underline focus-ring rounded p-1"
                                >
                                  Change category
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Date-Change Audit History Table (Append-Only) */}
            <div className="bg-surface border border-border rounded-lg p-5 sm:p-6 shadow-subtle space-y-4">
              <div>
                <h2 className="text-base font-bold text-textPrimary">
                  Milestone Date Change Audit History
                </h2>
                <p className="text-xs text-textMuted">
                  Immutable append-only record of all schedule adjustments and compliance reasons
                </p>
              </div>

              {!order.history || order.history.length === 0 ? (
                <div className="py-6 text-center text-xs text-textMuted bg-surface-raised rounded-lg border border-border">
                  No date changes recorded. Order is running on original schedule.
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full text-left text-xs sm:text-sm divide-y divide-border">
                    <thead className="bg-surface-raised text-textMuted uppercase tracking-wider text-[11px] font-semibold">
                      <tr>
                        <th className="py-3 px-3">Date Changed</th>
                        <th className="py-3 px-3">Field</th>
                        <th className="py-3 px-3">Old Date → New Date</th>
                        <th className="py-3 px-3 min-w-[200px]">Audit Reason</th>
                        <th className="py-3 px-3 text-right">Changed By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-surface">
                      {order.history.map((h: any) => (
                        <tr
                          key={h.id}
                          className="hover:bg-surface-hover/60 transition-colors"
                        >
                          <td className="py-3 px-3 font-mono tabular-nums text-textMuted whitespace-nowrap">
                            {h.changedAt ? h.changedAt.split("T")[0] : "—"}
                          </td>
                          <td className="py-3 px-3 font-semibold text-textPrimary whitespace-nowrap">
                            {h.field.replace(/_/g, " ")}
                          </td>
                          <td className="py-3 px-3 font-mono tabular-nums text-textPrimary whitespace-nowrap">
                            <span className="line-through text-textMuted mr-1.5">
                              {h.oldDate}
                            </span>
                            <span className="font-bold text-accent">→ {h.newDate}</span>
                          </td>
                          <td className="py-3 px-3 text-textPrimary leading-relaxed">
                            {h.reason}
                          </td>
                          <td className="py-3 px-3 text-right text-textMuted whitespace-nowrap">
                            {h.changedBy || "Merchandiser"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Date Adjustment Modal */}
        {showDateModal && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="date-modal-title"
          >
            <div className="bg-surface rounded-lg max-w-md w-full p-6 shadow-xl border border-border space-y-4">
              <div>
                <h3 id="date-modal-title" className="text-lg font-bold text-textPrimary">
                  Adjust Ex-Factory Date
                </h3>
                <p className="text-xs text-textMuted mt-1">
                  Every date adjustment is logged permanently in the buyer-visible audit trail and requires a clear reason.
                </p>
              </div>

              {dateError && <ErrorBanner message={dateError} />}

              <form onSubmit={handleDateUpdate} className="space-y-4">
                <div>
                  <label
                    htmlFor="new-ex-date"
                    className="block text-xs font-semibold uppercase tracking-wider text-textMuted mb-1"
                  >
                    New Ex-Factory Date *
                  </label>
                  <input
                    id="new-ex-date"
                    type="date"
                    value={newExDate}
                    onChange={(e) => setNewExDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-textPrimary focus-ring tap-target text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="date-reason"
                    className="block text-xs font-semibold uppercase tracking-wider text-textMuted mb-1"
                  >
                    Reason for Date Change * (Mandatory)
                  </label>
                  <textarea
                    id="date-reason"
                    rows={3}
                    value={dateReason}
                    onChange={(e) => setDateReason(e.target.value)}
                    placeholder="e.g. Yarn batch dyeing shade mismatch required 2 days of re-processing"
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-textPrimary focus-ring text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDateModal(false);
                      setDateError(null);
                    }}
                    className="px-4 py-2 border border-border rounded-lg text-xs font-medium text-textPrimary hover:bg-surface-hover focus-ring tap-target"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingDate}
                    className="px-4 py-2 bg-accent text-white rounded-lg text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 focus-ring tap-target"
                  >
                    {savingDate ? "Saving..." : "Save Date Adjustment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Category Override Modal */}
        {overrideUpdateId && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
          >
            <div className="bg-surface rounded-lg max-w-sm w-full p-5 shadow-xl border border-border space-y-4">
              <div>
                <h3 id="category-modal-title" className="text-base font-bold text-textPrimary">
                  Change Reason Category
                </h3>
                <p className="text-xs text-textMuted mt-1">
                  Override the category assigned by the AI classifier. Source will be recorded as human.
                </p>
              </div>

              <div>
                <label
                  htmlFor="override-category-select"
                  className="block text-xs font-semibold text-textMuted uppercase tracking-wider mb-1"
                >
                  Category
                </label>
                <select
                  id="override-category-select"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-textPrimary text-sm focus-ring tap-target"
                >
                  <option value="machine_breakdown">Machine breakdown</option>
                  <option value="material_shortage">Material shortage</option>
                  <option value="manpower_shortage">Manpower shortage</option>
                  <option value="power_cut">Power cut</option>
                  <option value="quality_rework">Quality/rework</option>
                  <option value="buyer_approval_pending">Buyer approval pending</option>
                  <option value="subcontractor_delay">Subcontractor delay</option>
                  <option value="other">Other</option>
                  <option value="unclear">Unclear</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setOverrideUpdateId(null)}
                  className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-textPrimary hover:bg-surface-hover focus-ring"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingCategory}
                  onClick={() => handleCategoryOverride(overrideUpdateId, newCategory)}
                  className="px-3.5 py-1.5 bg-accent text-white rounded-lg text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 focus-ring"
                >
                  {savingCategory ? "Saving..." : "Save Override"}
                </button>
              </div>
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
