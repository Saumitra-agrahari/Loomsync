import { z } from "zod";
import { authenticate, apiError, apiSuccess } from "@/lib/api/response";
import * as repo from "@/lib/db/repo";

const updateDateSchema = z.object({
  field: z.enum(["ex_factory_date", "current_end"]),
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  reason: z.string().trim().min(1, "Reason is mandatory for every date adjustment"),
  stageId: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const authResult = authenticate(req, ["merchandiser"]);
  if ("response" in authResult) return authResult.response;

  const { id } = params;
  const order = await repo.getOrderById(id);
  if (!order) {
    return apiError("NOT_FOUND", "Order not found", 404);
  }

  try {
    const body = await req.json();
    const parsed = updateDateSchema.safeParse(body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      parsed.error.errors.forEach((e) => {
        fields[e.path.join(".")] = e.message;
      });
      return apiError("VALIDATION", "Invalid date update payload", 400, fields);
    }

    const { field, newDate, reason, stageId } = parsed.data;

    if (field === "ex_factory_date") {
      const updatedOrder = await repo.updateOrderExFactoryDate({
        orderId: order.id,
        newDate,
        reason,
        changedBy: authResult.auth.user.id,
      });

      await repo.logAudit(authResult.auth.user.id, "update_ex_factory_date", "orders", order.id, {
        oldDate: order.exFactoryDate,
        newDate,
        reason,
      });

      return apiSuccess({ order: updatedOrder });
    } else {
      if (!stageId) {
        return apiError("VALIDATION", "stageId is required when updating stage end date", 400);
      }
      const updatedStage = await repo.updateStageDate({
        stageId,
        newEnd: newDate,
        reason,
        changedBy: authResult.auth.user.id,
      });

      await repo.logAudit(authResult.auth.user.id, "update_stage_date", "order_stages", stageId, {
        newEnd: newDate,
        reason,
      });

      return apiSuccess({ stage: updatedStage });
    }
  } catch (err: any) {
    return apiError("INTERNAL_ERROR", err.message || "Failed to update date", 500);
  }
}
