import { authenticate, apiSuccess } from "@/lib/api/response";
import { store } from "@/lib/db/store";

export async function GET(req: Request) {
  const authResult = authenticate(req, ["merchandiser"]);
  if ("response" in authResult) return authResult.response;

  return apiSuccess({ buyers: store.getBuyers() });
}
