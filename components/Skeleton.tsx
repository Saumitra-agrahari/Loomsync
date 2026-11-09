import React from "react";

export function SkeletonRow({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 animate-pulse" role="status" aria-label="Loading content">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-16 bg-surface-raised border border-border rounded-lg" />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div
      className="p-4 border border-border rounded-lg bg-surface-raised animate-pulse space-y-3"
      role="status"
      aria-label="Loading content"
    >
      <div className="h-4 bg-border/60 rounded w-1/3" />
      <div className="h-6 bg-border/60 rounded w-2/3" />
      <div className="h-4 bg-border/60 rounded w-1/2" />
    </div>
  );
}
