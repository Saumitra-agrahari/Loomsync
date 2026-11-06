import { authenticate, apiError } from "@/lib/api/response";
import * as repo from "@/lib/db/repo";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const authResult = authenticate(req, ["merchandiser", "supervisor", "buyer"]);
  if ("response" in authResult) return authResult.response;

  const { user } = authResult.auth;
  const { id } = params;

  const photo = await repo.getPhotoById(id);
  if (!photo) {
    return apiError("NOT_FOUND", "Photo not found", 404);
  }

  const order = await repo.getOrderById(photo.orderId);
  if (!order) {
    return apiError("NOT_FOUND", "Photo not found", 404);
  }

  // Access rules:
  // 1. Buyer: ONLY for their own orders and only where visible_to_buyer is true.
  //    If not their order or visibleToBuyer is false -> return 404.
  if (user.role === "buyer") {
    if (order.buyerId !== user.buyerId || !photo.visibleToBuyer) {
      return apiError("NOT_FOUND", "Photo not found", 404);
    }
  }

  // 2. Supervisor: only for orders with stages belonging to their own unit.
  if (user.role === "supervisor") {
    const stages = await repo.getOrderStages(order.id);
    const hasUnitStage = stages.some((s) => s.unitId === user.unitId);
    if (!hasUnitStage) {
      return apiError("NOT_FOUND", "Photo not found", 404);
    }
  }

  // 3. Merchandiser: full access to all photos.

  if (!photo.imageData) {
    return apiError("NOT_FOUND", "Photo content not available", 404);
  }

  const buffer = Buffer.isBuffer(photo.imageData)
    ? photo.imageData
    : Buffer.from(photo.imageData);

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": photo.mimeType || "image/jpeg",
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
