import { UserRole } from "../../lib/rbac";
export * from "./auth";

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

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  tvaRate: number;
  discount: number;
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
