// In-memory sliding window rate limiter for serverless & Express environments

interface RateLimitRecord {
  timestamps: number[];
}

const ipMap = new Map<string, RateLimitRecord>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const cleanIp = ip || 'anonymous';
  const record = ipMap.get(cleanIp) || { timestamps: [] };

  // Filter out timestamps outside the sliding window
  const validTimestamps = record.timestamps.filter((t) => now - t < WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS) {
    const oldest = validTimestamps[0];
    const resetMs = Math.max(0, WINDOW_MS - (now - oldest));
    return { allowed: false, remaining: 0, resetMs };
  }

  validTimestamps.push(now);
  ipMap.set(cleanIp, { timestamps: validTimestamps });

  // Periodically clean up stale IPs to avoid memory leaks
  if (ipMap.size > 1000) {
    for (const [key, val] of ipMap.entries()) {
      if (val.timestamps.every((t) => now - t >= WINDOW_MS)) {
        ipMap.delete(key);
      }
    }
  }

  return {
    allowed: true,
    remaining: MAX_REQUESTS - validTimestamps.length,
    resetMs: WINDOW_MS,
  };
}
