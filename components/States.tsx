import React from "react";

interface EmptyStateProps {
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({ message, actionText, onAction }: EmptyStateProps) {
  return (
    <div className="py-12 px-4 text-center border border-dashed border-border rounded-lg bg-surface transition-colors">
      <svg
        className="w-12 h-12 mx-auto text-textSecondary/50 mb-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
      <p className="text-textSecondary text-sm sm:text-base font-medium mb-4 max-w-sm mx-auto">{message}</p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 bg-accent hover:bg-accent-hover text-accent-fg rounded-md text-sm font-semibold transition-colors tap-target shadow-subtle focus-visible:ring-2 focus-visible:ring-accent"
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
    <div
      role="alert"
      className="p-4 bg-status-redLight border border-status-red/30 rounded-lg text-status-redText flex items-center justify-between gap-3 shadow-subtle"
    >
      <div className="flex items-center gap-2.5">
        <svg className="w-5 h-5 text-status-red shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs sm:text-sm font-medium">{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1.5 bg-surface-raised border border-status-red/40 text-status-redText text-xs font-bold rounded-md hover:bg-status-redLight transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-status-red"
        >
          Retry / மீண்டும் செய்
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
    <div
      role="status"
      aria-live="polite"
      className="bg-status-amberLight border-b border-status-amber/30 px-4 py-2.5 text-xs sm:text-sm text-status-amberText flex flex-wrap items-center justify-between gap-2 transition-colors"
    >
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-status-amber shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829M12 12l.01.01"
          />
        </svg>
        <span>Saved on phone — will send when network returns</span>
        {queuedCount > 0 && (
          <span className="bg-status-amber text-accent-fg font-bold px-2 py-0.5 rounded-full text-xs tabular-nums">
            {queuedCount} queued
          </span>
        )}
      </div>
      {onSync && (
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing}
          className="text-xs bg-surface-raised border border-status-amber/40 hover:bg-surface text-status-amberText px-3 py-1 rounded-md font-semibold disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-status-amber"
        >
          {isSyncing ? "Syncing..." : "Sync now"}
        </button>
      )}
    </div>
  );
}
