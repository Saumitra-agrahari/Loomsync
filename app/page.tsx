"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { StatusChip } from "@/components/StatusChip";
import { SkeletonRow } from "@/components/Skeleton";
import { EmptyState, ErrorBanner } from "@/components/States";
import { useI18n } from "@/lib/i18n";
import { getTimeOfDayGreeting } from "@/lib/ui/greeting";

function OrderBoardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale, translateStage } = useI18n();

  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ red: 0, amber: 0, green: 0, grey: 0, total: 0 });
  const [buyers, setBuyers] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filters from URL
  const selectedBuyer = searchParams.get("buyer") || "";
  const selectedUnit = searchParams.get("unit") || "";
  const selectedWeek = searchParams.get("week") || "";
  const selectedStatus = searchParams.get("status") || "";

  const activeFilterCount = [selectedBuyer, selectedUnit, selectedWeek, selectedStatus].filter(Boolean).length;
  const greeting = getTimeOfDayGreeting(user?.name, locale);

  const fetchBoardData = async () => {
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

      if (meData.user.role === "supervisor") {
        router.push("/s");
        return;
      }
      if (meData.user.role === "buyer") {
        router.push("/b");
        return;
      }

      const queryParams = new URLSearchParams();
      if (selectedBuyer) queryParams.set("buyer", selectedBuyer);
      if (selectedUnit) queryParams.set("unit", selectedUnit);
      if (selectedWeek) queryParams.set("week", selectedWeek);
      if (selectedStatus) queryParams.set("status", selectedStatus);

      const [ordersRes, buyersRes, unitsRes] = await Promise.all([
        fetch(`/api/orders?${queryParams.toString()}`),
        fetch("/api/buyers"),
        fetch("/api/units"),
      ]);

      if (!ordersRes.ok) {
        throw new Error(t("errors.networkError"));
      }

      const ordersData = await ordersRes.json();
      const buyersData = await buyersRes.json();
      const unitsData = await unitsRes.json();

      setOrders(ordersData.orders || []);
      setSummary(ordersData.summary || { red: 0, amber: 0, green: 0, grey: 0, total: 0 });
      setBuyers(buyersData.buyers || []);
      setUnits(unitsData.units || []);
    } catch (err: any) {
      setError(err.message || t("errors.networkError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardData();
  }, [selectedBuyer, selectedUnit, selectedWeek, selectedStatus]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/?${params.toString()}`);
  };

  const clearAllFilters = () => {
    router.push("/");
  };

  const availableWeeks = Array.from(new Set(orders.map((o) => o.shipWeek))).sort();

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors text-textPrimary">
      <Navbar currentUser={user} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            {greeting && (
              <p className="text-xs font-semibold text-accent mb-0.5 animate-in fade-in">
                {greeting}
              </p>
            )}
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-textPrimary">
              {t("board.title")}
            </h1>
            <p className="text-xs sm:text-sm text-textMuted mt-0.5">
              {t("board.subtitle")}
            </p>
          </div>
          <Link
            href="/orders/new"
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-subtle tap-target inline-flex items-center gap-1.5 focus-ring"
          >
            <span>+</span>
            <span>{t("nav.newOrder")}</span>
          </Link>
        </div>

        {/* Quiet Summary Strip */}
        <div className="bg-surface border border-border rounded-lg p-3 sm:p-4 mb-5 shadow-subtle flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs sm:text-sm">
            <span className="text-textMuted text-xs font-semibold uppercase tracking-wider mr-1">
              {t("common.status")}:
            </span>

            {/* Red Chip Filter */}
            <button
              type="button"
              onClick={() => updateFilter("status", selectedStatus === "red" ? "" : "red")}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 tabular-nums focus-ring ${
                selectedStatus === "red"
                  ? "bg-status-red text-white border-status-red ring-2 ring-status-red/40"
                  : "bg-status-red-bg text-status-red border-status-red/30 hover:border-status-red"
              }`}
              title={t("board.summaryRed", { count: summary.red })}
            >
              <span className="w-2 h-2 rounded-full bg-status-red shrink-0" />
              <span>{t("board.summaryRed", { count: summary.red })}</span>
            </button>

            {/* Amber Chip Filter */}
            <button
              type="button"
              onClick={() => updateFilter("status", selectedStatus === "amber" ? "" : "amber")}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 tabular-nums focus-ring ${
                selectedStatus === "amber"
                  ? "bg-status-amber text-white border-status-amber ring-2 ring-status-amber/40"
                  : "bg-status-amber-bg text-status-amber border-status-amber/30 hover:border-status-amber"
              }`}
              title={t("board.summaryAmber", { count: summary.amber })}
            >
              <span className="w-2 h-2 rounded-full bg-status-amber shrink-0" />
              <span>{t("board.summaryAmber", { count: summary.amber })}</span>
            </button>

            {/* Green Chip Filter */}
            <button
              type="button"
              onClick={() => updateFilter("status", selectedStatus === "green" ? "" : "green")}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 tabular-nums focus-ring ${
                selectedStatus === "green"
                  ? "bg-status-green text-white border-status-green ring-2 ring-status-green/40"
                  : "bg-status-green-bg text-status-green border-status-green/30 hover:border-status-green"
              }`}
              title={t("board.summaryGreen", { count: summary.green })}
            >
              <span className="w-2 h-2 rounded-full bg-status-green shrink-0" />
              <span>{t("board.summaryGreen", { count: summary.green })}</span>
            </button>

            {/* Grey Chip Filter */}
            {summary.grey > 0 && (
              <button
                type="button"
                onClick={() => updateFilter("status", selectedStatus === "grey" ? "" : "grey")}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 tabular-nums focus-ring ${
                  selectedStatus === "grey"
                    ? "bg-status-grey text-white border-status-grey ring-2 ring-status-grey/40"
                    : "bg-surface-raised text-textMuted border-border hover:border-textMuted"
                }`}
                title={t("board.summaryGrey", { count: summary.grey })}
              >
                <span>{t("board.summaryGrey", { count: summary.grey })}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-textMuted font-medium">
            <span>
              <strong className="text-textPrimary tabular-nums">
                {t("board.totalOrders", { count: summary.total })}
              </strong>
            </span>
            <span className="text-[11px] text-textMuted hidden sm:inline">
              {t("board.sortedWorstFirst")}
            </span>
          </div>
        </div>

        {/* Mobile Filter Toggle Button (under 640px) */}
        <div className="sm:hidden mb-4">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((prev) => !prev)}
            className="w-full py-2.5 px-3 bg-surface border border-border rounded-lg text-xs font-semibold flex items-center justify-between text-textPrimary tap-target"
            aria-expanded={mobileFiltersOpen}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-textMuted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>{t("board.filtersLabel")}</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <span>{mobileFiltersOpen ? t("board.filterToggleHide") : t("board.filterToggleShow")}</span>
          </button>
        </div>

        {/* Filters Bar (Desktop visible, mobile collapsible) */}
        <div className={`${mobileFiltersOpen ? "block" : "hidden sm:grid"} grid-cols-2 sm:grid-cols-4 gap-3 mb-6 p-3 sm:p-0 bg-surface sm:bg-transparent rounded-lg border sm:border-0 border-border text-xs sm:text-sm`}>
          <div>
            <label className="block text-[11px] font-semibold text-textMuted uppercase tracking-wider mb-1">
              {t("board.filterBuyer")}
            </label>
            <select
              value={selectedBuyer}
              onChange={(e) => updateFilter("buyer", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-textPrimary focus-ring tap-target"
              aria-label={t("board.filterBuyer")}
            >
              <option value="">{t("board.allBuyers")}</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-textMuted uppercase tracking-wider mb-1">
              {t("board.filterUnit")}
            </label>
            <select
              value={selectedUnit}
              onChange={(e) => updateFilter("unit", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-textPrimary focus-ring tap-target"
              aria-label={t("board.filterUnit")}
            >
              <option value="">{t("board.allUnits")}</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-textMuted uppercase tracking-wider mb-1">
              {t("board.filterWeek")}
            </label>
            <select
              value={selectedWeek}
              onChange={(e) => updateFilter("week", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-textPrimary focus-ring tap-target"
              aria-label={t("board.filterWeek")}
            >
              <option value="">{t("board.allWeeks")}</option>
              {availableWeeks.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-textMuted uppercase tracking-wider mb-1">
              {t("board.filterStatus")}
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => updateFilter("status", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-textPrimary focus-ring tap-target"
              aria-label={t("board.filterStatus")}
            >
              <option value="">{t("board.allStatuses")}</option>
              <option value="red">{t("status.criticalDelay")}</option>
              <option value="amber">{t("status.trailing")}</option>
              <option value="green">{t("status.onTrack")}</option>
              <option value="grey">{t("status.noRecentData")}</option>
            </select>
          </div>

          {activeFilterCount > 0 && (
            <div className="col-span-2 sm:col-span-4 flex justify-end pt-1">
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 focus-ring rounded p-1"
              >
                ✕ {t("board.clearAllFilters")}
              </button>
            </div>
          )}
        </div>

        {/* Board Content */}
        {error && <ErrorBanner message={error} onRetry={fetchBoardData} />}

        {loading ? (
          <SkeletonRow count={5} />
        ) : orders.length === 0 ? (
          <EmptyState
            message={
              selectedStatus === "red"
                ? t("board.emptyRed")
                : selectedStatus === "amber"
                ? t("board.emptyAmber")
                : summary.total === 0
                ? t("board.emptyAllOnTrack")
                : t("board.emptyFiltered")
            }
            actionText={activeFilterCount > 0 ? t("board.clearAllFilters") : undefined}
            onAction={activeFilterCount > 0 ? clearAllFilters : undefined}
          />
        ) : (
          <div className="space-y-3">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden border border-border rounded-lg bg-surface shadow-subtle">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-surface-raised border-b border-border text-textMuted uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">{t("board.tablePoAndStyle")}</th>
                    <th className="py-3 px-4 font-semibold">{t("board.tableBuyer")}</th>
                    <th className="py-3 px-4 font-semibold">{t("board.tableStageProgress")}</th>
                    <th className="py-3 px-4 font-semibold">{t("board.tableRunRateMaths")}</th>
                    <th className="py-3 px-4 font-semibold">{t("board.tableExFactory")}</th>
                    <th className="py-3 px-4 font-semibold text-right">{t("board.tableStatus")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((o) => {
                    const isRed = o.runRate.status === "red";
                    const isAmber = o.runRate.status === "amber";
                    const isGreen = o.runRate.status === "green";

                    return (
                      <tr
                        key={o.id}
                        onClick={() => router.push(`/orders/${o.id}`)}
                        className={`hover:bg-surface-hover cursor-pointer transition-colors ${
                          isRed
                            ? "border-l-4 border-l-status-red"
                            : isAmber
                            ? "border-l-4 border-l-status-amber/60"
                            : isGreen
                            ? "border-l-4 border-l-status-green/50"
                            : "border-l-4 border-l-status-grey/40"
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-accent hover:underline font-mono">{o.poNo}</span>
                          <div className="text-xs text-textMuted truncate max-w-xs">{o.style}</div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-textPrimary">{o.buyerName}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-between text-xs mb-1 font-medium">
                            <span className="text-textPrimary">{translateStage(o.currentStage)}</span>
                            <span className="text-textMuted tabular-nums">
                              {o.stageDone.toLocaleString()} / {o.stageTargetQty.toLocaleString()} ({o.percentDone}%)
                            </span>
                          </div>
                          <div className="w-36 bg-surface-raised border border-border/80 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                isRed
                                  ? "bg-status-red"
                                  : isAmber
                                  ? "bg-status-amber"
                                  : "bg-status-green"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, o.percentDone))}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-textPrimary tabular-nums">
                            {t("runrate.needVsMaking", {
                              need: Math.round(o.runRate.requiredRate || o.runRate.required_rate),
                              making: Math.round(o.runRate.actualRate || o.runRate.actual_rate),
                            })}
                          </div>
                          {o.runRate.shortBy > 0 && (
                            <div className="text-xs text-status-red font-medium tabular-nums">
                              {t("runrate.shortBy", { short: Math.round(o.runRate.shortBy) })} ({o.runRate.slipDays}d {t("runrate.slipSuffix")})
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-textPrimary tabular-nums font-mono">{o.exFactoryDate}</span>
                          <div className="text-xs text-textMuted">{o.shipWeek}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <StatusChip status={o.runRate.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Stack (Responsive 360px layout) */}
            <div className="md:hidden space-y-3">
              {orders.map((o) => {
                const isRed = o.runRate.status === "red";
                const isAmber = o.runRate.status === "amber";
                const isGreen = o.runRate.status === "green";

                return (
                  <div
                    key={o.id}
                    onClick={() => router.push(`/orders/${o.id}`)}
                    className={`bg-surface border rounded-lg p-4 shadow-subtle hover:border-accent cursor-pointer transition-all active:scale-[0.99] ${
                      isRed
                        ? "border-l-4 border-l-status-red"
                        : isAmber
                        ? "border-l-4 border-l-status-amber/60"
                        : isGreen
                        ? "border-l-4 border-l-status-green/50"
                        : "border-l-4 border-l-status-grey/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-border">
                      <div>
                        <span className="font-bold font-mono text-accent text-base">{o.poNo}</span>
                        <div className="text-xs text-textMuted truncate max-w-[200px]">{o.style}</div>
                      </div>
                      <StatusChip status={o.runRate.status} size="sm" />
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-textMuted">{t("board.cardBuyer")}:</span>
                        <span className="font-medium text-textPrimary">{o.buyerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-textMuted">
                          {t("board.cardStage")} ({translateStage(o.currentStage)}):
                        </span>
                        <span className="font-medium text-textPrimary tabular-nums">
                          {o.stageDone.toLocaleString()} / {o.stageTargetQty.toLocaleString()} ({o.percentDone}%)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-textMuted">{t("board.cardExFactory")}:</span>
                        <span className="font-medium text-textPrimary tabular-nums font-mono">
                          {o.exFactoryDate} ({o.shipWeek})
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function OrderBoardPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto p-8">
          <SkeletonRow count={4} />
        </div>
      }
    >
      <OrderBoardContent />
    </Suspense>
  );
}
