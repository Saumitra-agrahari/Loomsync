"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { StatusChip } from "@/components/StatusChip";
import { SkeletonRow } from "@/components/Skeleton";
import { EmptyState, ErrorBanner } from "@/components/States";
import { getTimeOfDayGreeting } from "@/lib/ui/greeting";

function OrderBoardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<any>(null);
  const [locale, setLocale] = useState<"en" | "ta">("en");

  useEffect(() => {
    const match = document.cookie.match(/locale=(en|ta)/);
    if (match) setLocale(match[1] as "en" | "ta");
  }, []);
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
      // 1. Check current user
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

      // 2. Fetch filters & orders
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
        throw new Error("Failed to load production orders");
      }

      const ordersData = await ordersRes.json();
      const buyersData = await buyersRes.json();
      const unitsData = await unitsRes.json();

      setOrders(ordersData.orders || []);
      setSummary(ordersData.summary || { red: 0, amber: 0, green: 0, grey: 0, total: 0 });
      setBuyers(buyersData.buyers || []);
      setUnits(unitsData.units || []);
    } catch (err: any) {
      setError(err.message || "Could not load order board. Please check your network connection.");
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

  // Distinct ship weeks from orders
  const availableWeeks = Array.from(new Set(orders.map((o) => o.shipWeek))).sort();

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors">
      <Navbar currentUser={user} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-textPrimary">
              Production Order Board / உற்பத்தி பலகை
            </h1>
            <p className="text-xs sm:text-sm text-textSecondary mt-0.5">
              Live run-rate delay warnings and milestone tracking for Tiruppur knitwear lines
            </p>
          </div>
          <Link
            href="/orders/new"
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-accent-fg rounded-md text-xs sm:text-sm font-semibold transition-colors shadow-subtle tap-target inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span>+</span>
            <span>New Order Setup / புதிய ஆர்டர்</span>
          </Link>
        </div>

        {/* Quiet Summary Strip (PRD §4.3 & UIUX.md) */}
        <div className="bg-surface-raised border border-border rounded-lg p-3 sm:p-4 mb-5 shadow-subtle flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs sm:text-sm">
            <span className="text-textSecondary text-xs font-semibold uppercase tracking-wider mr-1">
              Status Mix:
            </span>

            {/* Red Chip Filter */}
            <button
              type="button"
              onClick={() => updateFilter("status", selectedStatus === "red" ? "" : "red")}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 tabular-nums focus-visible:ring-2 focus-visible:ring-status-red ${
                selectedStatus === "red"
                  ? "bg-status-red text-white border-status-red ring-2 ring-status-red/40"
                  : "bg-status-redLight text-status-redText border-status-red/30 hover:border-status-red"
              }`}
              title="Filter by Red (Critical Delay)"
            >
              <span className="w-2 h-2 rounded-full bg-status-red shrink-0" />
              <span>{summary.red} Critical Red</span>
            </button>

            {/* Amber Chip Filter */}
            <button
              type="button"
              onClick={() => updateFilter("status", selectedStatus === "amber" ? "" : "amber")}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 tabular-nums focus-visible:ring-2 focus-visible:ring-status-amber ${
                selectedStatus === "amber"
                  ? "bg-status-amber text-white border-status-amber ring-2 ring-status-amber/40"
                  : "bg-status-amberLight text-status-amberText border-status-amber/30 hover:border-status-amber"
              }`}
              title="Filter by Amber (Trailing)"
            >
              <span className="w-2 h-2 rounded-full bg-status-amber shrink-0" />
              <span>{summary.amber} Trailing Amber</span>
            </button>

            {/* Green Chip Filter */}
            <button
              type="button"
              onClick={() => updateFilter("status", selectedStatus === "green" ? "" : "green")}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 tabular-nums focus-visible:ring-2 focus-visible:ring-status-green ${
                selectedStatus === "green"
                  ? "bg-status-green text-white border-status-green ring-2 ring-status-green/40"
                  : "bg-status-greenLight text-status-greenText border-status-green/30 hover:border-status-green"
              }`}
              title="Filter by Green (On Track)"
            >
              <span className="w-2 h-2 rounded-full bg-status-green shrink-0" />
              <span>{summary.green} On Track Green</span>
            </button>

            {/* Grey Chip Filter */}
            {summary.grey > 0 && (
              <button
                type="button"
                onClick={() => updateFilter("status", selectedStatus === "grey" ? "" : "grey")}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 tabular-nums focus-visible:ring-2 focus-visible:ring-status-grey ${
                  selectedStatus === "grey"
                    ? "bg-status-grey text-white border-status-grey ring-2 ring-status-grey/40"
                    : "bg-status-greyLight text-status-greyText border-status-grey/30 hover:border-status-grey"
                }`}
                title="Filter by Grey (No recent data)"
              >
                <span>{summary.grey} Grey</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-textSecondary font-medium">
            <span>
              Total: <strong className="text-textPrimary tabular-nums">{summary.total}</strong> orders
            </span>
            <span className="text-[11px] text-textSecondary hidden sm:inline">(sorted worst-first)</span>
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
              <svg className="w-4 h-4 text-textSecondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filters / வடிகட்டிகள்</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-accent text-accent-fg text-[11px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <span>{mobileFiltersOpen ? "▲ Hide" : "▼ Show"}</span>
          </button>
        </div>

        {/* Filters Bar (Desktop visible, mobile collapsible) */}
        <div className={`${mobileFiltersOpen ? "block" : "hidden sm:grid"} grid-cols-2 sm:grid-cols-4 gap-3 mb-6 p-3 sm:p-0 bg-surface sm:bg-transparent rounded-lg border sm:border-0 border-border text-xs sm:text-sm`}>
          <div>
            <label className="block text-[11px] font-semibold text-textSecondary uppercase tracking-wider mb-1">
              Buyer / பையர்
            </label>
            <select
              value={selectedBuyer}
              onChange={(e) => updateFilter("buyer", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface-raised text-textPrimary focus:border-accent tap-target"
              aria-label="Filter by buyer"
            >
              <option value="">All Buyers</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-textSecondary uppercase tracking-wider mb-1">
              Unit / பிரிவு
            </label>
            <select
              value={selectedUnit}
              onChange={(e) => updateFilter("unit", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface-raised text-textPrimary focus:border-accent tap-target"
              aria-label="Filter by unit"
            >
              <option value="">All Units</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-textSecondary uppercase tracking-wider mb-1">
              Ship Week / ஏற்றுமதி வாரம்
            </label>
            <select
              value={selectedWeek}
              onChange={(e) => updateFilter("week", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface-raised text-textPrimary focus:border-accent tap-target"
              aria-label="Filter by ship week"
            >
              <option value="">All Weeks</option>
              {availableWeeks.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-textSecondary uppercase tracking-wider mb-1">
              Status / நிலை
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => updateFilter("status", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface-raised text-textPrimary focus:border-accent tap-target"
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              <option value="red">Red (Critical Delay)</option>
              <option value="amber">Amber (Trailing)</option>
              <option value="green">Green (On Track)</option>
              <option value="grey">Grey (No Recent Data)</option>
            </select>
          </div>

          {activeFilterCount > 0 && (
            <div className="col-span-2 sm:col-span-4 flex justify-end pt-1">
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
              >
                ✕ Clear all filters / வடிகட்டிகளை அகற்று
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
                ? "No critical delay orders at this time. All active orders are progressing."
                : selectedStatus === "amber"
                ? "No trailing orders at this time. Production run-rates are on target."
                : summary.total === 0
                ? "No orders need attention today. All 11 orders are on track."
                : "No orders match the selected filters. Clear filters to view all orders."
            }
            actionText={activeFilterCount > 0 ? (locale === "ta" ? "வடிகட்டிகளை அகற்று" : "Clear All Filters") : undefined}
            onAction={activeFilterCount > 0 ? clearAllFilters : undefined}
          />
        ) : (
          <div className="space-y-3">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden border border-border rounded-lg bg-surface-raised shadow-subtle">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-surface border-b border-border text-textSecondary uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">PO & Style</th>
                    <th className="py-3 px-4 font-semibold">Buyer</th>
                    <th className="py-3 px-4 font-semibold">Stage Progress</th>
                    <th className="py-3 px-4 font-semibold">Run-Rate Maths</th>
                    <th className="py-3 px-4 font-semibold">Ex-Factory</th>
                    <th className="py-3 px-4 font-semibold text-right">Status</th>
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
                          <span className="font-bold text-accent hover:underline">{o.poNo}</span>
                          <div className="text-xs text-textSecondary truncate max-w-xs">{o.style}</div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-textPrimary">{o.buyerName}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-between text-xs mb-1 font-medium">
                            <span className="text-textPrimary">{o.currentStage}</span>
                            <span className="text-textSecondary tabular-nums">
                              {o.stageDone.toLocaleString()} / {o.stageTargetQty.toLocaleString()} ({o.percentDone}%)
                            </span>
                          </div>
                          <div className="w-36 bg-surface border border-border/80 rounded-full h-1.5 overflow-hidden">
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
                            Need <span className="font-bold">{Math.round(o.runRate.requiredRate)}</span>/day · Making{" "}
                            <span
                              className={
                                isRed
                                  ? "text-status-red font-bold"
                                  : isAmber
                                  ? "text-status-amber font-semibold"
                                  : "text-status-green font-semibold"
                              }
                            >
                              {Math.round(o.runRate.actualRate)}
                            </span>
                            /day
                          </div>
                          {o.runRate.shortBy > 0 && (
                            <div className="text-xs text-status-red font-medium tabular-nums">
                              Short by {Math.round(o.runRate.shortBy)}/day ({o.runRate.slipDays}d slip)
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-textPrimary tabular-nums">{o.exFactoryDate}</span>
                          <div className="text-xs text-textSecondary">{o.shipWeek}</div>
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
                    className={`bg-surface-raised border border-border rounded-lg p-3.5 shadow-subtle active:bg-surface-hover transition-colors cursor-pointer ${
                      isRed
                        ? "border-l-4 border-l-status-red"
                        : isAmber
                        ? "border-l-4 border-l-status-amber/60"
                        : isGreen
                        ? "border-l-4 border-l-status-green/50"
                        : "border-l-4 border-l-status-grey/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="font-bold text-accent text-base">{o.poNo}</span>
                        <p className="text-xs text-textSecondary">{o.style}</p>
                      </div>
                      <StatusChip status={o.runRate.status} size="sm" />
                    </div>

                    <div className="my-2.5 p-2.5 bg-surface rounded-md border border-border text-xs tabular-nums">
                      <p className="font-semibold text-textPrimary">
                        Need {Math.round(o.runRate.requiredRate)}/day · Making {Math.round(o.runRate.actualRate)}/day
                      </p>
                      {o.runRate.shortBy > 0 && (
                        <p className="text-status-red font-medium mt-0.5">
                          Short by {Math.round(o.runRate.shortBy)}/day ({o.runRate.slipDays}d slip)
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-textSecondary">Buyer:</span>
                        <span className="font-medium text-textPrimary">{o.buyerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-textSecondary">Stage ({o.currentStage}):</span>
                        <span className="font-medium text-textPrimary tabular-nums">
                          {o.stageDone.toLocaleString()} / {o.stageTargetQty.toLocaleString()} ({o.percentDone}%)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-textSecondary">Ex-Factory:</span>
                        <span className="font-medium text-textPrimary tabular-nums">
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
