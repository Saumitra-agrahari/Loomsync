// ASSUMPTION A2: 6-day working week (Sunday off); holidays configurable.
// Run-rate delay engine as a pure function (Architecture.md section 4)

export type StageRunRateInput = {
  stage: string;
  targetQty: number;
  seq: number;
  plannedDurationDays: number;
};

export type DailyUpdateInput = {
  reportedDate: string; // YYYY-MM-DD
  qty: number;
};

export type RunRateParams = {
  orderId: string;
  currentStage: string;
  stageTargetQty: number;
  totalQtyDoneInStage: number;
  exFactoryDate: string; // YYYY-MM-DD
  today: string; // YYYY-MM-DD
  downstreamStages: Array<{ stage: string; plannedDurationDays: number }>;
  recentUpdates: DailyUpdateInput[]; // sorted by reportedDate desc or asc
  holidays?: string[]; // YYYY-MM-DD
};

export type RunRateStatus = "green" | "amber" | "red" | "grey";

export type RunRateResult = {
  orderId: string;
  stage: string;
  remaining: number;
  daysAvailable: number;
  requiredRate: number;
  actualRate: number;
  ratio: number;
  status: RunRateStatus;
  statusReason?: string;
  projectedFinish: string;
  slipDays: number;
  window: string[]; // dates used for actual_rate calculation
  mathSnapshot: {
    stageTargetQty: number;
    totalQtyDoneInStage: number;
    remaining: number;
    downstreamDays: number;
    workingDaysTotal: number;
    daysAvailable: number;
    requiredRate: number;
    actualRate: number;
    ratio: number;
    projectedFinish: string;
    slipDays: number;
    today: string;
    exFactoryDate: string;
    calculatedAt: string;
  };
};

/**
 * Check if a date (YYYY-MM-DD) is a working day (Mon-Sat, not holiday, not Sunday)
 */
export function isWorkingDay(dateStr: string, holidays: Set<string> = new Set()): boolean {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = d.getUTCDay(); // 0 is Sunday
  if (dayOfWeek === 0) return false;
  if (holidays.has(dateStr)) return false;
  return true;
}

/**
 * Format Date to YYYY-MM-DD
 */
export function formatDate(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Add calendar days
 */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatDate(dt);
}

/**
 * Count working days between startDate (inclusive) and endDate (inclusive)
 */
export function countWorkingDays(startDate: string, endDate: string, holidays: Set<string> = new Set()): number {
  if (startDate > endDate) return 0;
  let count = 0;
  let current = startDate;
  while (current <= endDate) {
    if (isWorkingDay(current, holidays)) {
      count++;
    }
    current = addDays(current, 1);
  }
  return count;
}

/**
 * Get the Nth working day after startDate (counting from startDate if includeStart is true, or next working day)
 */
export function addWorkingDays(startDate: string, workingDaysToAdd: number, holidays: Set<string> = new Set()): string {
  if (workingDaysToAdd <= 0) return startDate;
  let current = startDate;
  let added = 0;
  while (added < workingDaysToAdd) {
    current = addDays(current, 1);
    if (isWorkingDay(current, holidays)) {
      added++;
    }
  }
  return current;
}

/**
 * Check if there is an update in the last N working days leading up to today
 */
export function countRecentWorkingDaysWithUpdates(
  today: string,
  updatesByDate: Map<string, number>,
  checkDays: number = 2,
  holidays: Set<string> = new Set()
): number {
  let matched = 0;
  let current = today;
  let checked = 0;
  // look at up to 7 calendar days back to find `checkDays` working days
  for (let i = 0; i < 14 && checked < checkDays; i++) {
    if (isWorkingDay(current, holidays)) {
      checked++;
      if (updatesByDate.has(current)) {
        matched++;
      }
    }
    current = addDays(current, -1);
  }
  return matched;
}

/**
 * Core pure function for calculating order run rate and delay projections.
 */
