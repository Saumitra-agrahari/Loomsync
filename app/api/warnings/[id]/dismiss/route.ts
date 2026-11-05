import { z } from "zod";
import { authenticate, apiError, apiSuccess } from "@/lib/api/response";
import { store } from "@/lib/db/store";

const dismissSchema = z.object({
  reason: z.string().trim().min(1, "Dismiss reason is required"),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const authResult = authenticate(req, ["merchandiser"]);
  if ("response" in authResult) return authResult.response;

  const { id } = params;
  const warning = store.getWarningById(id);
  if (!warning) {
    return apiError("NOT_FOUND", "Warning not found", 404);
  }

  if (warning.status !== "draft") {
    return apiError("CONFLICT", `Warning is already ${warning.status}`, 409);
  }

  try {
    const body = await req.json();
    const parsed = dismissSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION", "Dismiss reason is mandatory", 400);
    }

    const dismissed = store.dismissWarning(warning.id, authResult.auth.user.id, parsed.data.reason);
    store.logAudit(authResult.auth.user.id, "dismiss_warning", "warnings", warning.id, {
      orderId: warning.orderId,
      reason: parsed.data.reason,
    });

    return apiSuccess({ warning: dismissed });
  } catch (err: any) {
    return apiError("INTERNAL_ERROR", err.message || "Failed to dismiss warning", 500);
  }
}
