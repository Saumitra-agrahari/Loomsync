import { z } from "zod";
import { authenticate, apiError, apiSuccess } from "@/lib/api/response";
import { store } from "@/lib/db/store";

const signPhotoSchema = z.object({
  order_id: z.string().min(1, "order_id is required"),
  mime_type: z.enum(["image/jpeg", "image/png", "image/webp"], {
    errorMap: () => ({ message: "Only JPEG, PNG and WEBP images are allowed" }),
  }),
  size_bytes: z
    .number()
    .int()
    .positive()
    .max(2 * 1024 * 1024, "Image must not exceed 2 MB"),
});

export async function POST(req: Request) {
  const authResult = authenticate(req, ["supervisor"]);
  if ("response" in authResult) return authResult.response;

  try {
    const body = await req.json();
    const parsed = signPhotoSchema.safeParse(body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      parsed.error.errors.forEach((e) => {
        fields[e.path.join(".")] = e.message;
      });
      return apiError("VALIDATION", "Invalid photo upload request", 400, fields);
    }

    const { order_id, mime_type } = parsed.data;
    const order = store.getOrderById(order_id);
    if (!order) {
      return apiError("NOT_FOUND", "Order not found", 404);
    }

    const ext = mime_type.split("/")[1] === "jpeg" ? "jpg" : mime_type.split("/")[1];
    const storageKey = `uploads/${order.poNo}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const uploadUrl = `/api/photos/upload-mock?key=${encodeURIComponent(storageKey)}`;

    return apiSuccess({
      upload_url: uploadUrl,
      storage_key: storageKey,
    });
  } catch (err: any) {
    return apiError("INTERNAL_ERROR", err.message || "Failed to sign photo", 500);
  }
}
