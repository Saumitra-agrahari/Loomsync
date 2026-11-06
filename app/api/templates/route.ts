import { authenticate, apiError, apiSuccess } from "@/lib/api/response";
import * as repo from "@/lib/db/repo";

export async function GET(req: Request) {
  const authResult = authenticate(req, ["merchandiser"]);
  if ("response" in authResult) return authResult.response;

  const rawTemplates = await repo.getTemplates();
  const templates = await Promise.all(
    rawTemplates.map(async (t) => ({
      ...t,
      items: await repo.getTemplateItems(t.id),
    }))
  );

  return apiSuccess({ templates });
}
