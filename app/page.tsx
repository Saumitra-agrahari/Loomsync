"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { StatusChip } from "@/components/StatusChip";
import { SkeletonRow } from "@/components/Skeleton";
import { EmptyState, ErrorBanner } from "@/components/States";

function OrderBoardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ red: 0, amber: 0, green: 0, grey: 0, total: 0 });
  const [buyers, setBuyers] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters from URL
  const selectedBuyer = searchParams.get("buyer") || "";
  const selectedUnit = searchParams.get("unit") || "";
  const selectedWeek = searchParams.get("week") || "";
  const selectedStatus = searchParams.get("status") || "";

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
        throw new Error("Failed to load orders");
      }

      const ordersData = await ordersRes.json();
      const buyersData = await buyersRes.json();
      const unitsData = await unitsRes.json();

      setOrders(ordersData.orders || []);
      setSummary(ordersData.summary || { red: 0, amber: 0, green: 0, grey: 0, total: 0 });
      setBuyers(buyersData.buyers || []);
      setUnits(unitsData.units || []);
    } catch (err: any) {
      setError(err.message || "Could not load order board");
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

  // Distinct ship weeks from orders
  const availableWeeks = Array.from(new Set(orders.map((o) => o.shipWeek))).sort();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar currentUser={user} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-textPrimary">Production Order Board</h1>
            <p className="text-xs sm:text-sm text-textSecondary">
              Real-time run-rate monitoring and early delay detection for factory lines
            </p>
          </div>
          <Link
            href="/orders/new"
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-sm font-medium transition-colors tap-target inline-flex items-center justify-center"
          >
            + New Order Setup
          </Link>
        </div>

        {/* Summary Strip (PRD §4.3 & UIUX.md §Screen 2) */}
        <div className="bg-surface border border-border rounded-lg p-3 sm:p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm font-medium">
            <span className="text-textSecondary">Status Mix:</span>
            <button
              onClick={() => updateFilter("status", selectedStatus === "red" ? "" : "red")}
              className={`px-2.5 py-1 rounded-full border text-xs font-bold transition-all ${
                selectedStatus === "red"
                  ? "bg-rose-600 text-white border-rose-600 ring-2 ring-rose-300"
                  : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
              }`}
            >
              ● {summary.red} Red
            </button>
            <button
              onClick={() => updateFilter("status", selectedStatus === "amber" ? "" : "amber")}
              className={`px-2.5 py-1 rounded-full border text-xs font-bold transition-all ${
                selectedStatus === "amber"
                  ? "bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300"
                  : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
              }`}
            >
              ● {summary.amber} Amber
            </button>
            <button
              onClick={() => updateFilter("status", selectedStatus === "green" ? "" : "green")}
              className={`px-2.5 py-1 rounded-full border text-xs font-bold transition-all ${
                selectedStatus === "green"
                  ? "bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-300"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              ● {summary.green} Green
            </button>
            {summary.grey > 0 && (
              <span className="text-xs text-textSecondary">({summary.grey} grey)</span>
            )}
          </div>
          <span className="text-xs text-textSecondary font-medium">
            Total Open: <strong>{summary.total}</strong> orders (sorted worst-first)
          </span>
        </div>

        {/* Filters Bar (PRD §4.3) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5 text-xs sm:text-sm">
          <div>
            <label className="block text-[11px] font-semibold text-textSecondary uppercase tracking-wider mb-1">
              Buyer
            </label>
            <select
              value={selectedBuyer}
              onChange={(e) => updateFilter("buyer", e.target.value)}
              className="w-full px-2.5 py-1.5 border border-border rounded bg-white text-textPrimary tap-target"
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
              Unit
            </label>
            <select
              value={selectedUnit}
              onChange={(e) => updateFilter("unit", e.target.value)}
              className="w-full px-2.5 py-1.5 border border-border rounded bg-white text-textPrimary tap-target"
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
              Ship Week
            </label>
            <select
              value={selectedWeek}
              onChange={(e) => updateFilter("week", e.target.value)}
              className="w-full px-2.5 py-1.5 border border-border rounded bg-white text-textPrimary tap-target"
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
              Status Filter
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => updateFilter("status", e.target.value)}
              className="w-full px-2.5 py-1.5 border border-border rounded bg-white text-textPrimary tap-target"
            >
              <option value="">All Statuses</option>
              <option value="red">Red (Critical Delay)</option>
              <option value="amber">Amber (Trailing)</option>
              <option value="green">Green (On Track)</option>
              <option value="grey">Grey (No Recent Data)</option>
            </select>
          </div>
        </div>

        {/* Board Content */}
        {error && <ErrorBanner message={error} onRetry={fetchBoardData} />}

        {loading ? (
          <SkeletonRow count={5} />
        ) : orders.length === 0 ? (
          <EmptyState
            message="No orders match the selected filters."
            actionText="Clear Filters"
            onAction={() => router.push("/")}
          />
        ) : (
          <div className="space-y-3">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto border border-border rounded-lg bg-white shadow-sm">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-surface border-b border-border text-textSecondary uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">PO & Style</th>
                    <th className="py-3 px-4">Buyer</th>
                    <th className="py-3 px-4">Stage Progress</th>
                    <th className="py-3 px-4">Run-Rate Maths</th>
                    <th className="py-3 px-4">Ex-Factory</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => router.push(`/orders/${o.id}`)}
                      className="hover:bg-surface/60 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-accent hover:underline">{o.poNo}</span>
                        <div className="text-xs text-textSecondary truncate max-w-xs">{o.style}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-textPrimary">{o.buyerName}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-between text-xs mb-1 font-medium">
                          <span>{o.currentStage}</span>
                          <span className="text-textSecondary">
                            {o.stageDone.toLocaleString()}/{o.stageTargetQty.toLocaleString()} ({o.percentDone}%)
                          </span>
                        </div>
                        <div className="w-40 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${
                              o.runRate.status === "red"
                                ? "bg-rose-600"
                                : o.runRate.status === "amber"
                                ? "bg-amber-500"
                                : "bg-emerald-600"
                            }`}
                            style={{ width: `${o.percentDone}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-textPrimary">
                          Need {Math.round(o.runRate.requiredRate)}/day · Making{" "}
                          <span
                            className={
                              o.runRate.status === "red"
                                ? "text-rose-700 font-bold"
                                : o.runRate.status === "amber"
                                ? "text-amber-700 font-semibold"
                                : "text-emerald-700 font-semibold"
                            }
                          >
                            {Math.round(o.runRate.actualRate)}
                          </span>
                          /day
                        </div>
                        {o.runRate.shortBy > 0 && (
                          <div className="text-xs text-rose-700 font-medium">
                            Short by {Math.round(o.runRate.shortBy)}/day ({o.runRate.slipDays}d slip)
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-textPrimary">{o.exFactoryDate}</span>
                        <div className="text-xs text-textSecondary">{o.shipWeek}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <StatusChip status={o.runRate.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Stack (Works at 360 px width!) */}
            <div className="md:hidden space-y-3">
              {orders.map((o) => (
                <div
                  key={o.id}
                  onClick={() => router.push(`/orders/${o.id}`)}
                  className="bg-white border border-border rounded-lg p-3.5 shadow-sm active:bg-surface transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="font-bold text-accent text-base">{o.poNo}</span>
                      <p className="text-xs text-textSecondary">{o.style}</p>
                    </div>
                    <StatusChip status={o.runRate.status} size="sm" />
                  </div>

                  <div className="my-2.5 p-2 bg-surface rounded text-xs border border-border">
                    <p className="font-semibold text-textPrimary">
                      Need {Math.round(o.runRate.requiredRate)}/day · Making {Math.round(o.runRate.actualRate)}/day
                    </p>
                    {o.runRate.shortBy > 0 && (
                      <p className="text-rose-700 font-medium mt-0.5">
                        Short by {Math.round(o.runRate.shortBy)}/day (Slip: +{o.runRate.slipDays} days)
                      </p>
                    )}
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Buyer:</span>
                      <span className="font-medium">{o.buyerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Stage ({o.currentStage}):</span>
                      <span className="font-medium">
                        {o.stageDone.toLocaleString()}/{o.stageTargetQty.toLocaleString()} ({o.percentDone}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Ex-Factory:</span>
                      <span className="font-medium">{o.exFactoryDate} ({o.shipWeek})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function OrderBoardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><SkeletonRow count={4} /></div>}>
      <OrderBoardContent />
    </Suspense>
  );
}