export function calculateRunRate(params: RunRateParams): RunRateResult {
  const holidays = new Set(params.holidays || []);
  const remaining = Math.max(0, params.stageTargetQty - params.totalQtyDoneInStage);
  const downstreamDays = params.downstreamStages.reduce((acc, s) => acc + s.plannedDurationDays, 0);

  // Future working days between tomorrow and ex_factory (today's output is already accounted in totalQtyDoneInStage)
  const tomorrow = addDays(params.today, 1);
  const workingDaysTotal = countWorkingDays(tomorrow, params.exFactoryDate, holidays);
  // Days available for the current stage = working days minus downstream days
  const daysAvailable = workingDaysTotal - downstreamDays;

  // EPSILON to prevent division by zero
  const EPSILON = 0.0001;
  const safeDaysAvailable = Math.max(daysAvailable, EPSILON);
  const requiredRate = remaining > 0 ? Math.round((remaining / safeDaysAvailable) * 100) / 100 : 0;

  // Aggregate updates by reported_date
  const updatesByDate = new Map<string, number>();
  for (const u of params.recentUpdates) {
    const existing = updatesByDate.get(u.reportedDate) || 0;
    updatesByDate.set(u.reportedDate, existing + u.qty);
  }

  // Filter reported working days in the past/today, sorted descending
  const sortedDatesWithUpdates = Array.from(updatesByDate.keys())
    .filter((d) => d <= params.today && isWorkingDay(d, holidays))
    .sort((a, b) => (a < b ? 1 : -1));

  // Actual rate: mean of last 3 reported working days (fallback: up to 7)
  const windowDates = sortedDatesWithUpdates.slice(0, 3);
  let actualRate = 0;
  if (windowDates.length > 0) {
    const sum = windowDates.reduce((acc, d) => acc + (updatesByDate.get(d) || 0), 0);
    actualRate = Math.round((sum / windowDates.length) * 100) / 100;
  }

  // Ratio calculation
  const ratio = requiredRate > 0 ? Math.round((actualRate / requiredRate) * 100) / 100 : 1;

  // Calculate projected finish date
  let projectedFinish = params.exFactoryDate;
  let slipDays = 0;

  if (remaining === 0) {
    // Stage is complete
    projectedFinish = params.today;
    slipDays = 0;
  } else if (actualRate <= 0) {
    // No output or 0 output: cannot finish, slip is indefinite, use large slip
    slipDays = 999;
    projectedFinish = addWorkingDays(params.today, 999, holidays);
  } else {
    const daysNeededForCurrent = Math.ceil(remaining / actualRate);
    // Finish of current stage + downstream days in working days
    const totalWorkingDaysNeeded = daysNeededForCurrent + downstreamDays;
    projectedFinish = addWorkingDays(params.today, totalWorkingDaysNeeded, holidays);
    
    // Slip days: working days difference if projected > exFactory, or calendar days difference
    if (projectedFinish > params.exFactoryDate) {
      slipDays = countWorkingDays(params.exFactoryDate, projectedFinish, holidays) - 1;
      if (slipDays < 1) slipDays = 1;
    } else {
      slipDays = 0;
    }
  }

  // Determine status (Architecture.md §4)
  let status: RunRateStatus = "green";
  let statusReason: string | undefined = undefined;

  const recentWorkingUpdatesCount = countRecentWorkingDaysWithUpdates(params.today, updatesByDate, 2, holidays);

  if (remaining === 0) {
    status = "green";
    statusReason = "Stage complete";
  } else if (windowDates.length < 2 || recentWorkingUpdatesCount === 0) {
    // Grey: < 2 updates or none in last 2 working days
    status = "grey";
    statusReason = "No recent data (<2 updates or none in last 2 working days)";
  } else if (actualRate === 0) {
    status = "red";
    statusReason = "No output reported";
  } else if (daysAvailable <= 0 && remaining > 0) {
    status = "red";
    statusReason = "Ex-factory timeline exceeded for current stage";
  } else if (ratio < 0.8) {
    status = "red";
    statusReason = `Run-rate critical (${Math.round(ratio * 100)}% of required)`;
  } else if (ratio < 1.0) {
    status = "amber";
    statusReason = `Run-rate trailing (${Math.round(ratio * 100)}% of required)`;
  } else {
    status = "green";
    statusReason = "On track";
  }

  return {
    orderId: params.orderId,
    stage: params.currentStage,
    remaining,
    daysAvailable,
    requiredRate,
    actualRate,
    ratio,
    status,
    statusReason,
    projectedFinish,
    slipDays,
    window: windowDates,
    mathSnapshot: {
      stageTargetQty: params.stageTargetQty,
      totalQtyDoneInStage: params.totalQtyDoneInStage,
      remaining,
      downstreamDays,
      workingDaysTotal,
      daysAvailable,
      requiredRate,
      actualRate,
      ratio,
      projectedFinish,
      slipDays,
      today: params.today,
      exFactoryDate: params.exFactoryDate,
      calculatedAt: new Date().toISOString(),
    },
  };
}
