"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { SkeletonRow } from "@/components/Skeleton";
import { EmptyState, ErrorBanner } from "@/components/States";
import { useI18n } from "@/lib/i18n";

function BuyerPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const { t, translateStage } = useI18n();

  const [buyer, setBuyer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "on_track" | "warning">("all");

  const fetchBuyerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = token ? `/api/buyer/orders?token=${encodeURIComponent(token)}` : "/api/buyer/orders";
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to load buyer portal");
      }
      const data = await res.json();
      setBuyer(data.buyer);
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuyerData();
  }, [token]);

  const downloadExcel = () => {
    const url = token
      ? `/api/exports/weekly?token=${encodeURIComponent(token)}&format=xlsx`
      : "/api/exports/weekly?format=xlsx";
    window.location.href = url;
  };

  const filteredOrders = useMemo(() => {
    if (statusFilter === "on_track") {
      return orders.filter((o) => !o.hasDelayWarning);
    }
    if (statusFilter === "warning") {
      return orders.filter((o) => o.hasDelayWarning);
    }
    return orders;
  }, [orders, statusFilter]);

  const onTrackCount = orders.filter((o) => !o.hasDelayWarning).length;
  const warningCount = orders.filter((o) => o.hasDelayWarning).length;

  return (
    <div className="min-h-screen bg-background flex flex-col text-textPrimary">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Executive Header Banner */}
        <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-textPrimary">
                {buyer?.name
                  ? t("buyer.title", { name: buyer.name })
                  : t("buyer.defaultTitle")}
              </h1>
              <span className="text-[11px] font-semibold bg-surface-raised text-textMuted border border-border px-2.5 py-0.5 rounded-full">
                {t("buyer.verifiedBadge")}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-textMuted">
              {t("buyer.subtitle")}
            </p>
          </div>

          <button
            type="button"
            onClick={downloadExcel}
            className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors focus-ring tap-target inline-flex items-center justify-center gap-2 shadow-xs shrink-0"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>{t("buyer.downloadExcelButton")}</span>
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors focus-ring tap-target ${
              statusFilter === "all"
                ? "bg-accent text-white"
                : "bg-surface border border-border text-textMuted hover:text-textPrimary"
            }`}
          >
            {t("buyer.filterAll", { count: orders.length })}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("on_track")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors focus-ring tap-target ${
              statusFilter === "on_track"
                ? "bg-status-green-bg text-status-green border border-status-green/30"
                : "bg-surface border border-border text-textMuted hover:text-textPrimary"
            }`}
          >
            {t("buyer.filterOnTrack", { count: onTrackCount })}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("warning")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors focus-ring tap-target ${
              statusFilter === "warning"
                ? "bg-status-red-bg text-status-red border border-status-red/30"
                : "bg-surface border border-border text-textMuted hover:text-textPrimary"
            }`}
          >
            {t("buyer.filterNotices", { count: warningCount })}
          </button>
        </div>

        {error && <ErrorBanner message={error} onRetry={fetchBuyerData} />}

        {loading ? (
          <SkeletonRow count={4} />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            message={
              statusFilter === "all"
                ? t("buyer.emptyAll")
                : t("buyer.emptyFiltered", { filter: statusFilter.replace("_", " ") })
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((o) => (
              <Link
                key={o.id}
                href={`/b/${o.id}${token ? `?token=${encodeURIComponent(token)}` : ""}`}
                className="block bg-surface border border-border hover:border-accent rounded-xl p-5 shadow-subtle hover:shadow-md transition-all focus-ring"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg font-bold font-mono tracking-tight text-accent">
                        {o.poNo}
                      </span>
                    </div>
                    <h2 className="text-sm sm:text-base font-semibold text-textPrimary mt-0.5">
                      {o.style}
                    </h2>
                  </div>

                  {o.hasDelayWarning ? (
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

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3 p-3.5 bg-surface-raised rounded-lg border border-border text-xs sm:text-sm">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-textMuted block">
                      {t("buyer.cardOrderQty")}
                    </span>
                    <strong className="font-mono tabular-nums text-textPrimary text-sm sm:text-base font-bold">
                      {o.totalQty.toLocaleString()} {t("common.pcs")}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-textMuted block">
                      {t("buyer.cardCurrentStage")}
                    </span>
                    <strong className="text-textPrimary text-sm sm:text-base font-bold">
                      {translateStage(o.currentStage)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-textMuted block">
                      {t("buyer.cardStageProgress")}
                    </span>
                    <strong className="font-mono tabular-nums text-accent text-sm sm:text-base font-bold">
                      {o.percentDone}%
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-textMuted block">
                      {t("buyer.cardExDate")}
                    </span>
                    <strong className="font-mono tabular-nums text-textPrimary text-sm sm:text-base font-bold">
                      {o.exFactoryDate}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-end text-xs font-semibold text-accent gap-1 pt-1">
                  <span>{t("buyer.cardViewDetails")}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function BuyerPortalPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><SkeletonRow count={3} /></div>}>
      <BuyerPortalContent />
    </Suspense>
  );
}
