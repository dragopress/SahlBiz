import { Request, Response, NextFunction } from "express";

export type SahlBizErrorCode =
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_ERROR"
  | "AUTHORIZATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "DUPLICATE_TRANSACTION"
  | "BUSINESS_RULE_VIOLATION"
  | "INSUFFICIENT_STOCK"
  | "PAYMENT_ERROR"
  | "OFFLINE_ERROR"
  | "AI_ERROR"
  | "OCR_ERROR"
  | "INTERNAL_ERROR";

/**
 * Standard custom error class for SahlBiz Modular Monolith backend.
 */
export class SahlBizError extends Error {
  public readonly code: SahlBizErrorCode;
  public readonly statusCode: number;
  public readonly details: any;

  constructor(
    code: SahlBizErrorCode,
    message: string,
    statusCode: number = 500,
    details?: any
  ) {
    super(message);
    this.name = "SahlBizError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  // Common subclasses factory helpers
  static validation(message: string, details?: any): SahlBizError {
    return new SahlBizError("VALIDATION_ERROR", message, 400, details);
  }

  static authentication(message: string = "User authentication failed."): SahlBizError {
    return new SahlBizError("AUTHENTICATION_ERROR", message, 401);
  }

  static authorization(message: string = "Not authorized to perform this operation."): SahlBizError {
    return new SahlBizError("AUTHORIZATION_ERROR", message, 403);
  }

  static notFound(message: string): SahlBizError {
    return new SahlBizError("NOT_FOUND", message, 404);
  }

  static conflict(message: string): SahlBizError {
    return new SahlBizError("CONFLICT", message, 409);
  }

  static duplicateTransaction(message: string): SahlBizError {
    return new SahlBizError("DUPLICATE_TRANSACTION", message, 409);
  }

  static businessRuleViolation(message: string, details?: any): SahlBizError {
    return new SahlBizError("BUSINESS_RULE_VIOLATION", message, 422, details);
  }

  static insufficientStock(message: string = "Insufficient stock for this product.", details?: any): SahlBizError {
    return new SahlBizError("INSUFFICIENT_STOCK", message, 422, details);
  }

  static paymentError(message: string, details?: any): SahlBizError {
    return new SahlBizError("PAYMENT_ERROR", message, 402, details);
  }

  static offlineError(message: string): SahlBizError {
    return new SahlBizError("OFFLINE_ERROR", message, 503);
  }

  static aiError(message: string, details?: any): SahlBizError {
    return new SahlBizError("AI_ERROR", message, 500, details);
  }

  static ocrError(message: string, details?: any): SahlBizError {
    return new SahlBizError("OCR_ERROR", message, 500, details);
  }

  static internal(message: string = "An unexpected internal server error occurred."): SahlBizError {
    return new SahlBizError("INTERNAL_ERROR", message, 500);
  }
}

/**
 * Reusable helper to systematically format and return a unified error response.
 */
export function sendStandardError(
  res: Response,
  statusCode: number,
  code: SahlBizErrorCode,
  message: string,
  details?: any
) {
  const requestId = `req_${Math.random().toString(36).substring(2, 11)}`;
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      requestId,
      ...(details ? { details } : {})
    }
  });
}

/**
 * Express Global Error Handling Middleware
 * Guarantees zero stack leaks or raw system information is sent to the client.
 */
export function globalErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // If headers already sent, defer to default express behavior
  if (res.headersSent) {
    return next(err);
  }

  const requestId = `req_${Math.random().toString(36).substring(2, 11)}`;

  // Handle expected SahlBiz custom business exceptions
  if (err instanceof SahlBizError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        requestId,
        ...(err.details ? { details: err.details } : {})
      }
    });
  }

  // Handle third-party/Express library errors safely
  console.error(`[Unhandled Global Error] ID: ${requestId} | Error:`, err);

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected internal error occurred on SahlBiz servers.",
      requestId
    }
  });
}
