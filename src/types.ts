/**
 * SahlBiz - Moroccan Business Operating System
 * Shared Types & Interfaces
 */

export type Language = 'fr' | 'ar' | 'dar' | 'en';

export interface BusinessProfile {
  name: string;
  type: 'retail' | 'service' | 'wholesale' | 'artisan';
  ice: string; // 15 digits Identifiant Commun de l'Entreprise
  if: string;  // Identifiant Fiscal
  rc: string;  // Registre du Commerce
  rcCity: string;
  patente: string; // Taxe Professionnelle
  cnss: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  logoUrl?: string;
  bankName: string;
  bankRib: string;
  defaultTvaRate: number; // 20, 14, 10, 7, 0
  plan: 'free' | 'starter' | 'pro' | 'business';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  ice?: string; // For B2B clients
  address?: string;
  city?: string;
  pricingTier: 'standard' | 'wholesale' | 'vip';
  creditLimit: number; // Max allowed Kreddy in MAD
  kreddyBalance: number; // Current unpaid debt in MAD
  createdAt: string;
  notes?: string;
}

export type TvaRate = 20 | 14 | 10 | 7 | 0;

export interface ProductVariant {
  id: string;
  sku: string;
  barcode: string;
  attributes: { [attributeName: string]: string }; // e.g. { "Taille": "XL", "Couleur": "Noir" }
  costPrice?: number;
  sellingPrice: number;
  stockQty: number;
  minStockAlert?: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  unit: 'piece' | 'kg' | 'liter' | 'box' | 'carton' | 'service';
  costPrice: number; // Prix d'achat / PUMP in MAD
  sellingPrice: number; // Prix de vente HT in MAD
  tvaRate: TvaRate;
  stockQty: number;
  minStockAlert: number;
  location: 'magasin' | 'depot' | 'all';
  imageUrl?: string;
  hasVariants?: boolean;
  variantAttributes?: string[]; // e.g., ["Taille", "Couleur"]
  variants?: ProductVariant[];
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email?: string;
  ice?: string;
  address?: string;
  category: string;
  outstandingDebt: number; // Debt owed to supplier in MAD
}

export type DocumentType = 'devis' | 'facture' | 'bl' | 'commande';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';
export type PaymentMethod = 'cash' | 'check' | 'traite' | 'cmi_card' | 'transfer' | 'kreddy';

export interface DocumentItem {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPriceHt: number;
  tvaRate: TvaRate;
  totalHt: number;
  totalTva: number;
  totalTtc: number;
}

export interface BusinessDocument {
  id: string;
  number: string; // e.g., FAC-2026-001 or DEV-2026-042
  type: DocumentType;
  customerId: string;
  customerName: string;
  customerIce?: string;
  date: string;
  dueDate: string;
  items: DocumentItem[];
  subtotalHt: number;
  totalTva: number;
  droitDeTimbre: number; // 0.25% if cash > regulatory limits
  totalTtc: number;
  paidAmount: number;
  remainingAmount: number;
  status: PaymentStatus;
  paymentMethod?: PaymentMethod;
  notes?: string;
  convertedFromId?: string; // Devis ID converted to Facture
}

export type ExpenseCategory = 
  | 'loyer'          // Rent
  | 'salaires'       // Salaries
  | 'matieres'       // Raw Materials / Stock Purchase
  | 'transport'      // Transport & Delivery
  | 'electricite'    // Water / Electricity / Internet
  | 'impots'         // Taxes / Patente
  | 'entretiens'     // Repairs & Maintenance
  | 'divers';        // Miscellaneous

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amountHt: number;
  tvaRate: TvaRate;
  tvaAmount: number;
  amountTtc: number;
  date: string;
  vendorName: string;
  vendorIce?: string;
  supplierName?: string;
  supplierIce?: string;
  paymentMethod: PaymentMethod;
  receiptUrl?: string;
  isTaxDeductible?: boolean;
  isDeductible?: boolean;
  notes?: string;
  
  // Recurring features
  isRecurring?: boolean;
  recurringInterval?: 'monthly';
  nextOccurrenceDate?: string; // YYYY-MM-DD
  recurringStatus?: 'active' | 'completed' | 'cancelled';
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  cin: string;
  cnssNumber: string;
  phone: string;
  baseSalary: number; // Monthly base salary in MAD
  attendanceToday?: boolean;
  hireDate?: string;
  status?: 'active' | 'leave' | 'inactive';
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'half_day' | 'late';
  checkIn?: string;
  checkOut?: string;
  notes?: string;
}

export interface Payslip {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string; // YYYY-MM
  baseSalary: number;
  overtimeHours: number;
  overtimePay: number;
  advancesDeducted: number; // Avance sur salaire
  cnssEmployeeShare: number; // 3.96%
  amoEmployeeShare: number;  // 2.26%
  netPayable: number;
  cnssEmployerShare: number; // 8.98%
  status: 'draft' | 'paid';
  paymentDate?: string;
}

export interface CashRegisterSession {
  id: string;
  openedAt: string;
  closedAt?: string;
  initialCash: number; // Fond de caisse
  totalSalesCash: number;
  totalSalesCard: number;
  totalSalesCheck: number;
  totalSalesKreddy: number;
  cashAddedManually: number; // Cash in
  cashWithdrawnManually: number; // Cash out
  expectedCash: number;
  actualCash?: number;
  discrepancy?: number; // Ecart de caisse
  status: 'open' | 'closed';
}

export interface WhatsAppTemplate {
  id: string;
  title: string;
  type: 'kreddy_reminder' | 'invoice_send' | 'devis_send' | 'order_confirm';
  contentFr: string;
  contentAr: string;
  contentDar: string;
}

export interface PricingPlan {
  id: 'free' | 'starter' | 'pro' | 'business';
  name: string;
  priceMad: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  maxUsers: number;
  maxInvoicesPerMonth: number | 'unlimited';
  kreddyWaDirect: boolean;
  offlinePos: boolean;
  aiVoicePrompts: number | 'unlimited';
  accountantExport: boolean;
  badge?: string;
}
