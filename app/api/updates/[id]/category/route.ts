import { z } from "zod";
import { authenticate, apiError, apiSuccess } from "@/lib/api/response";
import * as repo from "@/lib/db/repo";
import { reasonCategoryEnum } from "@/lib/ai/classifier";

const overrideCategorySchema = z.object({
  category: reasonCategoryEnum,
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const authResult = authenticate(req, ["merchandiser"]);
  if ("response" in authResult) return authResult.response;

  const { id } = params;

  try {
    const body = await req.json();
    const parsed = overrideCategorySchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION", "Invalid reason category enum value", 400);
    }

    const updated = await repo.overrideUpdateCategory({
      updateId: id,
      category: parsed.data.category,
      changedBy: authResult.auth.user.id,
    });

    return apiSuccess({ update: updated });
  } catch (err: any) {
    return apiError("INTERNAL_ERROR", err.message || "Failed to override category", 500);
  }
}
