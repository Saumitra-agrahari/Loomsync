import { authenticate, apiError, apiSuccess } from "@/lib/api/response";
import * as repo from "@/lib/db/repo";
import { validateImageBuffer, parseBase64Image } from "@/lib/photos/validate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const authResult = authenticate(req, ["merchandiser", "supervisor"]);
  if ("response" in authResult) return authResult.response;

  const { user } = authResult.auth;

  try {
    const contentType = req.headers.get("content-type") || "";
    let orderId = "";
    let rawBuffer: Buffer | null = null;
    let storageKey = "";
    let visibleToBuyer = true;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      orderId = (formData.get("order_id") as string) || "";
      visibleToBuyer = formData.get("visible_to_buyer") !== "false";
      const file = formData.get("file") as File | null;
      if (!file) {
        return apiError("VALIDATION", "No image file provided in form data", 400);
      }
      const arrayBuffer = await file.arrayBuffer();
      rawBuffer = Buffer.from(arrayBuffer);
      storageKey = (formData.get("storage_key") as string) || `uploads/${orderId}/${Date.now()}-${file.name || "photo.jpg"}`;
    } else {
      const body = await req.json();
      orderId = body.order_id || "";
      visibleToBuyer = body.visible_to_buyer !== false;
      const base64Str = body.image_base64 || body.image_data || "";
      if (!base64Str) {
        return apiError("VALIDATION", "image_base64 or image_data is required", 400);
      }
      rawBuffer = parseBase64Image(base64Str);
      storageKey = body.storage_key || `uploads/${orderId}/${Date.now()}.jpg`;
    }

    if (!orderId) {
      return apiError("VALIDATION", "order_id is required", 400);
    }

    if (!rawBuffer) {
      return apiError("VALIDATION", "Could not decode image data", 400);
    }

    // Verify order exists
    const order = await repo.getOrderById(orderId);
    if (!order) {
      return apiError("NOT_FOUND", "Order not found", 404);
    }

    // If supervisor, check that this order has stages for supervisor's unit
    if (user.role === "supervisor") {
      const stages = await repo.getOrderStages(order.id);
      const ownsStage = stages.some((s) => s.unitId === user.unitId);
      if (!ownsStage) {
        return apiError("FORBIDDEN", "Supervisor can only upload photos for orders assigned to their unit", 403);
      }
    }

    // Validate size (max 300 KB) and MIME (JPEG/PNG/WEBP via magic bytes)
    const validation = validateImageBuffer(rawBuffer);
    if (!validation.success) {
      return apiError("VALIDATION", validation.error, 400);
    }

    const { buffer, mimeType, sizeBytes } = validation.image;

    const photo = await repo.addPhoto({
      orderId: order.id,
      storageKey,
      imageData: buffer,
      mimeType,
      sizeBytes,
      uploadedBy: user.id,
      visibleToBuyer,
    });

    return apiSuccess(
      {
        photo_id: photo.id,
        storage_key: photo.storageKey,
        mime_type: photo.mimeType,
        size_bytes: photo.sizeBytes,
      },
      201
    );
  } catch (err: any) {
    return apiError("INTERNAL_ERROR", err.message || "Failed to upload photo", 500);
  }
}
