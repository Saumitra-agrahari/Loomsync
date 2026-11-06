import { authenticate, apiSuccess } from "@/lib/api/response";
import * as repo from "@/lib/db/repo";

export async function GET(req: Request) {
  const authResult = authenticate(req, ["merchandiser", "supervisor"]);
  if ("response" in authResult) return authResult.response;

  const units = await repo.getUnits();
  return apiSuccess({ units });
}
