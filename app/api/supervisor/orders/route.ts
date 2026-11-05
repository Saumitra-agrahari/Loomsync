import { authenticate, apiError, apiSuccess } from "@/lib/api/response";
import { store } from "@/lib/db/store";
import { formatDate } from "@/lib/runrate";

export async function GET(req: Request) {
  const authResult = authenticate(req, ["supervisor"]);
  if ("response" in authResult) return authResult.response;

  const { user } = authResult.auth;
  if (!user.unitId) {
    return apiError("FORBIDDEN", "Supervisor is not assigned to any unit", 403);
  }

  const allOrders = store.getOrders().filter((o) => o.status === "open");
  const todayStr = "2026-11-05"; // baseline today

  const supervisorOrders: any[] = [];

  for (const order of allOrders) {
    const stages = store.getOrderStages(order.id);
    const unitStages = stages.filter((s) => s.unitId === user.unitId);

    for (const stage of unitStages) {
      const updates = store.getDailyUpdatesForStage(stage.id);
      const stageDone = updates.reduce((acc, u) => acc + u.qty, 0);
      const remaining = Math.max(0, stage.targetQty - stageDone);

      // Check if update was submitted today
      const todayUpdate = updates.find((u) => u.reportedDate === todayStr);
      const todayStatus = todayUpdate ? "sent" : "pending";

      supervisorOrders.push({
        orderId: order.id,
        orderStageId: stage.id,
        poNo: order.poNo,
        style: order.style,
        stage: stage.stage,
        targetQty: stage.targetQty,
        stageDone,
        remaining,
        todayStatus,
        lastReportedDate: updates.length > 0 ? updates[updates.length - 1].reportedDate : null,
      });
    }
  }

  return apiSuccess({ orders: supervisorOrders });
}
