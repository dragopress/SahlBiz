import express from "express";
import { z } from "zod";
import { Customer, CommunicationLog } from "../types";

export const crmRouter = express.Router();

// CRM Zod Schemas
const customerSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().max(30),
  pricingTier: z.enum(["standard", "wholesale", "vip"]).optional().default("standard"),
  creditLimit: z.number().optional().default(5000),
  kreddyBalance: z.number().optional().default(0)
});

const communicationSchema = z.object({
  recipientName: z.string().min(1),
  recipientPhoneOrEmail: z.string().min(1),
  type: z.enum(["whatsapp", "email", "sms"]),
  message: z.string().min(1)
});

// Customer & Communication Service Boundary
export class CRMService {
  private static customers: Map<string, Customer[]> = new Map();
  private static comms: Map<string, CommunicationLog[]> = new Map();

  static async getCustomers(orgId: string): Promise<Customer[]> {
    if (!this.customers.has(orgId)) {
      // Seed default customers for a stellar demonstration
      this.customers.set(orgId, [
        { id: "cust_1", name: "Youssef El Amrani", phone: "+212612345678", pricingTier: "standard", creditLimit: 5000, kreddyBalance: 1450, createdAt: new Date().toISOString(), orgId },
        { id: "cust_2", name: "Fatima Zahra", phone: "+212687654321", pricingTier: "wholesale", creditLimit: 20000, kreddyBalance: 0, createdAt: new Date().toISOString(), orgId }
      ]);
    }
    return this.customers.get(orgId) || [];
  }

  static async createCustomer(orgId: string, data: Partial<Customer>): Promise<Customer> {
    const list = await this.getCustomers(orgId);
    const newCustomer: Customer = {
      id: `cust_${Math.random().toString(36).substring(2, 9)}`,
      name: data.name || "Unnamed",
      phone: data.phone || "",
      pricingTier: data.pricingTier || "standard",
      creditLimit: data.creditLimit || 5000,
      kreddyBalance: data.kreddyBalance || 0,
      createdAt: new Date().toISOString(),
      orgId
    };
    list.push(newCustomer);
    this.customers.set(orgId, list);
    return newCustomer;
  }

  static async getCommunicationLogs(orgId: string): Promise<CommunicationLog[]> {
    if (!this.comms.has(orgId)) {
      this.comms.set(orgId, []);
    }
    return this.comms.get(orgId) || [];
  }

  static async logCommunication(orgId: string, log: Partial<CommunicationLog>): Promise<CommunicationLog> {
    const list = await this.getCommunicationLogs(orgId);
    const newLog: CommunicationLog = {
      id: `comm_${Math.random().toString(36).substring(2, 9)}`,
      recipientName: log.recipientName || "Unknown",
      recipientPhoneOrEmail: log.recipientPhoneOrEmail || "",
      type: log.type || "whatsapp",
      status: "sent", // Simulated immediate success
      message: log.message || "",
      date: new Date().toISOString(),
      orgId
    };
    list.push(newLog);
    this.comms.set(orgId, list);
    return newLog;
  }
}

// Routes
crmRouter.get("/customers", async (req: any, res) => {
  const customers = await CRMService.getCustomers(req.user.orgId);
  res.json({ success: true, data: customers });
});

crmRouter.post("/customers", async (req: any, res) => {
  const parseResult = customerSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, details: parseResult.error.format() });
  }

  const customer = await CRMService.createCustomer(req.user.orgId, parseResult.data);
  res.status(201).json({ success: true, data: customer });
});

crmRouter.get("/communications", async (req: any, res) => {
  const logs = await CRMService.getCommunicationLogs(req.user.orgId);
  res.json({ success: true, data: logs });
});

crmRouter.post("/communications", async (req: any, res) => {
  const parseResult = communicationSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, details: parseResult.error.format() });
  }

  const log = await CRMService.logCommunication(req.user.orgId, parseResult.data);
  res.status(201).json({ success: true, data: log });
});
