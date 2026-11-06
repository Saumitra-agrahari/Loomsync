import { authenticate, apiError, apiSuccess } from "@/lib/api/response";
import * as repo from "@/lib/db/repo";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const authResult = authenticate(req, ["merchandiser", "buyer"]);
  if ("response" in authResult) return authResult.response;

  const { id } = params;
  const order = await repo.getOrderById(id);
  if (!order) {
    return apiError("NOT_FOUND", "Order not found", 404);
  }

  // Buyer isolation check
  if (authResult.auth.user.role === "buyer" && order.buyerId !== authResult.auth.user.buyerId) {
    return apiError("NOT_FOUND", "Order not found", 404);
  }

  const rawHistory = await repo.getMilestoneHistory(order.id);
  const history = await Promise.all(
    rawHistory.map(async (h) => {
      const user = await repo.getUserById(h.changedBy);
      return {
        id: h.id,
        field: h.field,
        oldDate: h.oldDate,
        newDate: h.newDate,
        reason: h.reason,
        changedBy: user?.name || "Merchandiser",
        changedAt: h.changedAt,
      };
    })
  );

  return apiSuccess({ history });
}
