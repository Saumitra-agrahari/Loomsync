import { apiSuccess } from "@/lib/api/response";
import { createClearSessionCookie } from "@/lib/auth/session";

export async function POST() {
  const cookieHeader = createClearSessionCookie();
  return apiSuccess({ success: true }, 200, { "Set-Cookie": cookieHeader });
}
