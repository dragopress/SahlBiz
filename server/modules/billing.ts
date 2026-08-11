import express from "express";
import { z } from "zod";
import { Sale, Invoice, Payment } from "../types";

export const billingRouter = express.Router();

// Billing Zod Schemas
const saleSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    tvaRate: z.number().default(20),
    discount: z.number().default(0)
  })).min(1),
  paymentMethod: z.enum(["cash", "check", "traite", "cmi_card", "transfer", "kreddy"]),
  amountPaid: z.number().nonnegative()
});

const invoiceSchema = z.object({
  customerId: z.string(),
  customerName: z.string(),
  dueDate: z.string(),
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    tvaRate: z.number().default(20),
    discount: z.number().default(0)
  })).min(1),
  type: z.enum(["devis", "facture", "bl", "commande"]).default("facture")
});

const paymentSchema = z.object({
  entityType: z.enum(["sale", "invoice", "expense", "purchase", "kreddy"]),
  entityId: z.string(),
  amount: z.number().positive(),
  method: z.enum(["cash", "check", "traite", "cmi_card", "transfer", "kreddy"]),
  reference: z.string().optional()
});

// Billing, Invoicing, and Payments Service Boundary
export class BillingService {
  private static sales: Map<string, Sale[]> = new Map();
  private static invoices: Map<string, Invoice[]> = new Map();
  private static payments: Map<string, Payment[]> = new Map();

  static async getSales(orgId: string): Promise<Sale[]> {
    if (!this.sales.has(orgId)) {
      this.sales.set(orgId, []);
    }
    return this.sales.get(orgId) || [];
  }

  static async createSale(orgId: string, data: any): Promise<Sale> {
    const list = await this.getSales(orgId);
    
    let subtotalHt = 0;
    let totalTva = 0;
    for (const item of data.items) {
      const lineCost = item.quantity * item.unitPrice - (item.discount || 0);
      subtotalHt += lineCost;
      totalTva += lineCost * (item.tvaRate / 100);
    }
    const totalTtc = subtotalHt + totalTva;

    const newSale: Sale = {
      id: `sale_${Math.random().toString(36).substring(2, 9)}`,
      number: `SL-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      customerId: data.customerId,
      customerName: data.customerName,
      items: data.items,
      subtotalHt,
      totalTva,
      totalTtc,
      paymentMethod: data.paymentMethod,
      amountPaid: data.amountPaid || totalTtc,
      orgId
    };

    list.push(newSale);
    this.sales.set(orgId, list);
    return newSale;
  }

  static async getInvoices(orgId: string): Promise<Invoice[]> {
    if (!this.invoices.has(orgId)) {
      this.invoices.set(orgId, [
        {
          id: "inv_1",
          number: "FAC-2026-0001",
          type: "facture",
          customerId: "cust_1",
          customerName: "Youssef El Amrani",
          date: new Date().toISOString(),
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          items: [{ productId: "prod_1", productName: "Thé Vert Sultan Al Kawtar", quantity: 10, unitPrice: 16.0, tvaRate: 14, discount: 0 }],
          subtotalHt: 160.0,
          totalTva: 22.4,
          totalTtc: 182.4,
          paidAmount: 0,
          remainingAmount: 182.4,
          status: "unpaid",
          orgId
        }
      ]);
    }
    return this.invoices.get(orgId) || [];
  }

  static async createInvoice(orgId: string, data: any): Promise<Invoice> {
    const list = await this.getInvoices(orgId);
    
    let subtotalHt = 0;
    let totalTva = 0;
    for (const item of data.items) {
      const lineCost = item.quantity * item.unitPrice - (item.discount || 0);
      subtotalHt += lineCost;
      totalTva += lineCost * (item.tvaRate / 100);
    }
    const totalTtc = subtotalHt + totalTva;

    const newInvoice: Invoice = {
      id: `inv_${Math.random().toString(36).substring(2, 9)}`,
      number: `FAC-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
      type: data.type || "facture",
      customerId: data.customerId,
      customerName: data.customerName,
      date: new Date().toISOString(),
      dueDate: data.dueDate,
      items: data.items,
      subtotalHt,
      totalTva,
      totalTtc,
      paidAmount: 0,
      remainingAmount: totalTtc,
      status: "unpaid",
      orgId
    };

    list.push(newInvoice);
    this.invoices.set(orgId, list);
    return newInvoice;
  }

  static async getPayments(orgId: string): Promise<Payment[]> {
    if (!this.payments.has(orgId)) {
      this.payments.set(orgId, []);
    }
    return this.payments.get(orgId) || [];
  }

  static async recordPayment(orgId: string, data: any): Promise<Payment> {
    const list = await this.getPayments(orgId);
    
    const newPayment: Payment = {
      id: `pmt_${Math.random().toString(36).substring(2, 9)}`,
      entityType: data.entityType,
      entityId: data.entityId,
      amount: data.amount,
      date: new Date().toISOString(),
      method: data.method,
      reference: data.reference,
      orgId
    };

    list.push(newPayment);
    this.payments.set(orgId, list);

    // Dynamic adjustment of invoice payment status if appropriate
    if (data.entityType === "invoice") {
      const invoicesList = await this.getInvoices(orgId);
      const invoice = invoicesList.find(i => i.id === data.entityId);
      if (invoice) {
        invoice.paidAmount += data.amount;
        invoice.remainingAmount = Math.max(0, invoice.totalTtc - invoice.paidAmount);
        invoice.status = invoice.remainingAmount === 0 ? "paid" : "partial";
        this.invoices.set(orgId, invoicesList);
      }
    }

    return newPayment;
  }
}

// Routes
billingRouter.get("/sales", async (req: any, res) => {
  const sales = await BillingService.getSales(req.user.orgId);
  res.json({ success: true, data: sales });
});

billingRouter.post("/sales", async (req: any, res) => {
  const parseResult = saleSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, details: parseResult.error.format() });
  }

  const sale = await BillingService.createSale(req.user.orgId, parseResult.data);
  res.status(201).json({ success: true, data: sale });
});

billingRouter.get("/invoices", async (req: any, res) => {
  const invoices = await BillingService.getInvoices(req.user.orgId);
  res.json({ success: true, data: invoices });
});

billingRouter.post("/invoices", async (req: any, res) => {
  const parseResult = invoiceSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, details: parseResult.error.format() });
  }

  const invoice = await BillingService.createInvoice(req.user.orgId, parseResult.data);
  res.status(201).json({ success: true, data: invoice });
});

billingRouter.get("/payments", async (req: any, res) => {
  const payments = await BillingService.getPayments(req.user.orgId);
  res.json({ success: true, data: payments });
});

billingRouter.post("/payments", async (req: any, res) => {
  const parseResult = paymentSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, details: parseResult.error.format() });
  }

  const payment = await BillingService.recordPayment(req.user.orgId, parseResult.data);
  res.status(201).json({ success: true, data: payment });
});
