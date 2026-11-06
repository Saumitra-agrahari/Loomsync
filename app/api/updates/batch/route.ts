import { z } from "zod";
import { authenticate, apiError, apiSuccess } from "@/lib/api/response";
import * as repo from "@/lib/db/repo";
import { classifyNote } from "@/lib/ai/classifier";
import { validateImageBuffer, parseBase64Image } from "@/lib/photos/validate";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

const batchItemSchema = z.object({
  client_uuid: z.string().min(1, "client_uuid is required"),
  order_stage_id: z.string().min(1, "order_stage_id is required"),
  reported_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "reported_date must be YYYY-MM-DD"),
  qty: z.number().int().min(0, "qty must be >= 0"),
  note: z.string().max(1000).optional(),
  photo_key: z.string().optional(),
  photo_base64: z.string().optional(),
  client_ts: z.string().min(1, "client_ts is required"),
});

const batchUpdateSchema = z.object({
  updates: z
    .array(batchItemSchema)
    .min(1, "At least one update is required")
    .max(50, "Batch size limit is 50 items"),
});

export async function POST(req: Request) {
  const authResult = authenticate(req, ["supervisor"]);
  if ("response" in authResult) return authResult.response;

  const { user } = authResult.auth;
  if (!user.unitId) {
    return apiError("FORBIDDEN", "Supervisor is not assigned to any unit", 403);
  }

  const clientIp = getClientIp(req);
  const rateKey = `batch:${user.id || clientIp}`;
  const rateCheck = checkRateLimit(rateKey, 60, 60);
  if (!rateCheck.success) {
    return apiError(
      "RATE_LIMITED",
      "Too many batch update requests. Please wait before submitting more updates.",
      429,
      undefined,
      { "Retry-After": String(rateCheck.retryAfterSeconds) }
    );
  }

  try {
    const body = await req.json();
    const parsed = batchUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      parsed.error.errors.forEach((e) => {
        fields[e.path.join(".")] = e.message;
      });
      return apiError("VALIDATION", "Invalid batch update payload", 400, fields);
    }

    const results: Array<{
      client_uuid: string;
      status: "created" | "duplicate" | "rejected";
      error: string | null;
    }> = [];

    for (const item of parsed.data.updates) {
      const stage = await repo.getOrderStageById(item.order_stage_id);
      if (!stage) {
        results.push({
          client_uuid: item.client_uuid,
          status: "rejected",
          error: "Order stage not found",
        });
        continue;
      }

      // Object ownership check: Supervisor can ONLY update stages assigned to their unit!
      if (stage.unitId !== user.unitId) {
        results.push({
          client_uuid: item.client_uuid,
          status: "rejected",
          error: "Stage is assigned to a different unit",
        });
        continue;
      }

      // Check if update with this client_uuid already exists (idempotency)
      const existing = await repo.getDailyUpdateByClientUuid(item.client_uuid);
      if (existing) {
        results.push({
          client_uuid: item.client_uuid,
          status: "duplicate",
          error: null,
        });
        continue;
      }

      // Check if another update already exists for this stage & date -> marks correction
      const updatesForStage = await repo.getDailyUpdatesForStage(stage.id);
      const isCorrection = updatesForStage.some((u) => u.reportedDate === item.reported_date);

      // Handle photo if base64 or key provided
      let photoId: string | null = null;
      if (item.photo_base64 || item.photo_key) {
        let buffer: Buffer | undefined = undefined;
        let mimeType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg";
        let sizeBytes: number | undefined = undefined;

        if (item.photo_base64) {
          const raw = parseBase64Image(item.photo_base64);
          if (raw) {
            const validation = validateImageBuffer(raw);
            if (validation.success) {
              buffer = validation.image.buffer;
              mimeType = validation.image.mimeType;
              sizeBytes = validation.image.sizeBytes;
            }
          }
        }

        const storageKey = item.photo_key || `uploads/${stage.orderId}/${Date.now()}.jpg`;
        const photo = await repo.addPhoto({
          orderId: stage.orderId,
          storageKey,
          imageData: buffer,
          mimeType,
          sizeBytes,
          uploadedBy: user.id,
          visibleToBuyer: true,
        });
        photoId = photo.id;
      }

      // Detect language if note provided
      const noteOriginal = item.note?.trim() || null;
      const isTamil = noteOriginal ? /[\u0B80-\u0BFF]/.test(noteOriginal) : false;
      const noteLang = noteOriginal ? (isTamil ? "ta" : "en") : null;

      // Add to append-only daily_updates
      const saveResult = await repo.addDailyUpdate({
        clientUuid: item.client_uuid,
        orderStageId: stage.id,
        unitId: stage.unitId,
        reportedDate: item.reported_date,
        qty: item.qty,
        noteOriginal,
        noteLang,
        noteEn: null,
        reasonCategory: null,
        aiConfidence: null,
        categorySource: null,
        photoId,
        submittedBy: user.id,
        clientTs: item.client_ts,
        isCorrection,
      });

      // Asynchronously trigger classification if note is present (does not block response)
      if (noteOriginal) {
        classifyNote(noteOriginal)
          .then(async (aiResult) => {
            saveResult.record.noteEn = aiResult.translation;
            saveResult.record.reasonCategory = aiResult.category;
            saveResult.record.aiConfidence = aiResult.confidence;
            saveResult.record.categorySource = aiResult.source;
          })
          .catch(() => {
            // Error handling: fallback
            saveResult.record.reasonCategory = "unclear";
            saveResult.record.categorySource = "fallback";
          });
      }

      results.push({
        client_uuid: item.client_uuid,
        status: saveResult.status,
        error: null,
      });
    }

    return apiSuccess({ results });
  } catch (err: any) {
    return apiError("INTERNAL_ERROR", err.message || "Failed to process batch update", 500);
  }
}
