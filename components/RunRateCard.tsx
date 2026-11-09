"use client";

import React from "react";
import { StatusChip } from "./StatusChip";
import { useI18n } from "@/lib/i18n";

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
  const { t, translateStage } = useI18n();
  const shortBy = Math.max(0, Math.round((requiredRate - actualRate) * 100) / 100);

  return (
    <div className="bg-surface border border-border rounded-lg p-4 sm:p-6 shadow-subtle transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-textMuted font-semibold">
            {t("runrate.engineTitle")}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-textPrimary">
            {t("runrate.stageHeading", { stage: translateStage(stage) })}
          </h2>
        </div>
        <StatusChip status={status} />
      </div>

      {/* The Maths in Big Numbers (Need / Making / Short by) */}
      <div className="my-4 p-4 bg-surface-raised border border-border rounded-lg shadow-subtle">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
          {/* Need */}
          <div className="border-b sm:border-b-0 sm:border-r border-border pb-3 sm:pb-0 sm:pr-4">
            <span className="text-xs uppercase tracking-wider font-semibold text-textMuted block mb-1">
              {t("runrate.needLabel")}
            </span>
            <div className="flex items-baseline justify-center sm:justify-start gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-accent tabular-nums">
                {Math.round(requiredRate).toLocaleString()}
              </span>
              <span className="text-xs text-textMuted font-medium">
                {t("common.perDay")}
              </span>
            </div>
          </div>

          {/* Making */}
          <div className="border-b sm:border-b-0 sm:border-r border-border pb-3 sm:pb-0 sm:pr-4">
            <span className="text-xs uppercase tracking-wider font-semibold text-textMuted block mb-1">
              {t("runrate.makingLabel")}
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
              <span className="text-xs text-textMuted font-medium">
                {t("common.perDay")}
              </span>
            </div>
          </div>

          {/* Short by */}
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-textMuted block mb-1">
              {shortBy > 0 ? t("runrate.shortByLabel") : t("runrate.statusLabel")}
            </span>
            <div className="flex items-baseline justify-center sm:justify-start gap-1">
              {shortBy > 0 ? (
                <>
                  <span className="text-2xl sm:text-3xl font-extrabold text-status-red tabular-nums">
                    {Math.round(shortBy).toLocaleString()}
                  </span>
                  <span className="text-xs text-status-red font-medium">
                    {t("common.perDay")} ({slipDays}d {t("runrate.slipSuffix")})
                  </span>
                </>
              ) : (
                <span className="text-xl sm:text-2xl font-bold text-status-green">
                  {t("runrate.onPace", { slip: slipDays <= 0 ? "0d" : `+${slipDays}d` })}
                </span>
              )}
            </div>
          </div>
        </div>

        {statusReason && (
          <p className="text-xs text-textMuted mt-3 pt-3 border-t border-border">
            {statusReason}
          </p>
        )}
      </div>

      {/* Breakdown metrics in 4-column tabular cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm pt-1">
        <div className="bg-surface-raised p-3 rounded-lg border border-border">
          <p className="text-textMuted text-[11px] font-medium">{t("runrate.remainingQty")}</p>
          <p className="font-bold text-textPrimary text-sm sm:text-base tabular-nums mt-0.5">
            {remaining.toLocaleString()} {t("common.pcs")}
          </p>
        </div>
        <div className="bg-surface-raised p-3 rounded-lg border border-border">
          <p className="text-textMuted text-[11px] font-medium">{t("runrate.usableDays")}</p>
          <p className="font-bold text-textPrimary text-sm sm:text-base tabular-nums mt-0.5">
            {daysAvailable} {t("common.days")}
          </p>
        </div>
        <div className="bg-surface-raised p-3 rounded-lg border border-border">
          <p className="text-textMuted text-[11px] font-medium">{t("runrate.rateRatio")}</p>
          <p className="font-bold text-textPrimary text-sm sm:text-base tabular-nums mt-0.5">
            {(ratio * 100).toFixed(0)}%
          </p>
        </div>
        <div className="bg-surface-raised p-3 rounded-lg border border-border">
          <p className="text-textMuted text-[11px] font-medium">{t("runrate.projectedDelay")}</p>
          <p
            className={`font-bold text-sm sm:text-base tabular-nums mt-0.5 ${
              slipDays > 0 ? "text-status-red" : "text-status-green"
            }`}
          >
            {slipDays > 0 ? `+${slipDays} ${t("common.days")}` : t("runrate.onSchedule")}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border text-xs text-textMuted flex flex-wrap justify-between items-center gap-2">
        <span>
          {t("runrate.projectedFinishLabel")}{" "}
          <strong className="text-textPrimary font-semibold tabular-nums">{projectedFinish}</strong>
        </span>
        <span className="text-[11px]">{t("runrate.calendarNote")}</span>
      </div>
    </div>
  );
}
