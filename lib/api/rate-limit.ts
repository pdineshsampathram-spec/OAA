const tracker = new Map<string, { count: number; resetTime: number }>();

/**
 * Removes expired rate limit records to prevent memory leaks.
 */
function cleanupExpiredRecords(): void {
  const now = Date.now();
  tracker.forEach((record, ip) => {
    if (now > record.resetTime) {
      tracker.delete(ip);
    }
  });
}

/**
 * Checks if a request from a given IP address exceeds the rate limit.
 * @param ip IP address of the requester.
 * @param limit Maximum number of requests allowed in the window.
 * @param windowMs Window size in milliseconds.
 */
export function rateLimitCheck(
  ip: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();

  // Simple memory protection threshold
  if (tracker.size > 1000) {
    cleanupExpiredRecords();
  }

  const record = tracker.get(ip);

  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs;
    tracker.set(ip, { count: 1, resetTime });
    return { allowed: true };
  }

  if (record.count >= limit) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count += 1;
  return { allowed: true };
}
