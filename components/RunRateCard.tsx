import React from "react";
import { StatusChip } from "./StatusChip";

interface RunRateCardProps {
  stage: string;
  remaining: number;
  daysAvailable: number;
  requiredRate: number;
  actualRate: number;
  ratio: number;
  status: "green" | "amber" | "red" | "grey";
  statusReason?: string;
  projectedFinish: string;
  slipDays: number;
}

export function RunRateCard({
  stage,
  remaining,
  daysAvailable,
  requiredRate,
  actualRate,
  ratio,
  status,
  statusReason,
  projectedFinish,
  slipDays,
}: RunRateCardProps) {
  const shortBy = Math.max(0, Math.round((requiredRate - actualRate) * 100) / 100);

  return (
    <div className="bg-surface border border-border rounded-lg p-4 sm:p-6 shadow-subtle transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-textSecondary font-semibold">
            Stage Run-Rate Engine / வேக கணக்கீடு
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-textPrimary">{stage} Stage</h2>
        </div>
        <StatusChip status={status} />
      </div>

      {/* The Maths in Big Numbers (Need / Making / Short by) */}
      <div className="my-4 p-4 bg-surface-raised border border-border rounded-lg shadow-subtle">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
          {/* Need */}
          <div className="border-b sm:border-b-0 sm:border-r border-border pb-3 sm:pb-0 sm:pr-4">
            <span className="text-xs uppercase tracking-wider font-semibold text-textSecondary block mb-1">
              Need / தேவை
            </span>
            <div className="flex items-baseline justify-center sm:justify-start gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-accent tabular-nums">
                {Math.round(requiredRate).toLocaleString()}
              </span>
              <span className="text-xs text-textSecondary font-medium">/ day</span>
            </div>
          </div>

          {/* Making */}
          <div className="border-b sm:border-b-0 sm:border-r border-border pb-3 sm:pb-0 sm:pr-4">
            <span className="text-xs uppercase tracking-wider font-semibold text-textSecondary block mb-1">
              Making / உற்பத்தி
            </span>
            <div className="flex items-baseline justify-center sm:justify-start gap-1">
              <span
                className={`text-2xl sm:text-3xl font-extrabold tabular-nums ${
                  status === "red"
                    ? "text-status-red"
                    : status === "amber"
                    ? "text-status-amber"
                    : "text-status-green"
                }`}
              >
                {Math.round(actualRate).toLocaleString()}
              </span>
              <span className="text-xs text-textSecondary font-medium">/ day</span>
            </div>
          </div>

          {/* Short by */}
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-textSecondary block mb-1">
              {shortBy > 0 ? "Short by / பற்றாக்குறை" : "Status / நிலை"}
            </span>
            <div className="flex items-baseline justify-center sm:justify-start gap-1">
              {shortBy > 0 ? (
                <>
                  <span className="text-2xl sm:text-3xl font-extrabold text-status-red tabular-nums">
                    {Math.round(shortBy).toLocaleString()}
                  </span>
                  <span className="text-xs text-status-red font-medium">/ day ({slipDays}d slip)</span>
                </>
              ) : (
                <span className="text-xl sm:text-2xl font-bold text-status-green">
                  On Pace ({slipDays <= 0 ? "0d slip" : `+${slipDays}d`})
                </span>
              )}
            </div>
          </div>
        </div>

        {statusReason && (
          <p className="text-xs text-textSecondary mt-3 pt-3 border-t border-border">
            {statusReason}
          </p>
        )}
      </div>

      {/* Breakdown metrics in 4-column tabular cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm pt-1">
        <div className="bg-surface-raised p-3 rounded-lg border border-border">
          <p className="text-textSecondary text-[11px] font-medium">Remaining Qty</p>
          <p className="font-bold text-textPrimary text-sm sm:text-base tabular-nums mt-0.5">
            {remaining.toLocaleString()} pcs
          </p>
        </div>
        <div className="bg-surface-raised p-3 rounded-lg border border-border">
          <p className="text-textSecondary text-[11px] font-medium">Usable Working Days</p>
          <p className="font-bold text-textPrimary text-sm sm:text-base tabular-nums mt-0.5">
            {daysAvailable} days
          </p>
        </div>
        <div className="bg-surface-raised p-3 rounded-lg border border-border">
          <p className="text-textSecondary text-[11px] font-medium">Rate Ratio</p>
          <p className="font-bold text-textPrimary text-sm sm:text-base tabular-nums mt-0.5">
            {(ratio * 100).toFixed(0)}%
          </p>
        </div>
        <div className="bg-surface-raised p-3 rounded-lg border border-border">
          <p className="text-textSecondary text-[11px] font-medium">Projected Delay</p>
          <p
            className={`font-bold text-sm sm:text-base tabular-nums mt-0.5 ${
              slipDays > 0 ? "text-status-red" : "text-status-green"
            }`}
          >
            {slipDays > 0 ? `+${slipDays} days` : "On schedule"}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border text-xs text-textSecondary flex flex-wrap justify-between items-center gap-2">
        <span>
          Projected Finish:{" "}
          <strong className="text-textPrimary font-semibold tabular-nums">{projectedFinish}</strong>
        </span>
        <span className="text-[11px]">Sundays excluded (6-day factory working calendar)</span>
      </div>
    </div>
  );
}
