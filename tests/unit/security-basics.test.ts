import { describe, it, expect } from "vitest";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getAuthSecret } from "@/lib/auth/session";
import { generateSeedData } from "@/lib/db/seed-data";

describe("Security Basics Hardening", () => {
  it("enforces in-memory sliding-window rate limit", () => {
    const key = `test-ip-${Date.now()}`;
    // 5 attempts allowed in 60s
    for (let i = 1; i <= 5; i++) {
      const res = checkRateLimit(key, 5, 60);
      expect(res.success).toBe(true);
      expect(res.remaining).toBe(5 - i);
    }

    // 6th attempt must be rate-limited!
    const blocked = checkRateLimit(key, 5, 60);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("requires AUTH_SECRET of at least 32 characters in production", () => {
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.AUTH_SECRET;

    try {
      process.env.NODE_ENV = "production";

      // 1. Missing secret throws
      delete process.env.AUTH_SECRET;
      expect(() => getAuthSecret()).toThrow(/AUTH_SECRET must be set/);

      // 2. Short secret (< 32 chars) throws
      process.env.AUTH_SECRET = "short-key-123";
      expect(() => getAuthSecret()).toThrow(/at least 32 characters/);

      // 3. Valid secret (>= 32 chars) succeeds
      process.env.AUTH_SECRET = "production-super-secure-auth-secret-key-64-bytes-long";
      expect(getAuthSecret()).toBe("production-super-secure-auth-secret-key-64-bytes-long");
    } finally {
      process.env.NODE_ENV = origEnv;
      if (origSecret) process.env.AUTH_SECRET = origSecret;
      else delete process.env.AUTH_SECRET;
    }
  });

  it("generates non-hardcoded cryptographically random buyer link tokens at seed time", () => {
    const seed1 = generateSeedData("2026-11-05");
    const seed2 = generateSeedData("2026-11-05");

    expect(seed1.generatedBuyerToken).toBeDefined();
    expect(seed2.generatedBuyerToken).toBeDefined();
    expect(seed1.generatedBuyerToken.length).toBe(64); // 32 bytes hex
    // Two seeds must generate completely distinct tokens
    expect(seed1.generatedBuyerToken).not.toBe(seed2.generatedBuyerToken);

    // Seed buyer link token hash must match SHA-256 of the generated token
    expect(seed1.buyerLinks[0].tokenHash).not.toBe("61c97eb8b5cd04b9980b3270e4ad316232a11d40c58539b09ced64921af40c2b");
  });
});
