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
    <div className="bg-surface border border-border rounded-lg p-4 sm:p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
        <div>
          <span className="text-xs uppercase tracking-wider text-textSecondary font-semibold">
            Stage Run-Rate Engine
          </span>
          <h3 className="text-lg font-bold text-textPrimary">{stage} Stage</h3>
        </div>
        <StatusChip status={status} />
      </div>

      {/* The Maths summary banner */}
      <div className="my-3 p-3 bg-white border border-border rounded-md">
        <p className="text-base sm:text-lg font-bold text-textPrimary">
          Need <span className="text-accent underline">{Math.round(requiredRate)}</span>/day · Making{" "}
          <span className={status === "red" ? "text-status-red underline" : "text-emerald-700 underline"}>
            {Math.round(actualRate)}
          </span>
          /day
          {shortBy > 0 && (
            <span className="block sm:inline sm:ml-2 text-status-red font-semibold text-sm sm:text-base">
              · Short by {Math.round(shortBy)}/day
            </span>
          )}
        </p>
        {statusReason && <p className="text-xs text-textSecondary mt-1">{statusReason}</p>}
      </div>

      {/* Breakdown metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm pt-2">
        <div className="bg-white p-2.5 rounded border border-border">
          <p className="text-textSecondary">Remaining Qty</p>
          <p className="font-semibold text-textPrimary text-sm sm:text-base">{remaining.toLocaleString()} pcs</p>
        </div>
        <div className="bg-white p-2.5 rounded border border-border">
          <p className="text-textSecondary">Usable Days</p>
          <p className="font-semibold text-textPrimary text-sm sm:text-base">{daysAvailable} working days</p>
        </div>
        <div className="bg-white p-2.5 rounded border border-border">
          <p className="text-textSecondary">Rate Ratio</p>
          <p className="font-semibold text-textPrimary text-sm sm:text-base">{(ratio * 100).toFixed(0)}%</p>
        </div>
        <div className="bg-white p-2.5 rounded border border-border">
          <p className="text-textSecondary">Projected Delay</p>
          <p
            className={`font-semibold text-sm sm:text-base ${
              slipDays > 0 ? "text-status-red" : "text-emerald-700"
            }`}
          >
            {slipDays > 0 ? `+${slipDays} days` : "On time"}
          </p>
        </div>
      </div>

      <div className="mt-3 text-xs text-textSecondary flex justify-between items-center">
        <span>Projected Finish: <strong className="text-textPrimary">{projectedFinish}</strong></span>
        <span>Sundays excluded (6-day week)</span>
      </div>
    </div>
  );
}
