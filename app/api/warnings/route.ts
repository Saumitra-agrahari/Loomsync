import { authenticate, apiError, apiSuccess } from "@/lib/api/response";
import * as repo from "@/lib/db/repo";
import type { WarningStatus } from "@/lib/db/types";

export async function GET(req: Request) {
  const authResult = authenticate(req, ["merchandiser"]);
  if ("response" in authResult) return authResult.response;

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status") as WarningStatus | null;

  const rawWarnings = await repo.getWarnings(statusParam || undefined);
  const warnings = await Promise.all(
    rawWarnings.map(async (w) => {
      const order = await repo.getOrderById(w.orderId);
      const buyer = order ? await repo.getBuyerById(order.buyerId) : null;
      const stage = await repo.getOrderStageById(w.orderStageId);
      const updates = stage ? await repo.getDailyUpdatesForStage(stage.id) : [];
      const latestUpdate = updates.length > 0 ? updates[updates.length - 1] : null;

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
    })
  );

  return apiSuccess({ warnings });
}
