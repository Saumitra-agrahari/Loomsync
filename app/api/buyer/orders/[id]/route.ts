import { authenticate, apiError, apiSuccess } from "@/lib/api/response";
import { store } from "@/lib/db/store";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const authResult = authenticate(req, ["buyer"]);
  if ("response" in authResult) return authResult.response;

  const buyerId = authResult.auth.user.buyerId;
  if (!buyerId) {
    return apiError("FORBIDDEN", "No buyer associated with this session", 403);
  }

  const { id } = params;
  const order = store.getOrderById(id);

  // Strict Buyer Isolation:
  // If order does not exist OR belongs to another buyer, return 404 Not Found
  if (!order || order.buyerId !== buyerId) {
    return apiError("NOT_FOUND", "Order not found", 404);
  }

  const buyer = store.getBuyerById(order.buyerId);
  const lines = store.getOrderLines(order.id);
  const stages = store.getOrderStages(order.id);
  const totalQty = lines.reduce((acc, l) => acc + l.qty, 0);

  // Filtered stages for buyer: unitId and unitName are EXCLUDED (ASSUMPTION A4/F7)
  const milestoneTimeline = stages.map((s) => {
    const rawUpdates = store.getDailyUpdatesForStage(s.id);
    const stageDone = rawUpdates.reduce((acc, u) => acc + u.qty, 0);

    return {
      id: s.id,
      stage: s.stage,
      seq: s.seq,
      targetQty: s.targetQty,
      stageDone,
      percentDone: Math.min(100, Math.round((stageDone / s.targetQty) * 100)),
      plannedStart: s.plannedStart,
      plannedEnd: s.plannedEnd,
      currentEnd: s.currentEnd,
      actualEnd: s.actualEnd,
    };
  });

  // Progress photos visible to buyer
  const photos = store.getPhotosForOrder(order.id, true).map((p) => ({
    id: p.id,
    storageKey: p.storageKey,
    takenAt: p.takenAt,
  }));

  // Warnings: confirmed warnings ONLY (unconfirmed/draft are strictly excluded!)
  const confirmedWarnings = store.getWarningsForOrder(order.id, true).map((w) => ({
    id: w.id,
    slipDays: w.slipDays,
    requiredRate: w.requiredRate,
    actualRate: w.actualRate,
    createdAt: w.createdAt,
    decidedAt: w.decidedAt,
  }));

  // Date change history
  const history = store.getMilestoneHistory(order.id).map((h) => ({
    field: h.field,
    oldDate: h.oldDate,
    newDate: h.newDate,
    reason: h.reason,
    changedAt: h.changedAt,
  }));

  return apiSuccess({
    order: {
      id: order.id,
      poNo: order.poNo,
      style: order.style,
      buyerName: buyer?.name,
      buyerCountry: buyer?.country,
      status: order.status,
      exFactoryDate: order.exFactoryDate,
      totalQty,
      lines,
      milestones: milestoneTimeline,
      photos,
      confirmedWarnings,
      history,
    },
  });
}
