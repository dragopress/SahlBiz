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

export interface CreditLedgerEntry {
  id: string;
  customerId: string;
  type: 'opening_balance' | 'credit_sale' | 'payment' | 'return' | 'adjustment_plus' | 'adjustment_minus';
  amount: number;
  referenceType?: 'invoice' | 'payment' | 'credit_note' | 'debit_note' | 'manual' | 'refund';
  referenceId?: string;
  createdAt: string; // ISO String
  createdBy: string; // Email or name of the user who performed the action
  notes?: string;
  orgId: string;
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

export type DocumentType = 'devis' | 'facture' | 'bl' | 'commande' | 'credit_note' | 'debit_note';
export type PaymentStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'unpaid' | 'partial';
export type PaymentMethod = 'cash' | 'check' | 'traite' | 'cmi_card' | 'transfer' | 'kreddy' | 'split';

export interface DocPaymentAllocation {
  id: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
}

export interface CreditNote {
  id: string;
  number: string; // e.g., AVO-2026-0001
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  amount: number;
  reason: string;
  items?: DocumentItem[];
}

export interface DebitNote {
  id: string;
  number: string; // e.g., DEB-2026-0001
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  amount: number;
  reason: string;
  items?: DocumentItem[];
}

export interface InvoiceAuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string; // e.g., 'CREATED', 'STATUS_CHANGED', 'PAYMENT_ALLOCATED', 'CREDIT_NOTE_ISSUED', 'DEBIT_NOTE_ISSUED', 'CANCELLED'
  fromStatus?: PaymentStatus;
  toStatus?: PaymentStatus;
  notes?: string;
}

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
  idempotencyKey?: string;
  cancellationReason?: string;
  prefix?: string;
  seriesId?: string;
  fiscalYear?: number;
  creditNoteIds?: string[];
  debitNoteIds?: string[];
  paymentAllocations?: DocPaymentAllocation[];
  auditHistory?: InvoiceAuditEntry[];
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

export interface CashRegister {
  id: string;
  orgId: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  currentSessionId?: string;
}

export interface CashSession {
  id: string;
  orgId: string;
  registerId: string;
  registerName: string;
  openedAt: string;
  closedAt?: string;
  openingFloat: number;
  totalCashSales: number;
  totalCashRefunds: number;
  totalCashIn: number;
  totalCashOut: number;
  expectedBalance: number;
  actualBalance?: number;
  difference?: number;
  status: 'open' | 'closed';
  openedBy: string;
  closedBy?: string;
  notes?: string;
}

export interface CashMovement {
  id: string;
  orgId: string;
  sessionId: string;
  registerId: string;
  type: 'opening' | 'sale' | 'refund' | 'cash_in' | 'cash_out';
  amount: number;
  timestamp: string;
  reason: string;
  performedBy: string;
  referenceId?: string;
}

export interface CashReconciliation {
  id: string;
  orgId: string;
  sessionId: string;
  registerId: string;
  timestamp: string;
  expectedBalance: number;
  actualBalance: number;
  difference: number;
  status: 'matched' | 'discrepancy';
  reconciledBy: string;
  notes?: string;
  cashBreakdown?: {
    notes200?: number;
    notes100?: number;
    notes50?: number;
    notes20?: number;
    coins10?: number;
    coins5?: number;
    coins2?: number;
    coins1?: number;
  };
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

export type BusinessEventType =
  | 'SALE_CREATED'
  | 'SALE_CANCELLED'
  | 'SALE_RETURNED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_REFUNDED'
  | 'PURCHASE_CREATED'
  | 'PURCHASE_RECEIVED'
  | 'PURCHASE_RETURNED'
  | 'EXPENSE_RECORDED'
  | 'INVOICE_CREATED'
  | 'INVOICE_CANCELLED'
  | 'STOCK_RECEIVED'
  | 'STOCK_SOLD'
  | 'STOCK_ADJUSTED'
  | 'STOCK_RETURNED'
  | 'CUSTOMER_CREDIT_CREATED'
  | 'CUSTOMER_PAYMENT_RECEIVED'
  | 'EMPLOYEE_CREATED'
  | 'PAYSLIP_CREATED';

export interface BusinessEvent {
  id: string;
  eventType: BusinessEventType;
  timestamp: string;
  userId: string;
  userName: string;
  orgId: string;
  payload: any;
  hash: string;
  status: 'valid' | 'corrupted' | 'unverified';
}

export interface InventoryMovement {
  id: string;
  organizationId: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  type: 'purchase' | 'sale' | 'return' | 'adjustment_in' | 'adjustment_out' | 'transfer' | 'opening_balance';
  quantity: number; // Positive number representing the absolute movement quantity
  unitCost?: number;
  referenceType?: 'invoice' | 'purchase_order' | 'manual' | 'pos' | 'import';
  referenceId?: string;
  createdAt: string;
  createdBy: string;
  idempotencyKey?: string;
  notes?: string;
}


