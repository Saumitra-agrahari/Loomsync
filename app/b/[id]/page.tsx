"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { SkeletonCard } from "@/components/Skeleton";
import { ErrorBanner } from "@/components/States";
import { useI18n } from "@/lib/i18n";

function BuyerOrderDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = params.id as string;
  const token = searchParams.get("token") || "";
  const { t, translateStage } = useI18n();

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

  const uniqueColors = order?.lines
    ? Array.from(new Set((order.lines as any[]).map((l: any) => l.color)))
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <div className="min-h-screen bg-background flex flex-col text-textPrimary">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <Link
            href={`/b${token ? `?token=${encodeURIComponent(token)}` : ""}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline focus-ring rounded"
          >
            {t("buyer.backToOrders")}
          </Link>
        </div>

        {error && <ErrorBanner message={error} onRetry={() => router.push("/b")} />}

        {loading ? (
          <SkeletonCard />
        ) : !order ? (
          <div className="text-center py-16 bg-surface border border-border rounded-xl text-textMuted">
            {t("buyer.emptyAll")}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 shadow-subtle flex flex-col md:flex-row md:items-start md:justify-between gap-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-textPrimary">
                    {order.poNo}
                  </h1>
                  {order.confirmedWarnings && order.confirmedWarnings.length > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-status-red-bg text-status-red border border-status-red/25">
                      <span className="w-2 h-2 rounded-full bg-status-red" />
                      {t("buyer.statusDelayNotice")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-status-green-bg text-status-green border border-status-green/25">
                      <span className="font-bold">✓</span>
                      {t("buyer.statusOnTrack")}
                    </span>
                  )}
                </div>

                <div className="text-base font-semibold text-textPrimary">
                  {order.style}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-textMuted">
                  <span>
                    {t("detail.buyerLabel")}:{" "}
                    <strong className="text-textPrimary font-semibold">
                      {order.buyerName} ({order.buyerCountry})
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    {t("detail.colourLabel")}:{" "}
                    <strong className="text-textPrimary font-semibold">
                      {uniqueColors || "Standard"}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    {t("detail.totalQtyLabel")}:{" "}
                    <strong className="tabular-nums font-mono text-textPrimary font-semibold">
                      {order.totalQty.toLocaleString()} {t("common.pcs")}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-border">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-textMuted block">
                  {t("detail.exFactoryDateLabel")}
                </span>
                <span className="text-lg sm:text-xl font-bold font-mono tabular-nums text-textPrimary">
                  {order.exFactoryDate}
                </span>
              </div>
            </div>

            {/* Confirmed Delay Notices (Plain-Language, Executive, No Internal Notes) */}
            {order.confirmedWarnings && order.confirmedWarnings.length > 0 && (
              <div className="bg-status-red-bg border border-status-red/30 rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-status-red font-bold">⚠️</span>
                  <h2 className="text-sm sm:text-base font-bold text-status-red tracking-tight">
                    {t("buyer.delayNoticeTitle")}
                  </h2>
                </div>
                {order.confirmedWarnings.map((w: any) => (
                  <div key={w.id} className="text-xs sm:text-sm text-textPrimary space-y-2">
                    <p className="leading-relaxed">
                      {t("buyer.delayNoticeBody", { days: w.slipDays })}
                    </p>
                    <div className="p-3 bg-surface/70 rounded-lg border border-border/60 text-xs text-textMuted flex flex-wrap items-center gap-x-4 gap-y-1 font-mono">
                      <span>
                        {t("buyer.targetPace", { rate: Math.round(w.requiredRate) })}
                      </span>
                      <span>•</span>
                      <span>
                        {t("buyer.currentAverage", { rate: Math.round(w.actualRate) })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TNA Milestone Timeline (Milestones only, no internal unit names) */}
            <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 shadow-subtle space-y-4">
              <div>
                <h2 className="text-base font-bold text-textPrimary">
                  {t("buyer.milestonesTitle")}
                </h2>
                <p className="text-xs text-textMuted">
                  {t("buyer.milestonesSubtitle")}
                </p>
              </div>

              <div className="space-y-3">
                {order.milestones?.map((m: any) => (
                  <div
                    key={m.id}
                    className="p-4 bg-surface-raised rounded-lg border border-border space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold font-mono">
                          {m.seq}
                        </span>
                        <strong className="text-sm font-bold text-textPrimary">
                          {translateStage(m.stage)}
                        </strong>
                      </div>

                      <div className="text-right text-xs">
                        <span className="font-mono font-bold tabular-nums text-textPrimary">
                          {m.stageDone.toLocaleString()}
                        </span>
                        <span className="text-textMuted">
                          {" "}
                          / {m.targetQty.toLocaleString()} {t("common.pcs")}
                        </span>{" "}
                        <span className="font-semibold text-accent">
                          ({m.percentDone}%)
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div
                      className="w-full bg-surface border border-border rounded-full h-2 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={m.percentDone}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="bg-accent h-full transition-all duration-300 rounded-full"
                        style={{ width: `${Math.min(100, m.percentDone)}%` }}
                      />
                    </div>

                    <div className="flex flex-wrap justify-between items-center text-xs text-textMuted gap-2 pt-0.5">
                      <span className="tabular-nums">
                        {t("buyer.plannedWindow", { start: m.plannedStart, end: m.plannedEnd })}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums">
                          {t("buyer.targetCompletion", { date: m.currentEnd })}
                        </span>
                        {m.actualEnd && (
                          <span className="text-[11px] font-semibold text-status-green bg-status-green-bg px-2 py-0.5 rounded border border-status-green/20">
                            {t("buyer.completedBadge", { date: m.actualEnd })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Production Progress Photos (Clean responsive grid, simple view) */}
            {order.photos && order.photos.length > 0 && (
              <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 shadow-subtle space-y-4">
                <div>
                  <h2 className="text-base font-bold text-textPrimary">
                    {t("buyer.photosTitle")}
                  </h2>
                  <p className="text-xs text-textMuted">
                    {t("buyer.photosSubtitle")}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {order.photos.map((p: any) => (
                    <div
                      key={p.id}
                      className="group border border-border rounded-xl overflow-hidden bg-surface-raised p-2 shadow-xs transition-colors hover:border-accent"
                    >
                      <div className="aspect-4/3 bg-surface rounded-lg overflow-hidden flex items-center justify-center border border-border">
                        <img
                          src={`/api/photos/${p.id}`}
                          alt="Production snapshot"
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                      <div className="pt-2 px-1 text-center">
                        <span className="text-[11px] font-mono tabular-nums text-textMuted block">
                          {t("buyer.capturedLabel", { date: p.takenAt ? p.takenAt.split("T")[0] : "—" })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Date Revision History (Transparency) */}
            <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 shadow-subtle space-y-4">
              <div>
                <h2 className="text-base font-bold text-textPrimary">
                  {t("buyer.historyTitle")}
                </h2>
                <p className="text-xs text-textMuted">
                  {t("buyer.historySubtitle")}
                </p>
              </div>

              {!order.history || order.history.length === 0 ? (
                <div className="py-6 text-center text-xs text-textMuted bg-surface-raised rounded-lg border border-border">
                  {t("buyer.noHistory")}
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full text-left text-xs sm:text-sm divide-y divide-border">
                    <thead className="bg-surface-raised text-textMuted uppercase tracking-wider text-[11px] font-semibold">
                      <tr>
                        <th className="py-3 px-3">{t("buyer.tableRevisionDate")}</th>
                        <th className="py-3 px-3">{t("buyer.tableAdjustment")}</th>
                        <th className="py-3 px-3 min-w-[200px]">{t("buyer.tableReasonProvided")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-surface">
                      {order.history.map((h: any, idx: number) => (
                        <tr
                          key={idx}
                          className="hover:bg-surface-hover/60 transition-colors"
                        >
                          <td className="py-3 px-3 font-mono tabular-nums text-textMuted whitespace-nowrap">
                            {h.changedAt ? h.changedAt.split("T")[0] : "—"}
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
