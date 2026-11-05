import React from "react";

interface EmptyStateProps {
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({ message, actionText, onAction }: EmptyStateProps) {
  return (
    <div className="py-12 px-4 text-center border-2 border-dashed border-border rounded-lg bg-surface">
      <svg
        className="w-12 h-12 mx-auto text-textSecondary/50 mb-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
      <p className="text-textSecondary text-sm sm:text-base font-medium mb-3">{message}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 bg-accent text-white rounded-md text-sm font-medium hover:bg-accent-hover transition-colors tap-target"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm font-medium">{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1 bg-white border border-rose-300 text-rose-800 text-xs font-semibold rounded hover:bg-rose-100 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

interface OfflineBannerProps {
  queuedCount?: number;
  onSync?: () => void;
  isSyncing?: boolean;
}

export function OfflineBanner({ queuedCount = 0, onSync, isSyncing = false }: OfflineBannerProps) {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs sm:text-sm text-amber-900 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829M12 12l.01.01" />
        </svg>
        <span>Saved on phone — will send when network returns</span>
        {queuedCount > 0 && (
          <span className="bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded text-xs">
            {queuedCount} queued
          </span>
        )}
      </div>
      {onSync && (
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="text-xs bg-amber-200 hover:bg-amber-300 px-2.5 py-1 rounded font-semibold text-amber-900 disabled:opacity-50"
        >
          {isSyncing ? "Syncing..." : "Sync now"}
        </button>
      )}
    </div>
  );
}
