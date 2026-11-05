import { authenticate, apiError, apiSuccess } from "@/lib/api/response";
import { store } from "@/lib/db/store";

export async function GET(req: Request) {
  const authResult = authenticate(req, ["buyer"]);
  if ("response" in authResult) return authResult.response;

  // Strict isolation: buyerId is derived solely from the authenticated session / token!
  const buyerId = authResult.auth.user.buyerId;
  if (!buyerId) {
    return apiError("FORBIDDEN", "No buyer associated with this session", 403);
  }

  const buyer = store.getBuyerById(buyerId);
  const ownOrders = store.getOrders().filter((o) => o.buyerId === buyerId);

  const sanitizedOrders = ownOrders.map((order) => {
    const lines = store.getOrderLines(order.id);
    const stages = store.getOrderStages(order.id);
    const totalQty = lines.reduce((acc, l) => acc + l.qty, 0);

    // Active stage
    let activeStage = stages[0];
    let totalDone = 0;
    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      const updates = store.getDailyUpdatesForStage(s.id);
      const stageDone = updates.reduce((acc, u) => acc + u.qty, 0);
      if (stageDone < s.targetQty || i === stages.length - 1) {
        activeStage = s;
        totalDone = stageDone;
        break;
      }
    }

    const confirmedWarnings = store.getWarningsForOrder(order.id, true);

    return {
      id: order.id,
      poNo: order.poNo,
      style: order.style,
      status: order.status,
      exFactoryDate: order.exFactoryDate,
      totalQty,
      currentStage: activeStage.stage,
      percentDone: Math.min(100, Math.round((totalDone / activeStage.targetQty) * 100)),
      hasDelayWarning: confirmedWarnings.length > 0,
    };
  });

  return apiSuccess({
    buyer: {
      name: buyer?.name,
      country: buyer?.country,
    },
    orders: sanitizedOrders,
  });
}
