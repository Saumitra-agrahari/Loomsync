import { authenticate, apiError, apiSuccess } from "@/lib/api/response";
import { store } from "@/lib/db/store";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const authResult = authenticate(req, ["merchandiser", "buyer"]);
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

  const history = store.getMilestoneHistory(order.id).map((h) => {
    const user = store.getUserById(h.changedBy);
    return {
      id: h.id,
      field: h.field,
      oldDate: h.oldDate,
      newDate: h.newDate,
      reason: h.reason,
      changedBy: user?.name || "Merchandiser",
      changedAt: h.changedAt,
    };
  });

  return apiSuccess({ history });
}
