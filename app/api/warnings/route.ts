import { authenticate, apiError, apiSuccess } from "@/lib/api/response";
import { store } from "@/lib/db/store";
import type { WarningStatus } from "@/lib/db/types";

export async function GET(req: Request) {
  const authResult = authenticate(req, ["merchandiser"]);
  if ("response" in authResult) return authResult.response;

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status") as WarningStatus | null;

  const warnings = store.getWarnings(statusParam || undefined).map((w) => {
    const order = store.getOrderById(w.orderId);
    const buyer = order ? store.getBuyerById(order.buyerId) : null;
    const stage = store.getOrderStageById(w.orderStageId);
    const latestUpdate = stage ? store.getDailyUpdatesForStage(stage.id).slice(-1)[0] : null;

    return {
      id: w.id,
      orderId: w.orderId,
      poNo: order?.poNo || "Unknown",
      buyerName: buyer?.name || "Unknown",
      style: order?.style || "Unknown",
      stage: stage?.stage || "Unknown",
      status: w.status,
      requiredRate: w.requiredRate,
      actualRate: w.actualRate,
      remaining: w.remaining,
      daysAvailable: w.daysAvailable,
      slipDays: w.slipDays,
      mathSnapshot: w.mathSnapshot,
      createdAt: w.createdAt,
      decidedAt: w.decidedAt,
      dismissReason: w.dismissReason,
      latestNote: latestUpdate
        ? {
            id: latestUpdate.id,
            original: latestUpdate.noteOriginal,
            translation: latestUpdate.noteEn,
            category: latestUpdate.reasonCategory,
            confidence: latestUpdate.aiConfidence,
            source: latestUpdate.categorySource,
          }
        : null,
    };
  });

  return apiSuccess({ warnings });
}
