/**
 * Environment configuration audit and production validation
 */

export function validateEnvironment(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const missing: string[] = [];

  if (!process.env.DATABASE_URL) {
    missing.push("DATABASE_URL");
  }

  if (!process.env.AUTH_SECRET) {
    missing.push("AUTH_SECRET");
  } else if (process.env.AUTH_SECRET.trim().length < 32) {
    throw new Error(
      "CRITICAL CONFIGURATION ERROR: AUTH_SECRET must be at least 32 characters long in production."
    );
  }

  if (missing.length > 0) {
    throw new Error(
      `CRITICAL CONFIGURATION ERROR: Required environment variables are missing in production: ${missing.join(", ")}`
    );
  }
}
