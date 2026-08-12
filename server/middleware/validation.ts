import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { sendStandardError } from "../utils/errors";

export interface ValidationSchema {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
  /**
   * Custom business constraints validation.
   * Return a string message describing the violation if failed, or null if constraints pass.
   */
  businessConstraints?: (req: Request) => Promise<string | null> | string | null;
}

/**
 * Higher-order middleware to systematically validate express requests.
 * Never directly trusts raw "req.body", "req.query", or "req.params" — replaces them with sanitized, validated objects.
 * Guarantees authenticated identity and organization parameters are present.
 */
export function validateRequest(schema: ValidationSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as any;

    // 1. Authenticated Identity Verification Check
    if (!authReq.user) {
      return sendStandardError(
        res,
        401,
        "AUTHENTICATION_ERROR",
        "Request requires an active authenticated session."
      );
    }

    // 2. Tenant Organization Verification Check
    if (!authReq.user.orgId || authReq.user.orgId.trim() === "") {
      return sendStandardError(
        res,
        403,
        "AUTHORIZATION_ERROR",
        "A valid, non-empty tenant organization claim is required to access SahlBiz services."
      );
    }

    try {
      // 3. Validate Request Params
      if (schema.params) {
        const parsed = await schema.params.safeParseAsync(req.params);
        if (!parsed.success) {
          return sendStructuredZodError(res, parsed.error);
        }
        req.params = parsed.data as any;
      }

      // 4. Validate Request Query
      if (schema.query) {
        const parsed = await schema.query.safeParseAsync(req.query);
        if (!parsed.success) {
          return sendStructuredZodError(res, parsed.error);
        }
        req.query = parsed.data as any;
      }

      // 5. Validate Request Body (Ensuring req.body is replaced with validated Zod outputs)
      if (schema.body) {
        const parsed = await schema.body.safeParseAsync(req.body);
        if (!parsed.success) {
          return sendStructuredZodError(res, parsed.error);
        }
        req.body = parsed.data;
      }

      // 6. Business Constraints Check
      if (schema.businessConstraints) {
        const violationMessage = await schema.businessConstraints(req);
        if (violationMessage) {
          return sendStandardError(
            res,
            422,
            "BUSINESS_RULE_VIOLATION",
            violationMessage
          );
        }
      }

      next();
    } catch (err: any) {
      return sendStandardError(
        res,
        500,
        "INTERNAL_ERROR",
        err.message || "An unexpected error occurred during request validation checks."
      );
    }
  };
}

/**
 * Reusable helper to send formatted, structured error details for failed Zod parses.
 */
function sendStructuredZodError(res: Response, error: ZodError) {
  const formattedDetails = error.issues.map(err => ({
    field: err.path.join("."),
    issue: err.message,
    code: err.code
  }));

  return sendStandardError(
    res,
    400,
    "VALIDATION_ERROR",
    "The provided request structure failed semantic or type verification rules.",
    formattedDetails
  );
}
