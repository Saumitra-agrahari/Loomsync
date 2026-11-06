import crypto from "crypto";
import { store } from "../db/store";
import type { User, UserRole, UserLocale } from "../db/types";

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret || secret.trim().length < 32) {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION ERROR: AUTH_SECRET must be set and be at least 32 characters in production."
      );
    }
    return secret;
  }
  return secret || "dev-insecure-secret-tiruppur-order-tracker-key-32b";
}

const SESSION_COOKIE_NAME = "tna_session";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  buyerId?: string | null;
  unitId?: string | null;
  locale: UserLocale;
  exp: number;
};

export type AuthContext = {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    buyerId?: string | null;
    unitId?: string | null;
    locale: UserLocale;
  };
  isBuyerToken?: boolean;
};

/**
 * Sign payload using HMAC-SHA256
 */
export function signSession(payload: SessionPayload): string {
  const secret = getAuthSecret();
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
}

/**
 * Verify and unpack session token
 */
export function verifySession(token: string): SessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [data, signature] = parts;
    const secret = getAuthSecret();
    const expectedSig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
    const payload: SessionPayload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Hash raw buyer link token (SHA-256)
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Get authenticated user or buyer context from Request
 */
export function getAuthContextFromRequest(req: Request): AuthContext | null {
  // 1. Check for buyer token in Authorization header or URL query
  const url = new URL(req.url);
  const authHeader = req.headers.get("authorization");
  let bearerToken: string | null = null;
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    bearerToken = authHeader.substring(7).trim();
  } else if (url.searchParams.has("token")) {
    bearerToken = url.searchParams.get("token");
  }

  if (bearerToken) {
    const hashed = hashToken(bearerToken);
    const buyerLink = store.getBuyerLinkByTokenHash(hashed);
    if (buyerLink && new Date(buyerLink.expiresAt) > new Date()) {
      const buyer = store.getBuyerById(buyerLink.buyerId);
      if (buyer) {
        return {
          user: {
            id: `token-${buyerLink.id}`,
            email: `buyer-${buyer.name.toLowerCase().replace(/\s+/g, "")}@link.token`,
            name: `${buyer.name} (Access Link)`,
            role: "buyer",
            buyerId: buyer.id,
            unitId: null,
            locale: "en",
          },
          isBuyerToken: true,
        };
      }
    }
  }

  // 2. Check for cookie
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, decodeURIComponent(v.join("="))];
    })
  );

  const sessionToken = cookies[SESSION_COOKIE_NAME];
  if (!sessionToken) return null;

  const payload = verifySession(sessionToken);
  if (!payload) return null;

  const user = store.getUserById(payload.userId);
  if (user && !user.active) return null;

  return {
    user: {
      id: user?.id || payload.userId,
      email: user?.email || payload.email,
      name: user?.name || payload.name,
      role: (user?.role || payload.role) as UserRole,
      buyerId: user?.buyerId !== undefined ? user.buyerId : payload.buyerId,
      unitId: user?.unitId !== undefined ? user.unitId : payload.unitId,
      locale: (user?.locale || payload.locale) as UserLocale,
    },
    isBuyerToken: false,
  };
}

export function createSessionCookie(payload: SessionPayload): string {
  const token = signSession(payload);
  const isProd = process.env.NODE_ENV === "production";
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${
    isProd ? "; Secure" : ""
  }`;
}

export function createClearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
