import { z } from "zod";
import bcrypt from "bcryptjs";
import * as repo from "@/lib/db/repo";
import { apiError, apiSuccess } from "@/lib/api/response";
import { createSessionCookie, type SessionPayload } from "@/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(`login:${clientIp}`, 5, 60);
    if (!rateCheck.success) {
      return apiError(
        "RATE_LIMITED",
        "Too many login attempts. Please wait 1 minute before trying again.",
        429,
        undefined,
        { "Retry-After": String(rateCheck.retryAfterSeconds) }
      );
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      parsed.error.errors.forEach((e) => {
        const path = e.path.join(".");
        fields[path] = e.message;
      });
      return apiError("VALIDATION", "Invalid input parameters", 400, fields);
    }

    const { email, password } = parsed.data;
    const user = await repo.getUserByEmail(email);

    // Generic error message to prevent user enumeration
    if (!user || !user.active) {
      return apiError("UNAUTHORIZED", "Invalid email or password", 401);
    }

    const validPassword = bcrypt.compareSync(password, user.passwordHash);
    if (!validPassword) {
      return apiError("UNAUTHORIZED", "Invalid email or password", 401);
    }

    const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days
    const payload: SessionPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      buyerId: user.buyerId,
      unitId: user.unitId,
      locale: user.locale,
      exp,
    };

    const cookieHeader = createSessionCookie(payload);

    return apiSuccess(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          buyerId: user.buyerId,
          unitId: user.unitId,
          locale: user.locale,
        },
      },
      200,
      { "Set-Cookie": cookieHeader }
    );
  } catch (err: any) {
    return apiError("INTERNAL_ERROR", err.message || "Failed to log in", 500);
  }
}
