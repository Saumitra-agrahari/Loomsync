"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { SkeletonCard } from "@/components/Skeleton";
import { ErrorBanner } from "@/components/States";

function BuyerOrderDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = params.id as string;
  const token = searchParams.get("token") || "";

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = token
          ? `/api/buyer/orders/${orderId}?token=${encodeURIComponent(token)}`
          : `/api/buyer/orders/${orderId}`;

        const res = await fetch(url);
        if (!res.ok) {
          if (res.status === 404) throw new Error("Order not found or access denied");
          throw new Error("Failed to load order details");
        }
        const data = await res.json();
        setOrder(data.order);
      } catch (err: any) {
        setError(err.message || "Failed to load order");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, token]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <div className="mb-4">
          <Link
            href={`/b${token ? `?token=${encodeURIComponent(token)}` : ""}`}
            className="text-xs font-semibold text-accent hover:underline mb-2 inline-block"
          >
            ← Back to Your Orders
          </Link>
        </div>

        {error && <ErrorBanner message={error} onRetry={() => router.push("/b")} />}

        {loading ? (
          <SkeletonCard />
        ) : !order ? (
          <div className="text-center py-12 text-textSecondary">Order not found.</div>
        ) : (
          <div className="space-y-6">
            {/* Header banner */}
            <div className="bg-white border border-border rounded-lg p-5 sm:p-6 shadow-sm flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-xl sm:text-2xl font-bold text-accent">{order.poNo}</span>
                <h1 className="text-base sm:text-lg font-bold text-textPrimary mt-0.5">{order.style}</h1>
                <p className="text-xs text-textSecondary mt-1">
                  Buyer Account: <span className="font-semibold text-textPrimary">{order.buyerName} ({order.buyerCountry})</span> ·
                  Total Order: <span className="font-semibold text-textPrimary">{order.totalQty.toLocaleString()} pcs</span>
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-textSecondary block">Target Ex-Factory Date</span>
                <span className="text-lg font-bold text-textPrimary">{order.exFactoryDate}</span>
              </div>
            </div>

            {/* Confirmed Delay Notices */}
            {order.confirmedWarnings && order.confirmedWarnings.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚠️</span>
                  <h2 className="text-sm sm:text-base font-bold text-rose-900">
                    Official Factory Delay Notice
                  </h2>
                </div>
                {order.confirmedWarnings.map((w: any) => (
                  <div key={w.id} className="text-xs sm:text-sm text-rose-800 space-y-1">
                    <p>
                      The factory has confirmed a projected delay of <strong>+{w.slipDays} working days</strong>.
                    </p>
                    <p className="text-xs text-rose-700">
                      Required run rate: {Math.round(w.requiredRate)} pcs/day · Current average output: {Math.round(w.actualRate)} pcs/day.
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* TNA Milestone Timeline */}
            <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
              <h2 className="text-base font-bold text-textPrimary mb-3">TNA Milestone Schedule</h2>
              <div className="space-y-3">
                {order.milestones.map((m: any) => (
                  <div key={m.id} className="p-3 bg-surface rounded-lg border border-border text-xs sm:text-sm">
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-textPrimary">{m.stage}</strong>
                      <span className="font-semibold">
                        {m.stageDone.toLocaleString()} / {m.targetQty.toLocaleString()} pcs ({m.percentDone}%)
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden my-2">
                      <div className="bg-accent h-full" style={{ width: `${m.percentDone}%` }} />
                    </div>

                    <div className="flex justify-between text-xs text-textSecondary">
                      <span>Planned: {m.plannedStart} → {m.plannedEnd}</span>
                      <span>Target End: <strong className="text-textPrimary">{m.currentEnd}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floor Progress Photos */}
            {order.photos && order.photos.length > 0 && (
              <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
                <h2 className="text-base font-bold text-textPrimary mb-3">Verified Production Photos</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {order.photos.map((p: any) => (
                    <div key={p.id} className="border border-border rounded-lg overflow-hidden bg-surface p-2 text-center">
                      <div className="h-28 bg-gray-200 rounded flex items-center justify-center text-textSecondary text-xs font-mono">
                        📷 {p.storageKey.split("/").pop()}
                      </div>
                      <span className="text-[11px] text-textSecondary block mt-1">
                        {p.takenAt.split("T")[0]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Date-Change Compliance History */}
            <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
              <h2 className="text-base font-bold text-textPrimary mb-3">Date Revision History</h2>
              {order.history.length === 0 ? (
                <p className="text-xs text-textSecondary py-2">No revisions made. Order is tracking to original contract date.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-surface border-b border-border text-textSecondary uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2 px-3">Revision Date</th>
                        <th className="py-2 px-3">Adjustment</th>
                        <th className="py-2 px-3">Reason Provided</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {order.history.map((h: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 text-textSecondary">{h.changedAt.split("T")[0]}</td>
                          <td className="py-2 px-3 font-semibold text-textPrimary">
                            {h.oldDate} → {h.newDate}
                          </td>
                          <td className="py-2 px-3 text-textPrimary">{h.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function BuyerOrderDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><SkeletonCard /></div>}>
      <BuyerOrderDetailContent />
    </Suspense>
  );
}

