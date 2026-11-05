"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { SkeletonRow } from "@/components/Skeleton";
import { EmptyState, ErrorBanner } from "@/components/States";

function BuyerPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [buyer, setBuyer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-textPrimary">
                {buyer?.name || "Buyer"} Sourcing Portal
              </h1>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                Verified Read-Only
              </span>
            </div>
            <p className="text-xs sm:text-sm text-textSecondary mt-0.5">
              Live factory milestone tracker and certified shipping schedules
            </p>
          </div>

          <button
            type="button"
            onClick={downloadExcel}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-xs sm:text-sm font-semibold transition-colors tap-target inline-flex items-center gap-2"
          >
            <span>📊</span>
            <span>Download Weekly Excel</span>
          </button>
        </div>

        {error && <ErrorBanner message={error} onRetry={fetchBuyerData} />}

        {loading ? (
          <SkeletonRow count={4} />
        ) : orders.length === 0 ? (
          <EmptyState message="No orders currently on the schedule for your account." />
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Link
                key={o.id}
                href={`/b/${o.id}${token ? `?token=${encodeURIComponent(token)}` : ""}`}
                className="block bg-white border border-border rounded-lg p-4 sm:p-5 shadow-sm hover:border-accent transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-lg font-bold text-accent">{o.poNo}</span>
                    <h3 className="text-sm sm:text-base font-semibold text-textPrimary">{o.style}</h3>
                  </div>

                  {o.hasDelayWarning ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      ⚠️ Factory Delay Notice
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ✓ On Schedule
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3 p-3 bg-surface rounded text-xs sm:text-sm border border-border">
                  <div>
                    <span className="text-textSecondary block text-[11px]">Total Quantity</span>
                    <strong className="text-textPrimary text-sm sm:text-base">
                      {o.totalQty.toLocaleString()} pcs
                    </strong>
                  </div>
                  <div>
                    <span className="text-textSecondary block text-[11px]">Current Stage</span>
                    <strong className="text-textPrimary text-sm sm:text-base">{o.currentStage}</strong>
                  </div>
                  <div>
                    <span className="text-textSecondary block text-[11px]">Stage Progress</span>
                    <strong className="text-textPrimary text-sm sm:text-base">{o.percentDone}%</strong>
                  </div>
                  <div>
                    <span className="text-textSecondary block text-[11px]">Ex-Factory Date</span>
                    <strong className="text-textPrimary text-sm sm:text-base">{o.exFactoryDate}</strong>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold text-accent hover:underline">
                    View Milestones & Photos →
                  </span>
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
    <Suspense fallback={<div className="p-8 text-center"><SkeletonRow count={4} /></div>}>
      <BuyerPortalContent />
    </Suspense>
  );
}

