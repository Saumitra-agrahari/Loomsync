import { authenticate, apiSuccess } from "@/lib/api/response";

export async function GET(req: Request) {
  const authResult = authenticate(req);
  if ("response" in authResult) {
    return authResult.response;
  }

  return apiSuccess({
    user: authResult.auth.user,
    isBuyerToken: !!authResult.auth.isBuyerToken,
  });
}
