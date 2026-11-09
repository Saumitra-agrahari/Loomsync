"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { SkeletonCard } from "@/components/Skeleton";
import { EmptyState, ErrorBanner } from "@/components/States";
import { getQueuedUpdates, syncOutbox } from "@/lib/offline/db";
import { getTimeOfDayGreeting } from "@/lib/ui/greeting";
import { useI18n } from "@/lib/i18n";

export default function SupervisorHomePage() {
  const router = useRouter();
  const { t, locale, translateStage } = useI18n();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queuedStageIds, setQueuedStageIds] = useState<Set<string>>(new Set());
  const [queuedCount, setQueuedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const greeting = getTimeOfDayGreeting(user?.name, locale);

  const fetchSupervisorOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const meRes = await fetch("/api/me");
      if (!meRes.ok) {
        router.push("/login");
        return;
      }
      const meData = await meRes.json();
      setUser(meData.user);

      const res = await fetch("/api/supervisor/orders");
      if (!res.ok) throw new Error("Failed to load unit orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const checkOutbox = async () => {
    const queued = await getQueuedUpdates();
    setQueuedCount(queued.length);
    setQueuedStageIds(new Set(queued.map((q) => q.orderStageId)));
  };

  useEffect(() => {
    fetchSupervisorOrders();
    checkOutbox();

    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    await syncOutbox();
    await checkOutbox();
    await fetchSupervisorOrders();
    setIsSyncing(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col text-textPrimary">
      <Navbar />

      {/* Calm Offline Banner */}
      {(!isOnline || queuedCount > 0) && (
        <aside
          aria-label="Offline status banner"
          className="bg-surface-raised border-b border-border text-textPrimary px-4 py-3"
        >
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-status-amber animate-pulse shrink-0" />
              <div>
                <p className="font-semibold text-textPrimary">
                  {!isOnline
                    ? t("supervisor.offlineBannerTitle")
                    : t("supervisor.offlineBannerSyncPending")}
                </p>
                <p className="text-textMuted text-[11px]">
                  {queuedCount > 0
                    ? t("supervisor.offlineBannerQueuedText", { count: queuedCount })
                    : t("supervisor.offlineBannerDisconnectedText")}
                </p>
              </div>
            </div>
            {isOnline && queuedCount > 0 && (
              <button
                type="button"
                onClick={handleSync}
                disabled={isSyncing}
                className="px-3 py-1.5 bg-accent text-white rounded-lg font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 focus-ring shrink-0 tap-target text-xs"
              >
                {isSyncing ? t("supervisor.syncingButton") : t("supervisor.syncNowButton")}
              </button>
            )}
          </div>
        </aside>
      )}

      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-5 space-y-4">
        <div>
          {greeting && (
            <p className="text-xs font-semibold text-accent mb-0.5 animate-in fade-in">
              {greeting}
            </p>
          )}
          <h1 className="text-xl sm:text-2xl font-extrabold text-textPrimary tracking-tight">
            {t("supervisor.title")}
          </h1>
          <p className="text-xs text-textMuted mt-1">
            {t("supervisor.subtitle")}
          </p>
        </div>

        {error && <ErrorBanner message={error} onRetry={fetchSupervisorOrders} />}

        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState message={t("supervisor.emptyNoOrders")} />
        ) : (
          <div className="space-y-3">
            {orders.map((o) => {
              const isQueued = queuedStageIds.has(o.orderStageId);
              const isSent = o.todayStatus === "sent";

              return (
                <Link
                  key={o.orderStageId}
                  href={`/s/${o.orderStageId}`}
                  className="block bg-surface border-2 border-border hover:border-accent rounded-xl p-4 sm:p-5 shadow-subtle hover:shadow-md transition-all active:scale-[0.99] focus-ring"
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div>
                      <span className="font-mono font-extrabold text-accent text-lg sm:text-xl tracking-tight">
                        {o.poNo}
                      </span>
                      <p className="text-xs font-semibold text-textPrimary mt-0.5">
                        {o.style}
                      </p>
                    </div>

                    {/* Status Badge */}
                    {isQueued ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-status-amber-bg text-status-amber border border-status-amber/25 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-status-amber" />
                        {t("supervisor.statusQueued")}
                      </span>
                    ) : isSent ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-status-green-bg text-status-green border border-status-green/25 shrink-0">
                        <span className="font-bold">✓</span>
                        {t("supervisor.statusSent")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-status-amber-bg text-status-amber border border-status-amber/25 shrink-0 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-status-amber" />
                        {t("supervisor.statusPending")}
                      </span>
                    )}
                  </div>

                  {/* Stage & Progress snapshot */}
                  <div className="my-2.5 p-3 bg-surface-raised rounded-lg border border-border flex items-center justify-between text-xs sm:text-sm">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-textMuted block">
                        {t("supervisor.cardStage")}
                      </span>
                      <strong className="text-sm font-bold text-textPrimary">
                        {translateStage(o.stage)}
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-textMuted block">
                        {t("supervisor.cardProgress")}
                      </span>
                      <span className="font-mono font-bold tabular-nums text-textPrimary text-sm">
                        {o.stageDone.toLocaleString()}
                      </span>
                      <span className="text-textMuted text-xs">
                        {" "}
                        / {o.targetQty.toLocaleString()} {t("common.pcs")}
                      </span>
                    </div>
                  </div>

                  {/* Remaining & Call to action */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-textMuted">
                      {t("supervisor.cardRemaining", { qty: o.remaining.toLocaleString() })}
                    </span>
                    <span className="text-accent font-bold text-xs inline-flex items-center gap-1">
                      <span>{t("supervisor.cardUpdateAction")}</span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
