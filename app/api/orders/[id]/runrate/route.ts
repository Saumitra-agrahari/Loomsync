import { authenticate, apiError, apiSuccess } from "@/lib/api/response";
import { store } from "@/lib/db/store";
import { calculateRunRate } from "@/lib/runrate";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const authResult = authenticate(req, ["merchandiser", "supervisor", "buyer"]);
  if ("response" in authResult) return authResult.response;

  const { id } = params;
  const order = store.getOrderById(id);
  if (!order) {
    return apiError("NOT_FOUND", "Order not found", 404);
  }

  // Buyer isolation check
  if (authResult.auth.user.role === "buyer" && order.buyerId !== authResult.auth.user.buyerId) {
    return apiError("NOT_FOUND", "Order not found", 404);
  }

  const stages = store.getOrderStages(order.id);
  if (stages.length === 0) {
    return apiError("NOT_FOUND", "No stages found for this order", 404);
  }

  // Find current active stage (first stage with remaining > 0, or last stage)
  let activeStage = stages[0];
  let totalDoneInStage = 0;

  for (let i = 0; i < stages.length; i++) {
    const s = stages[i];
    const updates = store.getDailyUpdatesForStage(s.id);
    const done = updates.reduce((acc, u) => acc + u.qty, 0);

    if (done < s.targetQty || i === stages.length - 1) {
      activeStage = s;
      totalDoneInStage = done;
      break;
    }
  }

  const downstreamStages = stages
    .filter((s) => s.seq > activeStage.seq)
    .map((s) => ({ stage: s.stage, plannedDurationDays: 3 }));

  const stageUpdates = store.getDailyUpdatesForStage(activeStage.id);

  const result = calculateRunRate({
    orderId: order.id,
    currentStage: activeStage.stage,
    stageTargetQty: activeStage.targetQty,
    totalQtyDoneInStage: totalDoneInStage,
    exFactoryDate: order.exFactoryDate,
    today: "2026-11-05", // baseline demo today
    downstreamStages,
    recentUpdates: stageUpdates.map((u) => ({ reportedDate: u.reportedDate, qty: u.qty })),
  });

  return apiSuccess({
    stage: result.stage,
    remaining: result.remaining,
    days_available: result.daysAvailable,
    required_rate: result.requiredRate,
    actual_rate: result.actualRate,
    ratio: result.ratio,
    status: result.status,
    status_reason: result.statusReason,
    projected_finish: result.projectedFinish,
    slip_days: result.slipDays,
    window: result.window,
    math_snapshot: result.mathSnapshot,
  });
}
