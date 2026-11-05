import { NextResponse } from "next/server";
import { getAuthContextFromRequest, type AuthContext } from "../auth/session";
import type { UserRole } from "../db/types";

export type ApiErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export function apiSuccess<T>(data: T, status: number = 200, extraHeaders?: Record<string, string>) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number = 400,
  fields?: Record<string, string>
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        fields,
      },
    },
    { status }
  );
}

export function authenticate(req: Request, allowedRoles?: UserRole[]): { auth: AuthContext } | { response: NextResponse } {
  const auth = getAuthContextFromRequest(req);
  if (!auth) {
    return {
      response: apiError("UNAUTHORIZED", "Authentication required. Please sign in.", 401),
    };
  }

  if (allowedRoles && !allowedRoles.includes(auth.user.role)) {
    return {
      response: apiError("FORBIDDEN", `Access forbidden for role ${auth.user.role}.`, 403),
    };
  }

  return { auth };
}
