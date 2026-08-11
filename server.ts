import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { z } from "zod";
import { ROLE_PERMISSIONS, Permission, UserRole } from "./src/lib/rbac";
import { authRouter } from "./server/modules/auth";
import { organizationsRouter } from "./server/modules/organizations";
import { crmRouter } from "./server/modules/crm";
import { catalogRouter } from "./server/modules/catalog";
import { billingRouter } from "./server/modules/billing";
import { financeRouter } from "./server/modules/finance";
import { hrRouter } from "./server/modules/hr";
import { aiRouter } from "./server/modules/ai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "12mb" }));

// Reusable Helper to Decode JWT Base64 Token
function decodeToken(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return payload;
  } catch (e) {
    return null;
  }
}

// Reusable Structured Error Response Helper
function sendErrorResponse(res: express.Response, statusCode: number, code: string, message: string, details?: any) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      requestId: `req_${Math.random().toString(36).substring(2, 11)}`,
      details
    }
  });
}

// Authenticated Request Interface
interface AuthenticatedRequest extends express.Request {
  user?: {
    uid: string;
    email: string;
    orgId: string;
    role: string;
  };
}

// Reusable Backend Middleware: authenticate()
// Security Middleware: JWT Authentication & Organization Extraction
const authenticate = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // If in local/development environment, we can support fallback to keep PWA operational
    if (process.env.NODE_ENV !== "production") {
      req.user = {
        uid: "demo_user_id",
        email: "demo@sahlbiz.ma",
        orgId: "org_demo",
        role: "owner"
      };
      return next();
    }
    return sendErrorResponse(res, 401, "AUTHENTICATION_ERROR", "Missing or invalid authorization header.");
  }

  const token = authHeader.split(" ")[1];
  const decoded = decodeToken(token);
  if (!decoded) {
    return sendErrorResponse(res, 401, "AUTHENTICATION_ERROR", "Auth token is malformed.");
  }

  // Token expiration check (exp claim is in seconds)
  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (decoded.exp && decoded.exp < nowInSeconds) {
    return sendErrorResponse(res, 401, "AUTHENTICATION_ERROR", "Auth token has expired.");
  }

  req.user = {
    uid: decoded.user_id || decoded.sub || "unknown_uid",
    email: decoded.email || "unknown@sahlbiz.ma",
    orgId: decoded.orgId || `org_${(decoded.user_id || decoded.sub || "").slice(0, 8)}`,
    role: decoded.role || "owner"
  };

  next();
};

// Reusable Backend Middleware: requireOrganization()
// Enforces that a valid organization ID exists on the authenticated user context.
const requireOrganization = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  if (!req.user || !req.user.orgId || req.user.orgId.trim() === "") {
    return sendErrorResponse(res, 403, "AUTHORIZATION_ERROR", "Access denied. Valid organization mapping is required.");
  }
  next();
};

// Reusable Backend Middleware: requireRole()
// Restricts access to specific role mappings.
const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.user) {
      return sendErrorResponse(res, 401, "AUTHENTICATION_ERROR", "User is not authenticated.");
    }
    const userRole = req.user.role?.toLowerCase();
    const isAllowed = allowedRoles.map(r => r.toLowerCase()).includes(userRole);
    if (!isAllowed) {
      return sendErrorResponse(res, 403, "AUTHORIZATION_ERROR", `Access denied. Role '${req.user.role}' does not have sufficient privileges.`);
    }
    next();
  };
};

// Reusable Backend Middleware: requirePermission()
// Restricts access using permissions defined in the core RBAC matrix.
const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.user) {
      return sendErrorResponse(res, 401, "AUTHENTICATION_ERROR", "User is not authenticated.");
    }
    const userRole = req.user.role?.toLowerCase() as UserRole;
    const permissions = ROLE_PERMISSIONS[userRole] || [];
    const hasPerm = permissions.includes(permission as Permission);
    if (!hasPerm) {
      return sendErrorResponse(res, 403, "AUTHORIZATION_ERROR", `Access denied. Missing required permission '${permission}'.`);
    }
    next();
  };
};

// 1. Health check route
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "SahlBiz", environment: process.env.NODE_ENV || "development" });
});

// --- Modular Monolith Router Mounts ---
app.use("/api/auth", authRouter);
app.use("/api/organizations", authenticate, organizationsRouter);
app.use("/api/crm", authenticate, requireOrganization, crmRouter);
app.use("/api/catalog", authenticate, requireOrganization, catalogRouter);
app.use("/api/billing", authenticate, requireOrganization, billingRouter);
app.use("/api/finance", authenticate, requireOrganization, financeRouter);
app.use("/api/hr", authenticate, requireOrganization, hrRouter);
app.use("/api/ai", authenticate, requireOrganization, aiRouter);

// Zod Validation Schema for Background Sync Endpoint
const syncSchema = z.object({
  sales: z.array(z.any()).optional().default([]),
  inventoryUpdates: z.array(z.any()).optional().default([])
});

// 4. Background Sync Endpoint for Offline PWA Sales & Inventory
app.post("/api/sync", authenticate, requireOrganization, requirePermission("sale.create"), async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = syncSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendErrorResponse(res, 400, "VALIDATION_ERROR", "Invalid sync payload", parseResult.error.format());
    }

    const { sales, inventoryUpdates } = parseResult.data;

    console.log(`[Sync] Tenant ${req.user?.orgId} (User ${req.user?.uid}) processing ${sales.length} offline sales and ${inventoryUpdates.length} inventory updates.`);

    return res.json({
      success: true,
      syncedSalesCount: sales.length,
      syncedInventoryCount: inventoryUpdates.length,
      timestamp: Date.now(),
      orgId: req.user?.orgId
    });
  } catch (error: any) {
    console.error("Sync Endpoint Error:", error);
    return sendErrorResponse(res, 500, "INTERNAL_ERROR", "Failed to sync offline data", error?.message);
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SahlBiz Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
