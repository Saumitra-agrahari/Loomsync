"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";

export type StatusType = "green" | "amber" | "red" | "grey" | "draft" | "confirmed" | "dismissed";

interface StatusChipProps {
  status: StatusType;
  label?: string;
  size?: "sm" | "md";
}

export function StatusChip({ status, label, size = "md" }: StatusChipProps) {
  const { t, translateStatus } = useI18n();

  let bg = "bg-status-greyLight text-status-greyText border-status-grey/30";
  let defaultText = t("status.grey");
  let iconSvg = (
    // Clock / Inactive shape for grey
    <svg className="w-3.5 h-3.5 mr-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  switch (status) {
    case "green":
      bg = "bg-status-greenLight text-status-greenText border-status-green/30";
      defaultText = t("status.green");
      iconSvg = (
        // Circle Checkmark shape for green
        <svg className="w-3.5 h-3.5 mr-1.5 shrink-0 text-status-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      );
      break;

    case "amber":
      bg = "bg-status-amberLight text-status-amberText border-status-amber/30";
      defaultText = t("status.amber");
      iconSvg = (
        // Triangle shape for amber
        <svg className="w-3.5 h-3.5 mr-1.5 shrink-0 text-status-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
      break;

    case "red":
      bg = "bg-status-redLight text-status-redText border-status-red/30";
      defaultText = t("status.red");
      iconSvg = (
        // Octagon / Stop shape for red
        <svg className="w-3.5 h-3.5 mr-1.5 shrink-0 text-status-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
      break;

    case "draft":
      bg = "bg-accent-subtle text-accent border-accent/30";
      defaultText = t("status.draft");
      iconSvg = (
        // Diamond / Review shape for draft
        <svg className="w-3.5 h-3.5 mr-1.5 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
      break;

    case "confirmed":
      bg = "bg-status-redLight text-status-redText border-status-red/30";
      defaultText = t("status.confirmed");
      iconSvg = (
        // Warning triangle for confirmed warning
        <svg className="w-3.5 h-3.5 mr-1.5 shrink-0 text-status-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
      break;

    case "dismissed":
      bg = "bg-status-greyLight text-status-greyText border-status-grey/30";
      defaultText = t("status.dismissed");
      iconSvg = (
        // Cross shape for dismissed
        <svg className="w-3.5 h-3.5 mr-1.5 shrink-0 text-status-grey" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
      break;
  }

  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs sm:text-sm";
  const displayLabel = label ? translateStatus(label) : defaultText;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${bg} ${padding} select-none tabular-nums`}
      role="status"
    >
      {iconSvg}
      <span>{displayLabel}</span>
    </span>
  );
}
