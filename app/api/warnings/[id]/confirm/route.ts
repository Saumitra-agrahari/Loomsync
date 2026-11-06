import { authenticate, apiError, apiSuccess } from "@/lib/api/response";
import * as repo from "@/lib/db/repo";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const authResult = authenticate(req, ["merchandiser"]);
  if ("response" in authResult) return authResult.response;

  const { id } = params;
  const warning = await repo.getWarningById(id);
  if (!warning) {
    return apiError("NOT_FOUND", "Warning not found", 404);
  }

  if (warning.status !== "draft") {
    return apiError("CONFLICT", `Warning is already ${warning.status}`, 409);
  }

  const confirmed = await repo.confirmWarning(warning.id, authResult.auth.user.id);
  await repo.logAudit(authResult.auth.user.id, "confirm_warning", "warnings", warning.id, {
    orderId: warning.orderId,
    slipDays: warning.slipDays,
  });

  return apiSuccess({ warning: confirmed });
}
