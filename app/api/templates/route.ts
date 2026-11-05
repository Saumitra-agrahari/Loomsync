import { authenticate, apiError, apiSuccess } from "@/lib/api/response";
import { store } from "@/lib/db/store";

export async function GET(req: Request) {
  const authResult = authenticate(req, ["merchandiser"]);
  if ("response" in authResult) return authResult.response;

  const templates = store.getTemplates().map((t) => ({
    ...t,
    items: store.getTemplateItems(t.id),
  }));

  return apiSuccess({ templates });
}
