import express from "express";
import { z } from "zod";
import { ServerUser } from "../types";
import { UserRole } from "../../src/lib/rbac";
import { sendStandardError } from "../utils/errors";
import { AuthController } from "../../src/services/auth/AuthController";

export const authRouter = express.Router();

// Routes with Structured error handling delegating to controller
authRouter.post("/register", async (req: express.Request, res: express.Response) => {
  try {
    const result = await AuthController.register(req.body);
    if (!result.success) {
      const code = result.error?.code || "REGISTRATION_FAILED";
      const status = code === "INVALID_BODY" ? 400 : 403;
      return sendStandardError(res, status, code as any, result.error?.message || "Registration failed.", result.error?.details);
    }
    return res.status(201).json(result);
  } catch (error: any) {
    return sendStandardError(res, 500, "INTERNAL_ERROR", error.message);
  }
});

authRouter.post("/login", async (req: express.Request, res: express.Response) => {
  try {
    const result = await AuthController.login(req.body);
    if (!result.success) {
      const code = result.error?.code || "AUTHENTICATION_ERROR";
      const status = code === "INVALID_BODY" ? 400 : 401;
      return sendStandardError(res, status, code as any, result.error?.message || "Login failed.", result.error?.details);
    }
    return res.json(result);
  } catch (error: any) {
    return sendStandardError(res, 500, "INTERNAL_ERROR", error.message);
  }
});

authRouter.post("/verify-session", async (req: express.Request, res: express.Response) => {
  try {
    const token = req.body.token || req.headers.authorization?.split(" ")[1] || "";
    const result = await AuthController.verifySession(token);
    if (!result.success) {
      const code = result.error?.code || "AUTHENTICATION_ERROR";
      return sendStandardError(res, 401, code as any, result.error?.message || "Invalid session.");
    }
    return res.json(result);
  } catch (error: any) {
    return sendStandardError(res, 500, "INTERNAL_ERROR", error.message);
  }
});

authRouter.get("/role/:roleName", async (req: express.Request, res: express.Response) => {
  try {
    const result = await AuthController.getRoleDetails(req.params.roleName);
    if (!result.success) {
      return sendStandardError(res, 404, "NOT_FOUND", result.error?.message || "Role not found.");
    }
    return res.json(result);
  } catch (error: any) {
    return sendStandardError(res, 500, "INTERNAL_ERROR", error.message);
  }
});

authRouter.post("/context", async (req: express.Request, res: express.Response) => {
  try {
    const { userId, orgId } = req.body;
    const result = await AuthController.updateOrganizationalContext(userId, orgId);
    if (!result.success) {
      const code = result.error?.code || "VALIDATION_ERROR";
      return sendStandardError(res, 400, code as any, result.error?.message || "Context assignment failed.");
    }
    return res.json(result);
  } catch (error: any) {
    return sendStandardError(res, 500, "INTERNAL_ERROR", error.message);
  }
});

