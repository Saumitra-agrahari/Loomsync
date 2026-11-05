import { describe, it, expect } from "vitest";
import {
  calculateRunRate,
  countWorkingDays,
  isWorkingDay,
  addWorkingDays,
} from "@/lib/runrate";

describe("Phase 4: Run-Rate Engine (Pure Function & Edge Cases)", () => {
  const baseToday = "2026-11-05"; // Thursday

  describe("Calendar and Working Days (Architecture §4, ASSUMPTION A2)", () => {
    it("excludes Sundays (6-day working week)", () => {
      // 2026-11-05 is Thursday (working)
      expect(isWorkingDay("2026-11-05")).toBe(true);
      // 2026-11-06 is Friday (working)
      expect(isWorkingDay("2026-11-06")).toBe(true);
      // 2026-11-07 is Saturday (working)
      expect(isWorkingDay("2026-11-07")).toBe(true);
      // 2026-11-08 is Sunday (OFF)
      expect(isWorkingDay("2026-11-08")).toBe(false);
      // 2026-11-09 is Monday (working)
      expect(isWorkingDay("2026-11-09")).toBe(true);
    });

    it("counts correct working days between Thursday Nov 5 and Thursday Nov 12", () => {
      // Nov 5 (Thu), 6 (Fri), 7 (Sat), [8 Sun off], 9 (Mon), 10 (Tue), 11 (Wed), 12 (Thu)
      // Total working days = 7
      const days = countWorkingDays("2026-11-05", "2026-11-12");
      expect(days).toBe(7);
    });
  });

  describe("Worked Example from Architecture.md §4", () => {
    it("reproduces exact worked example: B-PO-88240 polo -> Red, ratio 0.71, slip 2 days", () => {
      // Worked example: Finishing 5,200 / 8,000, ex-factory 12 Nov, today 5 Nov.
      // Remaining 2,800; 1 downstream day (Packing); ~5 usable working days -> required 560/day; actual 400/day -> ratio 0.71 -> Red, projected slip ≈ 2 days.
      const result = calculateRunRate({
        orderId: "ord-b-88240",
        currentStage: "Finishing",
        stageTargetQty: 8000,
        totalQtyDoneInStage: 5200,
        exFactoryDate: "2026-11-12",
        today: "2026-11-05",
        downstreamStages: [{ stage: "Packing", plannedDurationDays: 1 }],
        recentUpdates: [
          { reportedDate: "2026-11-05", qty: 400 },
          { reportedDate: "2026-11-04", qty: 400 },
          { reportedDate: "2026-11-03", qty: 400 },
        ],
      });

      expect(result.remaining).toBe(2800);
      expect(result.daysAvailable).toBe(5);
      expect(result.requiredRate).toBe(560);
      expect(result.actualRate).toBe(400);
      expect(result.ratio).toBe(0.71);
      expect(result.status).toBe("red");
      expect(result.slipDays).toBe(2);
    });
  });

  describe("Engine Edge Cases (Must-haves from brief)", () => {
    it("handles remaining = 0 (stage complete -> Green)", () => {
      const result = calculateRunRate({
        orderId: "ord-complete",
        currentStage: "Finishing",
        stageTargetQty: 5000,
        totalQtyDoneInStage: 5000,
        exFactoryDate: "2026-11-20",
        today: baseToday,
        downstreamStages: [{ stage: "Packing", plannedDurationDays: 2 }],
        recentUpdates: [
          { reportedDate: "2026-11-05", qty: 500 },
          { reportedDate: "2026-11-04", qty: 500 },
        ],
      });

      expect(result.remaining).toBe(0);
      expect(result.requiredRate).toBe(0);
      expect(result.status).toBe("green");
      expect(result.statusReason).toContain("complete");
    });

    it("handles zero output reported (actual_rate = 0 -> Red)", () => {
      const result = calculateRunRate({
        orderId: "ord-zero",
        currentStage: "Stitching",
        stageTargetQty: 6000,
        totalQtyDoneInStage: 2000,
        exFactoryDate: "2026-11-20",
        today: baseToday,
        downstreamStages: [{ stage: "Packing", plannedDurationDays: 2 }],
        recentUpdates: [
          { reportedDate: "2026-11-05", qty: 0 },
          { reportedDate: "2026-11-04", qty: 0 },
          { reportedDate: "2026-11-03", qty: 0 },
        ],
      });

      expect(result.actualRate).toBe(0);
      expect(result.status).toBe("red");
      expect(result.statusReason).toContain("No output reported");
    });

    it("handles stale or missing updates (<2 updates or none in last 2 working days -> Grey)", () => {
      // Only 1 update reported 5 days ago
      const result = calculateRunRate({
        orderId: "ord-stale",
        currentStage: "Cutting",
        stageTargetQty: 5000,
        totalQtyDoneInStage: 1000,
        exFactoryDate: "2026-11-25",
        today: baseToday,
        downstreamStages: [],
        recentUpdates: [{ reportedDate: "2026-10-28", qty: 1000 }],
      });

      expect(result.status).toBe("grey");
      expect(result.statusReason).toContain("No recent data");
    });

    it("handles days_available <= 0 with remaining > 0 (timeline blown -> Red)", () => {
      const result = calculateRunRate({
        orderId: "ord-overdue",
        currentStage: "Stitching",
        stageTargetQty: 5000,
        totalQtyDoneInStage: 2000,
        exFactoryDate: "2026-11-06", // Tomorrow, but downstream stages take 3 days!
        today: baseToday,
        downstreamStages: [{ stage: "Packing", plannedDurationDays: 3 }],
        recentUpdates: [
          { reportedDate: "2026-11-05", qty: 500 },
          { reportedDate: "2026-11-04", qty: 500 },
        ],
      });

      expect(result.daysAvailable).toBeLessThanOrEqual(0);
      expect(result.status).toBe("red");
    });

    it("dampens one-day spikes using the 3-day average", () => {
      const result = calculateRunRate({
        orderId: "ord-spike",
        currentStage: "Stitching",
        stageTargetQty: 10000,
        totalQtyDoneInStage: 3000,
        exFactoryDate: "2026-11-25",
        today: baseToday,
        downstreamStages: [{ stage: "Finishing", plannedDurationDays: 4 }],
        recentUpdates: [
          { reportedDate: "2026-11-05", qty: 900 }, // abnormal 1-day spike
          { reportedDate: "2026-11-04", qty: 300 }, // normal day
          { reportedDate: "2026-11-03", qty: 300 }, // normal day
        ],
      });

      // 3-day average: (900 + 300 + 300) / 3 = 500/day
      expect(result.actualRate).toBe(500);
    });
  });
});
