import express from "express";
import { z } from "zod";
import { Organization, Subscription } from "../types";

export const organizationsRouter = express.Router();

// Organization Zod Schemas
const updateOrgSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["retail", "service", "wholesale", "artisan"]),
  ice: z.string().max(30).optional(),
  if: z.string().max(30).optional(),
  rc: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional()
});

const subscriptionSchema = z.object({
  plan: z.enum(["free", "starter", "pro", "business"]),
  status: z.enum(["active", "suspended", "trialing"])
});

// Organization Service & Repository Boundary
export class OrganizationService {
  private static organizations: Map<string, Organization> = new Map([
    ["org_demo", { id: "org_demo", name: "Épicerie Al Massira", type: "retail", ice: "001829381000019", plan: "starter" }],
    ["org_demo_monolith", { id: "org_demo_monolith", name: "Monolith Wholesale Sarl", type: "wholesale", plan: "pro" }]
  ]);

  private static subscriptions: Map<string, Subscription> = new Map([
    ["org_demo", { id: "sub_1", orgId: "org_demo", plan: "starter", status: "active", expiresAt: "2027-08-11T12:00:00Z" }],
    ["org_demo_monolith", { id: "sub_2", orgId: "org_demo_monolith", plan: "pro", status: "active", expiresAt: "2027-08-11T12:00:00Z" }]
  ]);

  static async getById(orgId: string): Promise<Organization | null> {
    return this.organizations.get(orgId) || null;
  }

  static async update(orgId: string, updates: Partial<Organization>): Promise<Organization> {
    const existing = this.organizations.get(orgId) || { id: orgId, name: "SahlBiz Customer", type: "retail", plan: "free" };
    const updated = { ...existing, ...updates };
    this.organizations.set(orgId, updated);
    return updated;
  }

  static async getSubscription(orgId: string): Promise<Subscription | null> {
    return this.subscriptions.get(orgId) || null;
  }

  static async updateSubscription(orgId: string, plan: "free" | "starter" | "pro" | "business", status: "active" | "suspended" | "trialing"): Promise<Subscription> {
    const updated: Subscription = {
      id: `sub_${Math.random().toString(36).substring(2, 9)}`,
      orgId,
      plan,
      status,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    this.subscriptions.set(orgId, updated);
    
    // Update the organization's current plan dynamically as well
    const org = await this.getById(orgId);
    if (org) {
      org.plan = plan;
      this.organizations.set(orgId, org);
    }

    return updated;
  }
}

// Routes with Middleware validations
organizationsRouter.get("/profile", async (req: any, res) => {
  const orgId = req.user?.orgId;
  if (!orgId) return res.status(401).json({ success: false, message: "Missing organization claim." });
  
  const profile = await OrganizationService.getById(orgId);
  return res.json({ success: true, data: profile || { id: orgId, name: "Unconfigured Org", type: "retail", plan: "free" } });
});

organizationsRouter.put("/profile", async (req: any, res) => {
  const orgId = req.user?.orgId;
  if (!orgId) return res.status(401).json({ success: false, message: "Missing organization claim." });

  const parseResult = updateOrgSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, details: parseResult.error.format() });
  }

  const updatedProfile = await OrganizationService.update(orgId, parseResult.data);
  return res.json({ success: true, data: updatedProfile });
});

organizationsRouter.get("/subscription", async (req: any, res) => {
  const orgId = req.user?.orgId;
  const sub = await OrganizationService.getSubscription(orgId);
  return res.json({ success: true, data: sub || { orgId, plan: "free", status: "active", expiresAt: "Unlimited" } });
});

// Admin-only subscription upgrading route
organizationsRouter.post("/subscription/upgrade", async (req: any, res) => {
  // Gate check: Only SahlBiz global admins can write premium logs directly
  if (req.user?.role !== "admin" && req.user?.email !== "admin@sahlbiz.ma") {
    return res.status(403).json({ success: false, error: "ACCESS_DENIED", message: "Only SahlBiz admins can manage active subscriptions." });
  }

  const parseResult = subscriptionSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, details: parseResult.error.format() });
  }

  const updatedSub = await OrganizationService.updateSubscription(req.user.orgId, parseResult.data.plan, parseResult.data.status);
  return res.json({ success: true, data: updatedSub });
});
