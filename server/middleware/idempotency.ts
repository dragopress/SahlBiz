import { Request, Response, NextFunction } from "express";
import { sendStandardError, SahlBizError } from "../utils/errors";

interface IdempotentRecord {
  statusCode: number;
  responseBody: any;
  timestamp: number;
}

/**
 * In-memory idempotency cache for storing processed transactions.
 * In a distributed setup, this would be backed by a shared Redis instance.
 */
class IdempotencyCache {
  private static cache: Map<string, IdempotentRecord> = new Map();

  /**
   * Generates a deterministic idempotency key.
   */
  public static generateKey(orgId: string, deviceId: string, localTxId: string): string {
    const cleanOrg = orgId.trim().toLowerCase();
    const cleanDevice = deviceId.trim().toLowerCase();
    const cleanTx = localTxId.trim().toLowerCase();
    return `idem:${cleanOrg}:${cleanDevice}:${cleanTx}`;
  }

  public static get(key: string): IdempotentRecord | null {
    const record = this.cache.get(key);
    if (!record) return null;

    // Optional TTL: Clean up records older than 24 hours to prevent memory leaks
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (Date.now() - record.timestamp > oneDayMs) {
      this.cache.delete(key);
      return null;
    }

    return record;
  }

  public static set(key: string, statusCode: number, responseBody: any): void {
    this.cache.set(key, {
      statusCode,
      responseBody,
      timestamp: Date.now()
    });
  }
}

/**
 * Express middleware to guarantee request idempotency.
 * Expects the following headers or body parameters:
 * - X-Device-ID (or req.body.deviceId)
 * - X-Local-Transaction-ID (or req.body.localTransactionId)
 * 
 * Uses 'organizationId' from the authenticated session context.
 */
export function requireIdempotency() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as any;
    const orgId = authReq.user?.orgId;

    if (!orgId) {
      return next(); // Defer to validation middleware to handle unauthenticated sessions
    }

    // Check for x-idempotency-key header first
    const idempotencyKey = req.header("x-idempotency-key") || req.header("X-Idempotency-Key");

    let key = "";
    if (idempotencyKey) {
      key = `idem:${idempotencyKey.trim().toLowerCase()}`;
    } else {
      // Fallback: Retrieve device and local transaction identifiers from headers or body
      const deviceId = (req.header("X-Device-ID") || req.body?.deviceId || "").toString();
      const localTxId = (req.header("X-Local-Transaction-ID") || req.body?.localTransactionId || "").toString();

      // If idempotency credentials are not supplied, allow standard execution flow
      if (deviceId && localTxId) {
        key = IdempotencyCache.generateKey(orgId, deviceId, localTxId);
      }
    }

    if (!key) {
      return next();
    }

    const cachedRecord = IdempotencyCache.get(key);

    if (cachedRecord) {
      console.log(`[Idempotency Hit] Returning cached response for key: ${key}`);
      res.setHeader("X-Cache-Lookup", "HIT - Idempotency Protected");
      return res.status(cachedRecord.statusCode).json(cachedRecord.responseBody);
    }

    // Intercept express response to cache it dynamically once completed
    const originalJson = res.json;
    res.json = function (body: any) {
      // Only cache successful or client-correct status codes (avoid caching transient 5xx server issues)
      if (res.statusCode >= 200 && res.statusCode < 500) {
        IdempotencyCache.set(key, res.statusCode, body);
      }
      return originalJson.call(this, body);
    };

    next();
  };
}
