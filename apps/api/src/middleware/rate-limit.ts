import type { Request, RequestHandler } from "express";

export interface RateLimitOptions {
  enabled: boolean;
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: Request) => string;
  now?: () => number;
  skip?: (request: Request) => boolean;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export function createRateLimitMiddleware(options: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, RateLimitBucket>();
  const now = options.now ?? Date.now;
  const keyGenerator = options.keyGenerator ?? defaultKeyGenerator;

  return (request, response, next) => {
    if (!options.enabled || options.skip?.(request)) {
      next();
      return;
    }

    const currentTime = now();
    const key = keyGenerator(request);
    const current = buckets.get(key);
    const bucket =
      current && current.resetAt > currentTime
        ? current
        : {
            count: 0,
            resetAt: currentTime + options.windowMs,
          };

    bucket.count += 1;
    buckets.set(key, bucket);

    const remaining = Math.max(options.maxRequests - bucket.count, 0);
    response.setHeader("X-RateLimit-Limit", String(options.maxRequests));
    response.setHeader("X-RateLimit-Remaining", String(remaining));
    response.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > options.maxRequests) {
      response.setHeader(
        "Retry-After",
        String(Math.max(1, Math.ceil((bucket.resetAt - currentTime) / 1000))),
      );
      response.status(429).json({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Please try again later.",
        },
      });
      return;
    }

    cleanupExpiredBuckets(buckets, currentTime);
    next();
  };
}

function defaultKeyGenerator(request: Request) {
  return request.ip || request.socket.remoteAddress || "unknown";
}

function cleanupExpiredBuckets(buckets: Map<string, RateLimitBucket>, now: number) {
  if (buckets.size < 1000) {
    return;
  }

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
