"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { StatusChip } from "@/components/StatusChip";
import { RunRateCard } from "@/components/RunRateCard";
import { SkeletonCard } from "@/components/Skeleton";
import { ErrorBanner } from "@/components/States";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
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
      fetchOrder();
    } catch {
      setDateError("Network error while updating date");
    } finally {
      setSavingDate(false);
    }
  };

  const handleCategoryOverride = async (updateId: string, category: string) => {
    try {
      const res = await fetch(`/api/updates/${updateId}/category`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      if (res.ok) {
        setOverrideUpdateId(null);
        fetchOrder();
      }
    } catch {
      // silent catch
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <div className="mb-4">
          <Link href="/" className="text-xs font-semibold text-accent hover:underline mb-2 inline-block">
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
          <div className="text-center py-12 text-textSecondary">Order not found</div>
        ) : (
          <div className="space-y-6">
            {/* Header banner */}
            <div className="bg-white border border-border rounded-lg p-5 sm:p-6 shadow-sm flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl sm:text-2xl font-bold text-accent">{order.poNo}</h1>
                  <StatusChip status={order.runRate.status} />
                </div>
                <p className="text-sm sm:text-base font-semibold text-textPrimary mt-1">{order.style}</p>
                <p className="text-xs text-textSecondary mt-0.5">
                  Buyer: <span className="text-textPrimary font-medium">{order.buyerName} ({order.buyerCountry})</span> ·
                  Total Qty: <span className="text-textPrimary font-medium">{order.totalQty.toLocaleString()} pcs</span>
                </p>
              </div>

              <div className="flex flex-col sm:items-end gap-1.5">
                <div className="text-xs text-textSecondary">Ex-Factory Date</div>
                <div className="text-base sm:text-lg font-bold text-textPrimary">{order.exFactoryDate}</div>
                <button
                  type="button"
                  onClick={() => setShowDateModal(true)}
                  className="text-xs px-3 py-1 bg-surface border border-border rounded font-medium hover:bg-surfaceHover text-accent tap-target"
                >
                  Adjust Date (Requires Reason)
                </button>
              </div>
            </div>

            {/* Run-Rate Delay Engine Card (The Maths) */}
            <RunRateCard
              stage={order.runRate.stage}
              remaining={order.runRate.remaining}
              daysAvailable={order.runRate.days_available || order.runRate.daysAvailable}
              requiredRate={order.runRate.required_rate || order.runRate.requiredRate}
              actualRate={order.runRate.actual_rate || order.runRate.actualRate}
              ratio={order.runRate.ratio}
              status={order.runRate.status}
              statusReason={order.runRate.status_reason || order.runRate.statusReason}
              projectedFinish={order.runRate.projected_finish || order.runRate.projectedFinish}
              slipDays={order.runRate.slip_days ?? order.runRate.slipDays}
            />

            {/* TNA Milestones Timeline */}
            <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
              <h2 className="text-base font-bold text-textPrimary mb-3">TNA Milestone Schedule</h2>
              <div className="space-y-3">
                {order.stages.map((stage: any) => (
                  <div key={stage.id} className="p-3 bg-surface rounded-lg border border-border text-xs sm:text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold">
                          {stage.seq}
                        </span>
                        <strong className="text-textPrimary text-sm">{stage.stage}</strong>
                        {stage.unitName && (
                          <span className="text-textSecondary text-xs">({stage.unitName})</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-textPrimary">
                          {stage.stageQtyDone.toLocaleString()} / {stage.targetQty.toLocaleString()} pcs
                        </span>{" "}
                        <span className="text-textSecondary">({stage.percentDone}%)</span>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden my-2">
                      <div
                        className="bg-accent h-full transition-all"
                        style={{ width: `${stage.percentDone}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-xs text-textSecondary mt-1">
                      <span>Planned: {stage.plannedStart} → {stage.plannedEnd}</span>
                      <span>Target End: <strong className="text-textPrimary">{stage.currentEnd}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Floor Updates Table (Original Note + Translation + AI Category) */}
            <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
              <h2 className="text-base font-bold text-textPrimary mb-3">Daily Floor Updates & Tamil Notes</h2>
              {order.stages.flatMap((s: any) => s.updates).length === 0 ? (
                <p className="text-xs text-textSecondary py-4">No daily updates reported yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-surface border-b border-border text-textSecondary uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Qty Done</th>
                        <th className="py-2.5 px-3">Original Note (Tamil / English)</th>
                        <th className="py-2.5 px-3">English Translation</th>
                        <th className="py-2.5 px-3">Category & Source</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {order.stages
                        .flatMap((s: any) => s.updates)
                        .map((u: any) => (
                          <tr key={u.id} className="hover:bg-surface/50">
                            <td className="py-2.5 px-3 font-medium">{u.reportedDate}</td>
                            <td className="py-2.5 px-3 font-semibold">{u.qty.toLocaleString()} pcs</td>
                            <td className="py-2.5 px-3">
                              {u.noteOriginal ? (
                                <span className="font-tamil text-textPrimary">{u.noteOriginal}</span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-textSecondary">
                              {u.noteEn || u.noteOriginal || "—"}
                            </td>
                            <td className="py-2.5 px-3">
                              {u.reasonCategory ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-300">
                                    {u.reasonCategory.replace(/_/g, " ")}
                                  </span>
                                  <span className="text-[10px] text-textSecondary italic">
                                    ({u.categorySource})
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {u.noteOriginal && (
                                <button
                                  type="button"
                                  onClick={() => setOverrideUpdateId(u.id)}
                                  className="text-xs text-accent hover:underline font-medium"
                                >
                                  Override
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Date-Change Audit History Table (Append-Only) */}
            <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
              <h2 className="text-base font-bold text-textPrimary mb-3">Milestone Date Change Audit History</h2>
              {order.history.length === 0 ? (
                <p className="text-xs text-textSecondary py-3">No date changes recorded. Order is on original schedule.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-surface border-b border-border text-textSecondary uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2 px-3">Changed At</th>
                        <th className="py-2 px-3">Field</th>
                        <th className="py-2 px-3">Old Date → New Date</th>
                        <th className="py-2 px-3">Mandatory Reason</th>
                        <th className="py-2 px-3 text-right">Changed By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {order.history.map((h: any) => (
                        <tr key={h.id} className="hover:bg-surface/50">
                          <td className="py-2 px-3 text-textSecondary">{h.changedAt.split("T")[0]}</td>
                          <td className="py-2 px-3 font-semibold">{h.field}</td>
                          <td className="py-2 px-3 font-medium text-textPrimary">
                            <span className="line-through text-gray-400 mr-1.5">{h.oldDate}</span>
                            <span>→ {h.newDate}</span>
                          </td>
                          <td className="py-2 px-3 text-textPrimary">{h.reason}</td>
                          <td className="py-2 px-3 text-right text-textSecondary">{h.changedBy}</td>
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
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-border">
              <h3 className="text-lg font-bold text-textPrimary mb-2">Adjust Ex-Factory Date</h3>
              <p className="text-xs text-textSecondary mb-4">
                Every date adjustment requires an audit reason and updates the append-only compliance history.
              </p>

              {dateError && <div className="mb-3"><ErrorBanner message={dateError} /></div>}

              <form onSubmit={handleDateUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                    New Ex-Factory Date *
                  </label>
                  <input
                    type="date"
                    value={newExDate}
                    onChange={(e) => setNewExDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-border rounded text-textPrimary tap-target"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                    Reason for Date Change * (Mandatory)
                  </label>
                  <textarea
                    rows={3}
                    value={dateReason}
                    onChange={(e) => setDateReason(e.target.value)}
                    placeholder="e.g. Yarn batch dyeing shade mismatch required 2 days of re-processing"
                    required
                    className="w-full px-3 py-2 border border-border rounded text-textPrimary tap-target"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowDateModal(false)}
                    className="px-4 py-2 border border-border rounded text-xs font-medium tap-target"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingDate}
                    className="px-4 py-2 bg-accent text-white rounded text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 tap-target"
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
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-sm w-full p-5 shadow-xl border border-border">
              <h3 className="text-base font-bold text-textPrimary mb-2">Override AI Reason Category</h3>
              <p className="text-xs text-textSecondary mb-3">
                Change the category assigned by the AI classifier. Source will be recorded as human.
              </p>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded bg-white text-sm tap-target mb-4"
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
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOverrideUpdateId(null)}
                  className="px-3 py-1.5 border border-border rounded text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleCategoryOverride(overrideUpdateId, newCategory)}
                  className="px-3 py-1.5 bg-accent text-white rounded text-xs font-semibold"
                >
                  Save Override
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
