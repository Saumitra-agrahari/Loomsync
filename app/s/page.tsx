"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { SkeletonCard } from "@/components/Skeleton";
import { EmptyState, ErrorBanner, OfflineBanner } from "@/components/States";
import { getQueuedUpdates, syncOutbox } from "@/lib/offline/db";

export default function SupervisorHomePage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const fetchSupervisorOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const meRes = await fetch("/api/me");
      if (!meRes.ok) {
        router.push("/login");
        return;
      }

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
  };

  useEffect(() => {
    fetchSupervisorOrders();
    checkOutbox();

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
    <div className="min-h-screen bg-surface flex flex-col">
      <Navbar />

      {/* Offline Banner */}
      {(!isOnline || queuedCount > 0) && (
        <OfflineBanner
          queuedCount={queuedCount}
          onSync={handleSync}
          isSyncing={isSyncing}
        />
      )}

      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-5">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-bold text-textPrimary">
              மேற்பார்வையாளர் பக்கம் / Supervisor Portal
            </h1>
          </div>
          <p className="text-xs text-textSecondary mt-1">
            இன்றைய உற்பத்தியை பதிவு செய்யவும் / Enter today&apos;s production count
          </p>
        </div>

        {error && <ErrorBanner message={error} onRetry={fetchSupervisorOrders} />}

        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState message="உங்கள் பிரிவிற்கு ஒதுக்கப்பட்ட ஆர்டர்கள் எதுவும் இல்லை / No orders assigned to your unit." />
        ) : (
          <div className="space-y-3.5">
            {orders.map((o) => (
              <Link
                key={o.orderStageId}
                href={`/s/${o.orderStageId}`}
                className="block bg-white border border-border rounded-lg p-4 shadow-sm hover:border-accent active:bg-surfaceHover transition-colors tap-target"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-bold text-accent text-lg">{o.poNo}</span>
                    <p className="text-xs text-textSecondary font-medium">{o.style}</p>
                  </div>

                  {o.todayStatus === "sent" ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ✓ Sent / அனுப்பப்பட்டது
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      ● Pending / நிலுவை
                    </span>
                  )}
                </div>

                <div className="my-2 p-2.5 bg-surface rounded border border-border flex items-center justify-between text-xs sm:text-sm">
                  <div>
                    <span className="text-textSecondary block text-[11px]">நிலை / Stage</span>
                    <strong className="text-textPrimary text-sm">{o.stage}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-textSecondary block text-[11px]">முன்னேற்றம் / Progress</span>
                    <strong className="text-textPrimary text-sm">
                      {o.stageDone.toLocaleString()} / {o.targetQty.toLocaleString()} pcs
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-textSecondary pt-1">
                  <span>மீதமுள்ள அளவு: <strong>{o.remaining.toLocaleString()} pcs</strong></span>
                  <span className="text-accent font-bold">பதிவு செய் / Update →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
