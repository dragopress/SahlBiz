import express from "express";
import { z } from "zod";
import { Expense, JournalEntry, AuditLog } from "../types";

export const financeRouter = express.Router();

// Finance Zod Schemas
const expenseSchema = z.object({
  title: z.string().min(1).max(150),
  category: z.enum(["loyer", "salaires", "matieres", "transport", "electricite", "impots", "entretiens", "divers"]),
  amountHt: z.number().positive(),
  tvaRate: z.number().nonnegative(),
  vendorName: z.string().min(1),
  vendorIce: z.string().max(30).optional(),
  paymentMethod: z.enum(["cash", "check", "traite", "cmi_card", "transfer", "kreddy"])
});

const journalSchema = z.object({
  description: z.string().min(1),
  debit: z.number().nonnegative(),
  credit: z.number().nonnegative(),
  accountCode: z.string().min(1)
});

// Expenses, Accounting, and Audit Service Boundary
export class FinanceService {
  private static expenses: Map<string, Expense[]> = new Map();
  private static journal: Map<string, JournalEntry[]> = new Map();
  private static audits: Map<string, AuditLog[]> = new Map();

  static async getExpenses(orgId: string): Promise<Expense[]> {
    if (!this.expenses.has(orgId)) {
      this.expenses.set(orgId, [
        {
          id: "exp_1",
          title: "Loyer Local Commercial Gauthier",
          category: "loyer",
          amountHt: 6000.0,
          tvaRate: 20,
          tvaAmount: 1200.0,
          amountTtc: 7200.0,
          date: new Date().toISOString(),
          vendorName: "Société Immobilière Casa",
          vendorIce: "001569420000140",
          paymentMethod: "transfer",
          orgId
        }
      ]);
    }
    return this.expenses.get(orgId) || [];
  }

  static async createExpense(orgId: string, data: any): Promise<Expense> {
    const list = await this.getExpenses(orgId);
    
    const tvaAmount = data.amountHt * (data.tvaRate / 100);
    const amountTtc = data.amountHt + tvaAmount;

    const newExpense: Expense = {
      id: `exp_${Math.random().toString(36).substring(2, 9)}`,
      title: data.title,
      category: data.category,
      amountHt: data.amountHt,
      tvaRate: data.tvaRate,
      tvaAmount,
      amountTtc,
      date: new Date().toISOString(),
      vendorName: data.vendorName,
      vendorIce: data.vendorIce,
      paymentMethod: data.paymentMethod,
      orgId
    };

    list.push(newExpense);
    this.expenses.set(orgId, list);

    // Auto-journalize expense based on standard Moroccan Plan Comptable (Classe 6 - Charges)
    let accountCode = "6111"; // Achats de marchandises
    if (data.category === "loyer") accountCode = "6131"; // Locations
    else if (data.category === "salaires") accountCode = "6171"; // Rémunérations du personnel
    else if (data.category === "transport") accountCode = "6142"; // Transports de personnel
    else if (data.category === "electricite") accountCode = "6133"; // Eau, électricité

    await this.addJournalEntry(orgId, {
      description: `Charge: ${data.title}`,
      referenceId: newExpense.id,
      referenceType: "expense",
      debit: amountTtc,
      credit: 0,
      accountCode
    });

    return newExpense;
  }

  static async getJournalEntries(orgId: string): Promise<JournalEntry[]> {
    if (!this.journal.has(orgId)) {
      this.journal.set(orgId, []);
    }
    return this.journal.get(orgId) || [];
  }

  static async addJournalEntry(orgId: string, data: any): Promise<JournalEntry> {
    const list = await this.getJournalEntries(orgId);
    const entry: JournalEntry = {
      id: `jrnl_${Math.random().toString(36).substring(2, 9)}`,
      date: new Date().toISOString(),
      description: data.description,
      referenceId: data.referenceId || "none",
      referenceType: data.referenceType || "manual",
      debit: data.debit || 0,
      credit: data.credit || 0,
      accountCode: data.accountCode,
      orgId
    };
    list.push(entry);
    this.journal.set(orgId, list);
    return entry;
  }

  static async getAuditLogs(orgId: string): Promise<AuditLog[]> {
    if (!this.audits.has(orgId)) {
      this.audits.set(orgId, []);
    }
    return this.audits.get(orgId) || [];
  }

  static async logAuditAction(orgId: string, userId: string, userEmail: string, action: string, details: string): Promise<AuditLog> {
    const list = await this.getAuditLogs(orgId);
    const newLog: AuditLog = {
      id: `aud_${Math.random().toString(36).substring(2, 9)}`,
      userId,
      userEmail,
      action,
      details,
      timestamp: new Date().toISOString(),
      orgId
    };
    list.push(newLog);
    this.audits.set(orgId, list);
    return newLog;
  }
}

// Routes
financeRouter.get("/expenses", async (req: any, res) => {
  const expenses = await FinanceService.getExpenses(req.user.orgId);
  res.json({ success: true, data: expenses });
});

financeRouter.post("/expenses", async (req: any, res) => {
  const parseResult = expenseSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, details: parseResult.error.format() });
  }

  const expense = await FinanceService.createExpense(req.user.orgId, parseResult.data);
  
  // Log critical creation action to the audit logs boundary
  await FinanceService.logAuditAction(
    req.user.orgId,
    req.user.uid,
    req.user.email,
    "CREATE_EXPENSE",
    `Recorded expense '${expense.title}' of ${expense.amountTtc} MAD`
  );

  res.status(201).json({ success: true, data: expense });
});

financeRouter.get("/journal", async (req: any, res) => {
  const entries = await FinanceService.getJournalEntries(req.user.orgId);
  res.json({ success: true, data: entries });
});

financeRouter.get("/audit", async (req: any, res) => {
  const logs = await FinanceService.getAuditLogs(req.user.orgId);
  res.json({ success: true, data: logs });
});
