/**
 * In-memory sliding-window rate limiter for pre-deployment hardening.
 *
 * NOTE ON SERVERLESS (Vercel):
 * In serverless environments, each runtime instance maintains its own in-memory state.
 * Consequently, limits are enforced per-instance. For a single cold instance or persistent
 * server, this strictly blocks burst attacks and brute-force attempts.
 */

type RateLimitRecord = {
  timestamps: number[];
};

const store = new Map<string, RateLimitRecord>();

// Clean up expired entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      const valid = record.timestamps.filter((t) => now - t < 300000);
      if (valid.length === 0) {
        store.delete(key);
      } else {
        record.timestamps = valid;
      }
    }
  }, 300000);
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): { success: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  let record = store.get(key);

  if (!record) {
    record = { timestamps: [] };
    store.set(key, record);
  }

  // Filter out timestamps outside the active sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldest = record.timestamps[0];
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      success: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, retryAfter),
    };
  }

  record.timestamps.push(now);
  return {
    success: true,
    remaining: maxRequests - record.timestamps.length,
    retryAfterSeconds: 0,
  };
}

export function getClientIp(req: Request): string {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "127.0.0.1";
}
