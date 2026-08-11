/**
 * SahlBiz Modular Monolith Server Types & Domain Models
 */

import { UserRole } from "../src/lib/rbac";

export interface ServerUser {
  uid: string;
  email: string;
  orgId: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends expressRequest {
  user?: ServerUser;
}

import { Request as expressRequest } from "express";

// --- Domain Models ---

export interface Organization {
  id: string;
  name: string;
  type: "retail" | "service" | "wholesale" | "artisan";
  ice?: string;
  if?: string;
  rc?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  plan: "free" | "starter" | "pro" | "business";
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  pricingTier: "standard" | "wholesale" | "vip";
  creditLimit: number;
  kreddyBalance: number;
  createdAt: string;
  orgId: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  unit: "piece" | "kg" | "liter" | "box" | "carton" | "service";
  costPrice: number;
  sellingPrice: number;
  tvaRate: 20 | 14 | 10 | 7 | 0;
  stockQty: number;
  minStockAlert: number;
  location: "magasin" | "depot" | "all";
  orgId: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  category: string;
  outstandingDebt: number;
  orgId: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  tvaRate: number;
  discount: number;
}

export interface Sale {
  id: string;
  number: string;
  date: string;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  subtotalHt: number;
  totalTva: number;
  totalTtc: number;
  paymentMethod: "cash" | "check" | "traite" | "cmi_card" | "transfer" | "kreddy";
  amountPaid: number;
  orgId: string;
}

export interface Invoice {
  id: string;
  number: string;
  type: "devis" | "facture" | "bl" | "commande";
  customerId: string;
  customerName: string;
  date: string;
  dueDate: string;
  items: SaleItem[];
  subtotalHt: number;
  totalTva: number;
  totalTtc: number;
  paidAmount: number;
  remainingAmount: number;
  status: "unpaid" | "partial" | "paid" | "overdue";
  orgId: string;
}

export interface Payment {
  id: string;
  entityType: "sale" | "invoice" | "expense" | "purchase" | "kreddy";
  entityId: string;
  amount: number;
  date: string;
  method: "cash" | "check" | "traite" | "cmi_card" | "transfer" | "kreddy";
  reference?: string;
  orgId: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  tvaRate: number;
}

export interface Purchase {
  id: string;
  number: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: PurchaseItem[];
  totalHt: number;
  totalTva: number;
  totalTtc: number;
  status: "unpaid" | "partial" | "paid";
  orgId: string;
}

export interface Expense {
  id: string;
  title: string;
  category: "loyer" | "salaires" | "matieres" | "transport" | "electricite" | "impots" | "entretiens" | "divers";
  amountHt: number;
  tvaRate: number;
  tvaAmount: number;
  amountTtc: number;
  date: string;
  vendorName: string;
  vendorIce?: string;
  paymentMethod: "cash" | "check" | "traite" | "cmi_card" | "transfer" | "kreddy";
  orgId: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  referenceId: string; // Sale, Expense, Invoice, etc.
  referenceType: string;
  debit: number;
  credit: number;
  accountCode: string; // Standard Moroccan Plan Comptable
  orgId: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  cin: string;
  cnssNumber?: string;
  phone: string;
  baseSalary: number;
  orgId: string;
}

export interface PayrollSlip {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string; // e.g. "2026-08"
  baseSalary: number;
  cnssDeduction: number;
  amoDeduction: number;
  irDeduction: number;
  netSalary: number;
  status: "draft" | "approved" | "paid";
  orgId: string;
}

export interface Subscription {
  id: string;
  orgId: string;
  plan: "free" | "starter" | "pro" | "business";
  status: "active" | "suspended" | "trialing";
  expiresAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string; // e.g. "CREATE_SALE", "DELETE_PRODUCT"
  details: string;
  timestamp: string;
  orgId: string;
}

export interface CommunicationLog {
  id: string;
  recipientName: string;
  recipientPhoneOrEmail: string;
  type: "whatsapp" | "email" | "sms";
  status: "sent" | "failed" | "pending";
  message: string;
  date: string;
  orgId: string;
}
