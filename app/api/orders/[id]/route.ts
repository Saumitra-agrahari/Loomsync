import { authenticate, apiError, apiSuccess } from "@/lib/api/response";
import * as repo from "@/lib/db/repo";
import { calculateRunRate } from "@/lib/runrate";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const authResult = authenticate(req, ["merchandiser", "supervisor", "buyer"]);
  if ("response" in authResult) return authResult.response;

  const { id } = params;
  const order = await repo.getOrderById(id);
  if (!order) {
    return apiError("NOT_FOUND", "Order not found", 404);
  }

  const { user } = authResult.auth;

  // Object-level authorization checks:
  if (user.role === "buyer") {
    // Buyer isolation: buyer can ONLY see their own orders!
    if (order.buyerId !== user.buyerId) {
      return apiError("NOT_FOUND", "Order not found", 404); // 404 to avoid leaking existence
    }
  } else if (user.role === "supervisor") {
    // Supervisor can only see if one of the stages is assigned to their unit
    const stages = await repo.getOrderStages(order.id);
    const hasStage = stages.some((s) => s.unitId === user.unitId);
    if (!hasStage) {
      return apiError("FORBIDDEN", "Order is not assigned to your unit", 403);
    }
  }

  const buyer = await repo.getBuyerById(order.buyerId);
  const lines = await repo.getOrderLines(order.id);
  const stages = await repo.getOrderStages(order.id);
  const history = await repo.getMilestoneHistory(order.id);
  const totalQty = lines.reduce((acc, l) => acc + l.qty, 0);

  // Compute stage status & updates
  const stageDetails = await Promise.all(
    stages.map(async (s) => {
      const rawUpdates = await repo.getDailyUpdatesForStage(s.id);
      const unit = await repo.getUnitById(s.unitId);
      const stageQtyDone = rawUpdates.reduce((acc, u) => acc + u.qty, 0);

      // Filter updates if role is buyer (buyers never see internal notes)
      const updates = rawUpdates.map((u) => {
        if (user.role === "buyer") {
          return {
            id: u.id,
            reportedDate: u.reportedDate,
            qty: u.qty,
            clientTs: u.clientTs,
          };
        }
        return u;
      });

      return {
        id: s.id,
        stage: s.stage,
        seq: s.seq,
        unitId: user.role === "buyer" ? undefined : s.unitId,
        unitName: user.role === "buyer" ? undefined : unit?.name,
        targetQty: s.targetQty,
        stageQtyDone,
        percentDone: Math.min(100, Math.round((stageQtyDone / s.targetQty) * 100)),
        plannedStart: s.plannedStart,
        plannedEnd: s.plannedEnd,
        currentEnd: s.currentEnd,
        actualEnd: s.actualEnd,
        updates,
      };
    })
  );

  // Calculate run-rate for current active stage
  let activeStage = stageDetails[0];
  for (let i = 0; i < stageDetails.length; i++) {
    if (stageDetails[i].stageQtyDone < stageDetails[i].targetQty || i === stageDetails.length - 1) {
      activeStage = stageDetails[i];
      break;
    }
  }

  const downstreamStages = stages
    .filter((s) => s.seq > (activeStage?.seq || 0))
    .map((s) => ({ stage: s.stage, plannedDurationDays: 3 }));

  const activeStageUpdates = activeStage ? await repo.getDailyUpdatesForStage(activeStage.id) : [];

  const runRate = calculateRunRate({
    orderId: order.id,
    currentStage: activeStage?.stage || "Cutting",
    stageTargetQty: activeStage?.targetQty || totalQty,
    totalQtyDoneInStage: activeStage?.stageQtyDone || 0,
    exFactoryDate: order.exFactoryDate,
    today: "2026-11-05",
    downstreamStages,
    recentUpdates: activeStageUpdates.map((u) => ({ reportedDate: u.reportedDate, qty: u.qty })),
  });

  // Photos (visible to buyer flag checked)
  const photos = await repo.getPhotosForOrder(order.id, user.role === "buyer");

  // Warnings (buyer only sees confirmed warnings)
  const warnings = await repo.getWarningsForOrder(order.id, user.role === "buyer");

  return apiSuccess({
    order: {
      id: order.id,
      poNo: order.poNo,
      buyerId: order.buyerId,
      buyerName: buyer?.name,
      buyerCountry: buyer?.country,
      style: order.style,
      status: order.status,
      exFactoryDate: order.exFactoryDate,
      originalExFactoryDate: order.originalExFactoryDate,
      totalQty,
      lines,
      stages: stageDetails,
      activeStage: activeStage.stage,
      runRate,
      photos,
      warnings,
      history,
    },
  });
}
