import React from "react";

export type StatusType = "green" | "amber" | "red" | "grey" | "draft" | "confirmed" | "dismissed";

interface StatusChipProps {
  status: StatusType;
  label?: string;
  size?: "sm" | "md";
}

export function StatusChip({ status, label, size = "md" }: StatusChipProps) {
  let bg = "bg-status-greyLight text-status-grey border-status-grey";
  let defaultText = "No Recent Data";
  let iconSvg = (
    <svg className="w-3.5 h-3.5 mr-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  switch (status) {
    case "green":
      bg = "bg-emerald-50 text-emerald-800 border-emerald-300";
      defaultText = "On Track";
      iconSvg = (
        <svg className="w-3.5 h-3.5 mr-1.5 shrink-0 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      );
      break;
    case "amber":
      bg = "bg-amber-50 text-amber-800 border-amber-300";
      defaultText = "Trailing";
      iconSvg = (
        <svg className="w-3.5 h-3.5 mr-1.5 shrink-0 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
      break;
    case "red":
      bg = "bg-rose-50 text-rose-800 border-rose-300";
      defaultText = "Critical Delay";
      iconSvg = (
        <svg className="w-3.5 h-3.5 mr-1.5 shrink-0 text-rose-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
      break;
    case "draft":
      bg = "bg-purple-50 text-purple-800 border-purple-300";
      defaultText = "Draft Warning";
      iconSvg = (
        <svg className="w-3.5 h-3.5 mr-1.5 shrink-0 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
      break;
    case "confirmed":
      bg = "bg-rose-50 text-rose-800 border-rose-300";
      defaultText = "Confirmed Notice";
      iconSvg = (
        <svg className="w-3.5 h-3.5 mr-1.5 shrink-0 text-rose-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
      break;
    case "dismissed":
      bg = "bg-gray-100 text-gray-700 border-gray-300";
      defaultText = "Dismissed";
      iconSvg = (
        <svg className="w-3.5 h-3.5 mr-1.5 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
      break;
  }

  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs sm:text-sm";

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${bg} ${padding} select-none`}
      role="status"
    >
      {iconSvg}
      <span>{label || defaultText}</span>
    </span>
  );
}
