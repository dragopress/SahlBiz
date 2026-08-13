import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import {
  Language,
  BusinessProfile,
  Customer,
  Product,
  ProductVariant,
  Supplier,
  BusinessDocument,
  Expense,
  Employee,
  AttendanceRecord,
  Payslip,
  CashRegisterSession,
  PaymentMethod,
  PaymentStatus,
  DocumentType,
  BusinessEvent,
  BusinessEventType,
  InventoryMovement,
  CashRegister,
  CashSession,
  CashMovement,
  CashReconciliation,
  DocumentItem,
  DocPaymentAllocation,
  InvoiceAuditEntry,
  CreditLedgerEntry
} from '../types';
import {
  saveProfileToFirestore,
  saveCustomerToFirestore,
  deleteCustomerFromFirestore,
  saveProductToFirestore,
  deleteProductFromFirestore,
  saveSupplierToFirestore,
  saveDocumentToFirestore,
  saveExpenseToFirestore,
  deleteExpenseFromFirestore,
  saveEmployeeToFirestore,
  fetchInitialFirestoreData,
  saveInventoryMovementToFirestore,
  saveCashRegisterToFirestore,
  saveCashSessionToFirestore,
  saveCashMovementToFirestore,
  saveCashReconciliationToFirestore,
  fetchCashRegistersFromFirestore,
  fetchCashSessionsFromFirestore,
  fetchCashMovementsFromFirestore,
  fetchCashReconciliationsFromFirestore,
  saveCreditLedgerEntryToFirestore,
  fetchCreditLedgerEntriesFromFirestore
} from '../lib/firestoreService';
import {
  logBusinessEvent,
  fetchBusinessEvents,
  getDemoEvents
} from '../lib/auditService';
import {
  INITIAL_BUSINESS_PROFILE,
  INITIAL_CUSTOMERS,
  INITIAL_PRODUCTS,
  INITIAL_SUPPLIERS,
  INITIAL_DOCUMENTS,
  INITIAL_EXPENSES,
  INITIAL_EMPLOYEES,
  INITIAL_ATTENDANCE,
  INITIAL_PAYSLIPS,
  INITIAL_CASH_SESSION
} from '../data/mockData';
import { calculateTva, calculateDroitDeTimbre, recalculateDocumentTotals } from '../lib/moroccanTax';
import {
  queueOfflineSale,
  queueOfflineInventoryUpdate,
  getPendingSales,
  getPendingInventoryUpdates,
  syncOfflineDataWithBackend
} from '../lib/offlineSync';

export type ModuleType =
  | 'dashboard'
  | 'crm'
  | 'invoices'
  | 'products'
  | 'purchases'
  | 'expenses'
  | 'hr'
  | 'pos'
  | 'accountant'
  | 'pricing'
  | 'settings'
  | 'admin'
  | 'audit'
  | 'cash-register';

export interface PosCartItem {
  product: Product;
  selectedVariant?: ProductVariant;
  quantity: number;
  discountPercent?: number;
  discountFixed?: number;
  customPrice?: number;
}

interface StoreContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  activeModule: ModuleType;
  setActiveModule: (mod: ModuleType) => void;
  
  profile: BusinessProfile;
  updateProfile: (profile: BusinessProfile) => void;

  customers: Customer[];
  addCustomer: (cust: Omit<Customer, 'id' | 'createdAt' | 'kreddyBalance'>) => void;
  updateCustomer: (cust: Customer) => void;
  deleteCustomer: (id: string) => void;
  adjustKreddyBalance: (customerId: string, amountChange: number, notes?: string, refType?: CreditLedgerEntry['referenceType'], refId?: string, forceType?: CreditLedgerEntry['type']) => void;
  creditLedgerEntries: CreditLedgerEntry[];
  addCreditLedgerEntry: (entry: Omit<CreditLedgerEntry, 'id' | 'createdAt' | 'createdBy' | 'orgId'>) => Promise<void>;

  products: Product[];
  addProduct: (prod: Omit<Product, 'id'>) => void;
  updateProduct: (prod: Product) => void;
  deleteProduct: (id: string) => void;
  inventoryMovements: InventoryMovement[];
  addInventoryMovement: (movement: Omit<InventoryMovement, 'id' | 'organizationId' | 'createdAt' | 'createdBy'>) => Promise<void>;

  suppliers: Supplier[];
  addSupplier: (supp: Omit<Supplier, 'id' | 'outstandingDebt'>) => void;
  updateSupplier: (supp: Supplier) => void;

  documents: BusinessDocument[];
  addDocument: (doc: Omit<BusinessDocument, 'id' | 'number'>) => void;
  convertDevisToInvoice: (devisId: string) => void;
  issueDraftDocument: (docId: string) => void;
  recordDocumentPayment: (docId: string, amount: number, method: PaymentMethod, reference?: string, notes?: string) => void;
  cancelDocument: (docId: string, reason: string) => void;
  createCreditNote: (invoiceId: string, amount: number, reason: string, items?: DocumentItem[]) => void;
  createDebitNote: (invoiceId: string, amount: number, reason: string, items?: DocumentItem[]) => void;

  expenses: Expense[];
  addExpense: (exp: Omit<Expense, 'id'>) => void;
  updateExpense: (exp: Expense) => void;
  deleteExpense: (id: string) => void;

  employees: Employee[];
  addEmployee: (emp: Omit<Employee, 'id'>) => void;
  attendance: AttendanceRecord[];
  markAttendance: (employeeId: string, status: AttendanceRecord['status'], checkIn?: string) => void;
  payslips: Payslip[];
  generatePayslip: (employeeId: string, month: string) => void;

  cashSession: CashRegisterSession;
  processPosSale: (
    cart: PosCartItem[],
    method: PaymentMethod,
    customerId?: string,
    splitAmounts?: { cash: number; card: number; check: number; kreddy: number },
    idempotencyKey?: string,
    cartDiscountPercent?: number,
    cartDiscountFixed?: number
  ) => { success: boolean; error?: string; doc?: BusinessDocument };
  closeCashSession: (actualCash: number) => void;
  openCashSession: (initialCash: number) => void;
  addCashToSession: (amount: number, reason: string) => void;
  withdrawCashFromSession: (amount: number, reason: string) => void;

  // New Cash Register, Session, Movement and Reconciliation state & actions
  cashRegisters: CashRegister[];
  addCashRegister: (reg: Omit<CashRegister, 'id' | 'orgId'>) => void;
  updateCashRegister: (reg: CashRegister) => void;
  cashSessions: CashSession[];
  openCashSessionNew: (registerId: string, openingFloat: number) => void;
  closeCashSessionNew: (sessionId: string, actualBalance: number, notes?: string, cashBreakdown?: CashReconciliation['cashBreakdown']) => void;
  cashMovements: CashMovement[];
  addCashMovement: (sessionId: string, type: CashMovement['type'], amount: number, reason: string, referenceId?: string) => void;
  cashReconciliations: CashReconciliation[];

  // Selected document viewer state
  selectedDocumentForView: BusinessDocument | null;
  setSelectedDocumentForView: (doc: BusinessDocument | null) => void;
  
  // WhatsApp modal state
  whatsAppModalData: { isOpen: boolean; phone: string; name: string; text: string } | null;
  openWhatsAppModal: (phone: string, name: string, defaultText: string) => void;
  closeWhatsAppModal: () => void;

  // PWA Offline Sync state
  isOnline: boolean;
  pendingSyncCount: number;
  triggerManualSync: () => Promise<void>;

  // Consistent Loading state tracking
  isLoadingInitialData: boolean;
  isSaving: boolean;
  setIsSaving: (saving: boolean) => void;

  // Business events audit ledger
  businessEvents: BusinessEvent[];
  setBusinessEvents: React.Dispatch<React.SetStateAction<BusinessEvent[]>>;
  triggerAuditLog: (eventType: BusinessEventType, payload: any) => Promise<void>;
}

function generateInitialMovementsFromProducts(productsList: Product[], organizationId: string): InventoryMovement[] {
  const movements: InventoryMovement[] = [];
  const nowStr = new Date().toISOString();
  
  productsList.forEach(p => {
    if (p.hasVariants && p.variants) {
      p.variants.forEach(v => {
        if (v.stockQty > 0) {
          movements.push({
            id: `mov-init-${p.id}-${v.id}`,
            organizationId,
            productId: p.id,
            productName: p.name,
            variantId: v.id,
            variantName: Object.entries(v.attributes).map(([k, v]) => `${k}: ${v}`).join(', '),
            type: 'opening_balance',
            quantity: v.stockQty,
            unitCost: v.costPrice || p.costPrice,
            referenceType: 'manual',
            createdAt: nowStr,
            createdBy: 'System'
          });
        }
      });
    } else {
      if (p.stockQty > 0) {
        movements.push({
          id: `mov-init-${p.id}`,
          organizationId,
          productId: p.id,
          productName: p.name,
          type: 'opening_balance',
          quantity: p.stockQty,
          unitCost: p.costPrice,
          referenceType: 'manual',
          createdAt: nowStr,
          createdBy: 'System'
        });
      }
    }
  });
  
  return movements;
}

function generateInitialCreditLedgerEntries(customersList: Customer[], organizationId: string): CreditLedgerEntry[] {
  const entries: CreditLedgerEntry[] = [];
  const nowStr = new Date().toISOString();
  
  customersList.forEach(c => {
    if (c.kreddyBalance > 0) {
      entries.push({
        id: `cle-init-${c.id}`,
        customerId: c.id,
        type: 'opening_balance',
        amount: c.kreddyBalance,
        referenceType: 'manual',
        referenceId: 'INIT-BAL',
        createdAt: nowStr,
        createdBy: 'System',
        notes: 'Solde de départ Kreddy (Balance d\'ouverture)',
        orgId: organizationId
      });
    }
  });
  
  return entries;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEY = 'sahlbiz_store_v1';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile } = useAuth();
  const orgId = userProfile?.orgId || (currentUser ? `org_${currentUser.uid.slice(0, 8)}` : 'org_default');

  const [language, setLanguage] = useState<Language>('fr');
  const [activeModule, setActiveModule] = useState<ModuleType>('dashboard');

  const [profile, setProfile] = useState<BusinessProfile>(INITIAL_BUSINESS_PROFILE);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [documents, setDocuments] = useState<BusinessDocument[]>(INITIAL_DOCUMENTS);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [payslips, setPayslips] = useState<Payslip[]>(INITIAL_PAYSLIPS);
  const [cashSession, setCashSession] = useState<CashRegisterSession>(INITIAL_CASH_SESSION);

  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [cashSessions, setCashSessions] = useState<CashSession[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [cashReconciliations, setCashReconciliations] = useState<CashReconciliation[]>([]);
  const [creditLedgerEntries, setCreditLedgerEntries] = useState<CreditLedgerEntry[]>([]);

  const [selectedDocumentForView, setSelectedDocumentForView] = useState<BusinessDocument | null>(null);
  const [whatsAppModalData, setWhatsAppModalData] = useState<{ isOpen: boolean; phone: string; name: string; text: string } | null>(null);

  // Offline PWA Sync state
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  // Loading states
  const [isLoadingInitialData, setIsLoadingInitialData] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [businessEvents, setBusinessEvents] = useState<BusinessEvent[]>([]);

  const triggerAuditLog = async (eventType: BusinessEventType, payload: any) => {
    try {
      const logged = await logBusinessEvent(eventType, payload, orgId);
      setBusinessEvents(prev => [logged, ...prev]);
    } catch (e) {
      console.error('Failed to write business event to audit ledger:', e);
    }
  };

  const refreshPendingCount = async () => {
    try {
      const pSales = await getPendingSales();
      const pInv = await getPendingInventoryUpdates();
      setPendingSyncCount(pSales.length + pInv.length);
    } catch (e) {
      console.warn('Failed calculating pending sync items:', e);
    }
  };

  const triggerManualSync = async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      await syncOfflineDataWithBackend();
      await refreshPendingCount();
    }
  };

  useEffect(() => {
    refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      triggerManualSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'TRIGGER_OFFLINE_SYNC') {
        triggerManualSync();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, []);

  // Load initial state from LocalStorage and Firestore
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_${orgId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.profile) setProfile(parsed.profile);
        if (parsed.customers) setCustomers(parsed.customers);
        if (parsed.products) setProducts(parsed.products);
        if (parsed.suppliers) setSuppliers(parsed.suppliers);
        if (parsed.documents) setDocuments(parsed.documents);
        if (parsed.expenses) setExpenses(parsed.expenses);
        if (parsed.employees) setEmployees(parsed.employees);
        if (parsed.attendance) setAttendance(parsed.attendance);
        if (parsed.payslips) setPayslips(parsed.payslips);
        if (parsed.cashSession) setCashSession(parsed.cashSession);
        if (parsed.inventoryMovements) setInventoryMovements(parsed.inventoryMovements);
        if (parsed.creditLedgerEntries) setCreditLedgerEntries(parsed.creditLedgerEntries);
        if (parsed.cashRegisters && parsed.cashRegisters.length > 0) {
          setCashRegisters(parsed.cashRegisters);
        } else {
          setCashRegisters([{
            id: 'register-default',
            orgId,
            name: 'Caisse Centrale',
            code: 'CAISSE-01',
            status: 'active'
          }]);
        }
        if (parsed.cashSessions) setCashSessions(parsed.cashSessions);
        if (parsed.cashMovements) setCashMovements(parsed.cashMovements);
        if (parsed.cashReconciliations) setCashReconciliations(parsed.cashReconciliations);
      }
    } catch (e) {
      console.error('Failed to load local storage state:', e);
    }

    // Try fetching remote Firestore collections for this org
    if (currentUser && orgId && orgId !== 'org_default') {
      setIsLoadingInitialData(true);
      Promise.all([
        fetchInitialFirestoreData(orgId),
        fetchBusinessEvents(orgId),
        fetchCashRegistersFromFirestore(orgId),
        fetchCashSessionsFromFirestore(orgId),
        fetchCashMovementsFromFirestore(orgId),
        fetchCashReconciliationsFromFirestore(orgId)
      ]).then(([remoteData, events, registers, sessions, movements, reconciliations]) => {
        if (remoteData) {
          if (remoteData.businessProfile) setProfile(remoteData.businessProfile);
          if (remoteData.customers && remoteData.customers.length > 0) setCustomers(remoteData.customers);
          if (remoteData.products && remoteData.products.length > 0) setProducts(remoteData.products);
          if (remoteData.suppliers && remoteData.suppliers.length > 0) setSuppliers(remoteData.suppliers);
          if (remoteData.documents && remoteData.documents.length > 0) setDocuments(remoteData.documents);
          if (remoteData.expenses && remoteData.expenses.length > 0) setExpenses(remoteData.expenses);
          if (remoteData.employees && remoteData.employees.length > 0) setEmployees(remoteData.employees);
          if (remoteData.creditLedgerEntries && remoteData.creditLedgerEntries.length > 0) {
            setCreditLedgerEntries(remoteData.creditLedgerEntries);
          } else {
            const seededEntries = generateInitialCreditLedgerEntries(remoteData.customers && remoteData.customers.length > 0 ? remoteData.customers : customers, orgId);
            setCreditLedgerEntries(seededEntries);
            seededEntries.forEach(entry => saveCreditLedgerEntryToFirestore(entry, orgId).catch(console.error));
          }
          if (remoteData.inventoryMovements && remoteData.inventoryMovements.length > 0) {
            setInventoryMovements(remoteData.inventoryMovements);
          } else {
            const seeded = generateInitialMovementsFromProducts(remoteData.products && remoteData.products.length > 0 ? remoteData.products : products, orgId);
            setInventoryMovements(seeded);
            seeded.forEach(m => saveInventoryMovementToFirestore(m, orgId).catch(console.error));
          }
        } else {
          const seeded = generateInitialMovementsFromProducts(products, orgId);
          setInventoryMovements(seeded);
        }
        if (events && events.length > 0) {
          setBusinessEvents(events);
        } else {
          setBusinessEvents(getDemoEvents(orgId));
        }

        // Handle Cash Registers remote loading
        if (registers && registers.length > 0) {
          setCashRegisters(registers);
        } else {
          const defaultReg: CashRegister = {
            id: 'register-default',
            orgId,
            name: 'Caisse Centrale',
            code: 'CAISSE-01',
            status: 'active'
          };
          setCashRegisters([defaultReg]);
          saveCashRegisterToFirestore(defaultReg, orgId).catch(console.error);
        }

        if (sessions && sessions.length > 0) {
          setCashSessions(sessions);
          // Sync open session with legacy POS cashSession
          const activeSess = sessions.find(s => s.status === 'open');
          if (activeSess) {
            setCashSession({
              id: activeSess.id,
              openedAt: activeSess.openedAt,
              initialCash: activeSess.openingFloat,
              totalSalesCash: activeSess.totalCashSales,
              totalSalesCard: 0,
              totalSalesCheck: 0,
              totalSalesKreddy: 0,
              cashAddedManually: activeSess.totalCashIn,
              cashWithdrawnManually: activeSess.totalCashOut,
              expectedCash: activeSess.expectedBalance,
              status: 'open'
            });
          }
        }
        if (movements) setCashMovements(movements);
        if (reconciliations) setCashReconciliations(reconciliations);
      })
      .catch(err => console.warn('Firestore initial sync note:', err))
      .finally(() => {
        setIsLoadingInitialData(false);
      });
    } else {
      setBusinessEvents(getDemoEvents(orgId));
      if (inventoryMovements.length === 0) {
        setInventoryMovements(generateInitialMovementsFromProducts(products, orgId));
      }
      if (creditLedgerEntries.length === 0) {
        setCreditLedgerEntries(generateInitialCreditLedgerEntries(customers, orgId));
      }
      if (cashRegisters.length === 0) {
        setCashRegisters([{
          id: 'register-default',
          orgId,
          name: 'Caisse Centrale',
          code: 'CAISSE-01',
          status: 'active'
        }]);
      }
    }
  }, [currentUser, orgId]);

  // Redirect to correct module based on user credentials (accreditation) upon successful login
  useEffect(() => {
    if (currentUser && userProfile) {
      if (userProfile.role === 'admin') {
        setActiveModule('admin');
      } else {
        setActiveModule('dashboard');
      }
    }
  }, [currentUser, userProfile]);

  // Save state on change
  useEffect(() => {
    try {
      const stateToSave = {
        profile,
        customers,
        products,
        suppliers,
        documents,
        expenses,
        employees,
        attendance,
        payslips,
        cashSession,
        inventoryMovements,
        cashRegisters,
        cashSessions,
        cashMovements,
        cashReconciliations,
        creditLedgerEntries,
      };
      localStorage.setItem(`${STORAGE_KEY}_${orgId}`, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
    }
  }, [orgId, profile, customers, products, suppliers, documents, expenses, employees, attendance, payslips, cashSession, inventoryMovements, cashRegisters, cashSessions, cashMovements, cashReconciliations, creditLedgerEntries]);

  const updateProfile = async (newProfile: BusinessProfile) => {
    setIsSaving(true);
    try {
      setProfile(newProfile);
      await saveProfileToFirestore(newProfile, orgId);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const addCustomer = async (custData: Omit<Customer, 'id' | 'createdAt' | 'kreddyBalance'>) => {
    setIsSaving(true);
    try {
      const newCust: Customer = {
        ...custData,
        id: `cust-${Date.now()}`,
        createdAt: new Date().toISOString().split('T')[0],
        kreddyBalance: 0,
      };
      setCustomers(prev => [newCust, ...prev]);
      await saveCustomerToFirestore(newCust, orgId);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const updateCustomer = async (cust: Customer) => {
    setIsSaving(true);
    try {
      setCustomers(prev => prev.map(c => c.id === cust.id ? cust : c));
      await saveCustomerToFirestore(cust, orgId);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCustomer = async (id: string) => {
    setIsSaving(true);
    try {
      setCustomers(prev => prev.filter(c => c.id !== id));
      await deleteCustomerFromFirestore(id, orgId);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const addCreditLedgerEntry = async (entryData: Omit<CreditLedgerEntry, 'id' | 'createdAt' | 'createdBy' | 'orgId'>) => {
    setIsSaving(true);
    try {
      const newEntry: CreditLedgerEntry = {
        ...entryData,
        id: `cle-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.email || 'System',
        orgId
      };

      setCreditLedgerEntries(prev => [newEntry, ...prev]);
      await saveCreditLedgerEntryToFirestore(newEntry, orgId);

      const isAdd = entryData.type === 'opening_balance' || entryData.type === 'credit_sale' || entryData.type === 'adjustment_plus';
      const delta = isAdd ? entryData.amount : -entryData.amount;

      let customerToSave: Customer | null = null;
      setCustomers(prev => prev.map(c => {
        if (c.id === entryData.customerId) {
          const updated = {
            ...c,
            kreddyBalance: Math.max(0, Number((c.kreddyBalance + delta).toFixed(2)))
          };
          customerToSave = updated;
          return updated;
        }
        return c;
      }));

      if (customerToSave) {
        await saveCustomerToFirestore(customerToSave, orgId);
      }

      await triggerAuditLog('STOCK_ADJUSTED', {
        customerId: entryData.customerId,
        type: entryData.type,
        amount: entryData.amount,
        notes: entryData.notes || 'Transaction de crédit enregistrée'
      });
    } catch (e) {
      console.error('Failed to add credit ledger entry:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const adjustKreddyBalance = async (
    customerId: string,
    amountChange: number,
    notes?: string,
    refType?: CreditLedgerEntry['referenceType'],
    refId?: string,
    forceType?: CreditLedgerEntry['type']
  ) => {
    let type: CreditLedgerEntry['type'] = 'adjustment_plus';
    if (forceType) {
      type = forceType;
    } else if (amountChange < 0) {
      if (refType === 'invoice' || refType === 'credit_note') {
        type = 'return';
      } else {
        type = 'payment';
      }
    } else {
      if (refType === 'invoice' || refType === 'debit_note') {
        type = 'credit_sale';
      } else {
        type = 'adjustment_plus';
      }
    }

    await addCreditLedgerEntry({
      customerId,
      type,
      amount: Math.abs(amountChange),
      referenceType: refType,
      referenceId: refId,
      notes: notes || (amountChange < 0 ? 'Encaisser Crédit Client' : 'Ajustement de Crédit')
    });
  };

  const addProduct = async (prodData: Omit<Product, 'id'>) => {
    setIsSaving(true);
    try {
      const newId = `prod-${Date.now()}`;
      const newProd: Product = {
        ...prodData,
        id: newId,
      };
      setProducts(prev => [newProd, ...prev]);
      await saveProductToFirestore(newProd, orgId);

      // Record Opening Balance Inventory Movements for the added product
      const nowStr = new Date().toISOString();
      if (newProd.hasVariants && newProd.variants) {
        for (const v of newProd.variants) {
          if (v.stockQty > 0) {
            const variantAttrStr = Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(', ');
            const mov: InventoryMovement = {
              id: `mov-${Date.now()}-${v.id}-${Math.floor(Math.random() * 1000)}`,
              organizationId: orgId,
              productId: newId,
              productName: newProd.name,
              variantId: v.id,
              variantName: variantAttrStr,
              type: 'opening_balance',
              quantity: v.stockQty,
              unitCost: v.costPrice || newProd.costPrice,
              referenceType: 'manual',
              createdAt: nowStr,
              createdBy: currentUser?.email || 'System'
            };
            setInventoryMovements(prev => [mov, ...prev]);
            await saveInventoryMovementToFirestore(mov, orgId);
          }
        }
      } else {
        if (newProd.stockQty > 0) {
          const mov: InventoryMovement = {
            id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            organizationId: orgId,
            productId: newId,
            productName: newProd.name,
            type: 'opening_balance',
            quantity: newProd.stockQty,
            unitCost: newProd.costPrice,
            referenceType: 'manual',
            createdAt: nowStr,
            createdBy: currentUser?.email || 'System'
          };
          setInventoryMovements(prev => [mov, ...prev]);
          await saveInventoryMovementToFirestore(mov, orgId);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const updateProduct = async (prod: Product) => {
    setIsSaving(true);
    try {
      const existing = products.find(p => p.id === prod.id);
      
      // Calculate dynamic adjustments if quantities differ!
      if (existing) {
        const nowStr = new Date().toISOString();
        if (prod.hasVariants && prod.variants) {
          for (const newV of prod.variants) {
            const oldV = existing.variants?.find(v => v.id === newV.id);
            const oldQty = oldV ? oldV.stockQty : 0;
            const diff = newV.stockQty - oldQty;
            if (diff !== 0) {
              const variantAttrStr = Object.entries(newV.attributes).map(([k, val]) => `${k}: ${val}`).join(', ');
              const mov: InventoryMovement = {
                id: `mov-${Date.now()}-${newV.id}-${Math.floor(Math.random() * 1000)}`,
                organizationId: orgId,
                productId: prod.id,
                productName: prod.name,
                variantId: newV.id,
                variantName: variantAttrStr,
                type: diff > 0 ? 'adjustment_in' : 'adjustment_out',
                quantity: Math.abs(diff),
                unitCost: newV.costPrice || prod.costPrice,
                referenceType: 'manual',
                createdAt: nowStr,
                createdBy: currentUser?.email || 'System'
              };
              setInventoryMovements(prev => [mov, ...prev]);
              await saveInventoryMovementToFirestore(mov, orgId);
            }
          }
        } else {
          const oldQty = existing.stockQty;
          const diff = prod.stockQty - oldQty;
          if (diff !== 0) {
            const mov: InventoryMovement = {
              id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              organizationId: orgId,
              productId: prod.id,
              productName: prod.name,
              type: diff > 0 ? 'adjustment_in' : 'adjustment_out',
              quantity: Math.abs(diff),
              unitCost: prod.costPrice,
              referenceType: 'manual',
              createdAt: nowStr,
              createdBy: currentUser?.email || 'System'
            };
            setInventoryMovements(prev => [mov, ...prev]);
            await saveInventoryMovementToFirestore(mov, orgId);
          }
        }
      }

      setProducts(prev => prev.map(p => p.id === prod.id ? prod : p));
      await saveProductToFirestore(prod, orgId);

      if (existing && existing.stockQty !== prod.stockQty) {
        await triggerAuditLog('STOCK_ADJUSTED', {
          productId: prod.id,
          productName: prod.name,
          quantity: prod.stockQty,
          previousQuantity: existing.stockQty
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const addInventoryMovement = async (movement: Omit<InventoryMovement, 'id' | 'organizationId' | 'createdAt' | 'createdBy'>) => {
    setIsSaving(true);
    try {
      const newMov: InventoryMovement = {
        ...movement,
        id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        organizationId: orgId,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.email || 'System'
      };
      setInventoryMovements(prev => [newMov, ...prev]);
      await saveInventoryMovementToFirestore(newMov, orgId);

      await triggerAuditLog('STOCK_ADJUSTED', {
        productId: movement.productId,
        productName: movement.productName,
        type: movement.type,
        quantity: movement.quantity,
        variantId: movement.variantId
      });
    } catch (e) {
      console.error('Failed to add inventory movement:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProduct = async (id: string) => {
    setIsSaving(true);
    try {
      setProducts(prev => prev.filter(p => p.id !== id));
      await deleteProductFromFirestore(id, orgId);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const addSupplier = async (suppData: Omit<Supplier, 'id' | 'outstandingDebt'>) => {
    setIsSaving(true);
    try {
      const newSupp: Supplier = {
        ...suppData,
        id: `supp-${Date.now()}`,
        outstandingDebt: 0,
      };
      setSuppliers(prev => [newSupp, ...prev]);
      await saveSupplierToFirestore(newSupp, orgId);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const updateSupplier = async (supp: Supplier) => {
    setIsSaving(true);
    try {
      setSuppliers(prev => prev.map(s => s.id === supp.id ? supp : s));
      await saveSupplierToFirestore(supp, orgId);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const generateSequentialNumber = (type: DocumentType, dateStr: string, currentDocs: BusinessDocument[]): string => {
    const d = dateStr ? new Date(dateStr) : new Date();
    const year = isNaN(d.getTime()) ? 2026 : d.getFullYear();
    const prefix = type === 'facture' ? 'FAC' : 
                   type === 'devis' ? 'DEV' : 
                   type === 'bl' ? 'BL' : 
                   type === 'commande' ? 'BC' : 
                   type === 'credit_note' ? 'AVO' : 'DEB';
    
    const count = currentDocs.filter(doc => {
      const docDate = doc.date ? new Date(doc.date) : new Date();
      const docYear = isNaN(docDate.getTime()) ? 2026 : docDate.getFullYear();
      return doc.type === type && docYear === year;
    }).length;

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}-${year}-${sequence}`;
  };

  const addDocument = async (docData: Omit<BusinessDocument, 'id' | 'number'>) => {
    setIsSaving(true);
    try {
      const generatedNumber = generateSequentialNumber(docData.type, docData.date, documents);
      const totals = recalculateDocumentTotals(docData.items, docData.paymentMethod, docData.paidAmount);

      const isInvoice = docData.type === 'facture';
      const initialStatus = docData.status || (totals.remainingAmount <= 0 ? 'paid' : docData.paidAmount > 0 ? 'partially_paid' : 'issued');

      const initialAudit: InvoiceAuditEntry[] = [{
        id: `audit-${Date.now()}-1`,
        timestamp: new Date().toISOString(),
        userId: currentUser?.email || 'system',
        userName: currentUser?.email?.split('@')[0] || 'System',
        action: 'CREATED',
        fromStatus: undefined,
        toStatus: initialStatus,
        notes: `Document créé avec le numéro ${generatedNumber}`
      }];

      const newDoc: BusinessDocument = {
        ...docData,
        id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        number: generatedNumber,
        subtotalHt: totals.subtotalHt,
        totalTva: totals.totalTva,
        droitDeTimbre: totals.droitDeTimbre,
        totalTtc: totals.totalTtc,
        remainingAmount: totals.remainingAmount,
        status: initialStatus,
        paymentAllocations: [],
        auditHistory: initialAudit,
        fiscalYear: docData.date ? new Date(docData.date).getFullYear() : 2026
      };

      setDocuments(prev => [newDoc, ...prev]);
      await saveDocumentToFirestore(newDoc, orgId);

      // Business Audit Logs
      if (isInvoice) {
        await triggerAuditLog('INVOICE_CREATED', {
          documentId: newDoc.id,
          documentNumber: newDoc.number,
          amountTtc: newDoc.totalTtc,
          customerName: newDoc.customerName
        });
      }

      // If invoice is unpaid/partial and set to Kreddy, update client balance
      if (isInvoice && newDoc.paymentMethod === 'kreddy' && newDoc.remainingAmount > 0) {
        await adjustKreddyBalance(
          newDoc.customerId,
          newDoc.remainingAmount,
          `Achat à crédit - Facture ${newDoc.number}`,
          'invoice',
          newDoc.id
        );
        await triggerAuditLog('CUSTOMER_CREDIT_CREATED', {
          customerId: newDoc.customerId,
          customerName: newDoc.customerName,
          amount: newDoc.remainingAmount
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const convertDevisToInvoice = async (devisId: string) => {
    setIsSaving(true);
    try {
      const devis = documents.find(d => d.id === devisId && d.type === 'devis');
      if (!devis) return;

      const invoiceNumber = generateSequentialNumber('facture', new Date().toISOString(), documents);
      const totals = recalculateDocumentTotals(devis.items, devis.paymentMethod, 0);

      const initialAudit: InvoiceAuditEntry[] = [{
        id: `audit-${Date.now()}-2`,
        timestamp: new Date().toISOString(),
        userId: currentUser?.email || 'system',
        userName: currentUser?.email?.split('@')[0] || 'System',
        action: 'CONVERTED_FROM_DEVIS',
        fromStatus: undefined,
        toStatus: 'issued',
        notes: `Converti depuis le devis ${devis.number}`
      }];

      const newInvoice: BusinessDocument = {
        ...devis,
        id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        number: invoiceNumber,
        type: 'facture',
        convertedFromId: devis.id,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        status: 'issued',
        paidAmount: 0,
        subtotalHt: totals.subtotalHt,
        totalTva: totals.totalTva,
        droitDeTimbre: totals.droitDeTimbre,
        totalTtc: totals.totalTtc,
        remainingAmount: totals.totalTtc,
        paymentAllocations: [],
        auditHistory: initialAudit,
        fiscalYear: new Date().getFullYear()
      };

      setDocuments(prev => [newInvoice, ...prev]);
      await saveDocumentToFirestore(newInvoice, orgId);

      await triggerAuditLog('INVOICE_CREATED', {
        documentId: newInvoice.id,
        documentNumber: newInvoice.number,
        amountTtc: newInvoice.totalTtc,
        customerName: newInvoice.customerName
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const issueDraftDocument = async (docId: string) => {
    setIsSaving(true);
    try {
      let docToSave: BusinessDocument | null = null;
      setDocuments(prev => prev.map(doc => {
        if (doc.id === docId && doc.status === 'draft') {
          const oldStatus = doc.status;
          const newStatus = 'issued' as PaymentStatus;

          const newAudit: InvoiceAuditEntry = {
            id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toISOString(),
            userId: currentUser?.email || 'system',
            userName: currentUser?.email?.split('@')[0] || 'System',
            action: 'ISSUED',
            fromStatus: oldStatus,
            toStatus: newStatus,
            notes: `Document finalisé et émis officiellement.`
          };

          const updatedDoc = {
            ...doc,
            status: newStatus,
            auditHistory: [...(doc.auditHistory || []), newAudit]
          };
          docToSave = updatedDoc;
          return updatedDoc;
        }
        return doc;
      }));

      if (docToSave) {
        await saveDocumentToFirestore(docToSave, orgId);
        await triggerAuditLog('INVOICE_CREATED', {
          documentId: docId,
          documentNumber: (docToSave as BusinessDocument).number,
          customerName: (docToSave as BusinessDocument).customerName
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const recordDocumentPayment = async (docId: string, amount: number, method: PaymentMethod, reference?: string, notes?: string) => {
    setIsSaving(true);
    try {
      let docToSave: BusinessDocument | null = null;
      setDocuments(prev => prev.map(doc => {
        if (doc.id === docId) {
          const newPaid = Number((doc.paidAmount + amount).toFixed(2));
          const newRemaining = Math.max(0, Number((doc.totalTtc - newPaid).toFixed(2)));
          const oldStatus = doc.status;
          const newStatus = newRemaining === 0 ? 'paid' : 'partially_paid';

          // If paying a Kreddy debt
          if (doc.customerId) {
            adjustKreddyBalance(
              doc.customerId,
              -amount,
              `Règlement sur facture ${doc.number}`,
              'payment',
              docId
            );
          }

          const newAllocation: DocPaymentAllocation = {
            id: `alloc-${Date.now()}`,
            amount,
            date: new Date().toISOString().split('T')[0],
            paymentMethod: method,
            reference,
            notes
          };

          const newAudit: InvoiceAuditEntry = {
            id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toISOString(),
            userId: currentUser?.email || 'system',
            userName: currentUser?.email?.split('@')[0] || 'System',
            action: 'PAYMENT_ALLOCATED',
            fromStatus: oldStatus,
            toStatus: newStatus,
            notes: `Règlement de ${amount} MAD enregistré via ${method}. Notes: ${notes || 'Aucune'}`
          };

          const updatedDoc = {
            ...doc,
            paidAmount: newPaid,
            remainingAmount: newRemaining,
            status: newStatus,
            paymentMethod: method,
            paymentAllocations: [...(doc.paymentAllocations || []), newAllocation],
            auditHistory: [...(doc.auditHistory || []), newAudit]
          };
          docToSave = updatedDoc;
          return updatedDoc;
        }
        return doc;
      }));

      if (docToSave) {
        await saveDocumentToFirestore(docToSave, orgId);
        await triggerAuditLog('PAYMENT_RECEIVED', {
          amount,
          paymentMethod: method,
          documentId: docId,
          documentNumber: (docToSave as BusinessDocument).number
        });
        if ((docToSave as BusinessDocument).customerId && (docToSave as BusinessDocument).customerId !== 'passage') {
          await triggerAuditLog('CUSTOMER_PAYMENT_RECEIVED', {
            customerId: (docToSave as BusinessDocument).customerId,
            customerName: (docToSave as BusinessDocument).customerName,
            amount,
            paymentMethod: method
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const cancelDocument = async (docId: string, reason: string) => {
    setIsSaving(true);
    try {
      let docToSave: BusinessDocument | null = null;
      setDocuments(prev => prev.map(doc => {
        if (doc.id === docId) {
          const oldStatus = doc.status;
          
          if (doc.type === 'facture' && doc.paymentMethod === 'kreddy' && doc.remainingAmount > 0) {
            adjustKreddyBalance(
              doc.customerId,
              -doc.remainingAmount,
              `Annulation de la facture ${doc.number} (Motif: ${reason})`,
              'invoice',
              docId
            );
          }

          const newAudit: InvoiceAuditEntry = {
            id: `audit-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser?.email || 'system',
            userName: currentUser?.email?.split('@')[0] || 'System',
            action: 'CANCELLED',
            fromStatus: oldStatus,
            toStatus: 'cancelled',
            notes: `Document annulé. Motif: ${reason}`
          };

          const updatedDoc = {
            ...doc,
            status: 'cancelled' as PaymentStatus,
            cancellationReason: reason,
            remainingAmount: 0,
            auditHistory: [...(doc.auditHistory || []), newAudit]
          };
          docToSave = updatedDoc;
          return updatedDoc;
        }
        return doc;
      }));

      if (docToSave) {
        await saveDocumentToFirestore(docToSave, orgId);
        await triggerAuditLog('INVOICE_CANCELLED', {
          documentId: docId,
          documentNumber: (docToSave as BusinessDocument).number,
          reason
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const createCreditNote = async (invoiceId: string, amount: number, reason: string, items?: DocumentItem[]) => {
    setIsSaving(true);
    try {
      const invoice = documents.find(d => d.id === invoiceId);
      if (!invoice) return;

      const creditNoteNumber = generateSequentialNumber('credit_note', new Date().toISOString(), documents);
      const creditNoteId = `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const newCreditNote: BusinessDocument = {
        id: creditNoteId,
        number: creditNoteNumber,
        type: 'credit_note',
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        customerIce: invoice.customerIce,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        items: items || [],
        subtotalHt: amount,
        totalTva: 0,
        droitDeTimbre: 0,
        totalTtc: amount,
        paidAmount: amount,
        remainingAmount: 0,
        status: 'paid',
        notes: `Avoir lié à la facture ${invoice.number}. Motif: ${reason}`,
        fiscalYear: new Date().getFullYear()
      };

      let updatedInvoiceToSave: BusinessDocument | null = null;
      setDocuments(prev => [
        newCreditNote,
        ...prev.map(doc => {
          if (doc.id === invoiceId) {
            const oldStatus = doc.status;
            const newRemaining = Math.max(0, Number((doc.remainingAmount - amount).toFixed(2)));
            const newStatus = newRemaining === 0 ? 'paid' : doc.status;

            const newAudit: InvoiceAuditEntry = {
              id: `audit-${Date.now()}-cn`,
              timestamp: new Date().toISOString(),
              userId: currentUser?.email || 'system',
              userName: currentUser?.email?.split('@')[0] || 'System',
              action: 'CREDIT_NOTE_ISSUED',
              fromStatus: oldStatus,
              toStatus: newStatus,
              notes: `Avoir émis: ${creditNoteNumber} de ${amount} MAD. Motif: ${reason}`
            };

            const updatedInvoice = {
              ...doc,
              remainingAmount: newRemaining,
              status: newStatus,
              creditNoteIds: [...(doc.creditNoteIds || []), creditNoteId],
              auditHistory: [...(doc.auditHistory || []), newAudit]
            };
            updatedInvoiceToSave = updatedInvoice;
            return updatedInvoice;
          }
          return doc;
        })
      ]);

      await saveDocumentToFirestore(newCreditNote, orgId);
      if (updatedInvoiceToSave) {
        await saveDocumentToFirestore(updatedInvoiceToSave, orgId);
      }

      if (invoice.paymentMethod === 'kreddy' && invoice.customerId) {
        await adjustKreddyBalance(
          invoice.customerId,
          -amount,
          `Avoir émis (${creditNoteNumber}) - Facture ${invoice.number}`,
          'credit_note',
          creditNoteId
        );
      }

      await triggerAuditLog('SALE_RETURNED', {
        invoiceId,
        invoiceNumber: invoice.number,
        creditNoteNumber,
        amount
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const createDebitNote = async (invoiceId: string, amount: number, reason: string, items?: DocumentItem[]) => {
    setIsSaving(true);
    try {
      const invoice = documents.find(d => d.id === invoiceId);
      if (!invoice) return;

      const debitNoteNumber = generateSequentialNumber('debit_note', new Date().toISOString(), documents);
      const debitNoteId = `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const newDebitNote: BusinessDocument = {
        id: debitNoteId,
        number: debitNoteNumber,
        type: 'debit_note',
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        customerIce: invoice.customerIce,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        items: items || [],
        subtotalHt: amount,
        totalTva: 0,
        droitDeTimbre: 0,
        totalTtc: amount,
        paidAmount: 0,
        remainingAmount: amount,
        status: 'unpaid',
        notes: `Note de débit liée à la facture ${invoice.number}. Motif: ${reason}`,
        fiscalYear: new Date().getFullYear()
      };

      let updatedInvoiceToSave: BusinessDocument | null = null;
      setDocuments(prev => [
        newDebitNote,
        ...prev.map(doc => {
          if (doc.id === invoiceId) {
            const oldStatus = doc.status;
            const newRemaining = Number((doc.remainingAmount + amount).toFixed(2));
            const newStatus = 'partially_paid' as PaymentStatus;

            const newAudit: InvoiceAuditEntry = {
              id: `audit-${Date.now()}-dn`,
              timestamp: new Date().toISOString(),
              userId: currentUser?.email || 'system',
              userName: currentUser?.email?.split('@')[0] || 'System',
              action: 'DEBIT_NOTE_ISSUED',
              fromStatus: oldStatus,
              toStatus: newStatus,
              notes: `Note de débit émise: ${debitNoteNumber} de ${amount} MAD. Motif: ${reason}`
            };

            const updatedInvoice = {
              ...doc,
              remainingAmount: newRemaining,
              status: newStatus,
              debitNoteIds: [...(doc.debitNoteIds || []), debitNoteId],
              auditHistory: [...(doc.auditHistory || []), newAudit]
            };
            updatedInvoiceToSave = updatedInvoice;
            return updatedInvoice;
          }
          return doc;
         })
      ]);

      await saveDocumentToFirestore(newDebitNote, orgId);
      if (updatedInvoiceToSave) {
        await saveDocumentToFirestore(updatedInvoiceToSave, orgId);
      }

      if (invoice.paymentMethod === 'kreddy' && invoice.customerId) {
        await adjustKreddyBalance(
          invoice.customerId,
          amount,
          `Note de débit émise (${debitNoteNumber}) - Facture ${invoice.number}`,
          'debit_note',
          debitNoteId
        );
      }

      await triggerAuditLog('SALE_CREATED', {
        invoiceId,
        invoiceNumber: invoice.number,
        debitNoteNumber,
        amount
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const addExpense = async (expData: Omit<Expense, 'id'>) => {
    setIsSaving(true);
    try {
      const newExp: Expense = {
        ...expData,
        id: `exp-${Date.now()}`,
      };
      setExpenses(prev => [newExp, ...prev]);
      await saveExpenseToFirestore(newExp, orgId);
      await triggerAuditLog('EXPENSE_RECORDED', {
        expenseId: newExp.id,
        title: newExp.title,
        amountTtc: newExp.amountTtc,
        category: newExp.category
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const updateExpense = async (updatedExp: Expense) => {
    setIsSaving(true);
    try {
      setExpenses(prev => prev.map(e => e.id === updatedExp.id ? updatedExp : e));
      await saveExpenseToFirestore(updatedExp, orgId);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteExpense = async (id: string) => {
    setIsSaving(true);
    try {
      setExpenses(prev => prev.filter(e => e.id !== id));
      await deleteExpenseFromFirestore(id, orgId);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // Autogenerate recurring expenses that are due
  useEffect(() => {
    if (expenses.length === 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    let hasChanges = false;
    let currentExpenses = [...expenses];

    // Find active recurring expenses that have hit their next occurrence date
    const activeRecurring = currentExpenses.filter(
      e => e.isRecurring && e.nextOccurrenceDate && e.nextOccurrenceDate <= todayStr && e.recurringStatus !== 'cancelled'
    );

    if (activeRecurring.length > 0) {
      activeRecurring.forEach(oldExp => {
        const nextOccDate = oldExp.nextOccurrenceDate!;
        
        // Add exactly 1 month
        const d = new Date(nextOccDate);
        d.setMonth(d.getMonth() + 1);
        const futureOccDate = d.toISOString().split('T')[0];

        // Create the new expense
        const newExpId = `exp-rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const newExp: Expense = {
          ...oldExp,
          id: newExpId,
          date: nextOccDate,
          isRecurring: true,
          nextOccurrenceDate: futureOccDate,
          recurringStatus: 'active',
          notes: oldExp.notes ? `${oldExp.notes} (Générée automatiquement)` : 'Générée automatiquement',
        };

        // Deactivate recurrence on the older occurrence to maintain a single active chain head
        const updatedOldExp: Expense = {
          ...oldExp,
          isRecurring: false,
          recurringStatus: 'completed'
        };

        currentExpenses = currentExpenses.map(item => 
          item.id === oldExp.id ? updatedOldExp : item
        );
        currentExpenses.unshift(newExp);

        saveExpenseToFirestore(newExp, orgId);
        saveExpenseToFirestore(updatedOldExp, orgId);
        
        hasChanges = true;
      });

      if (hasChanges) {
        setExpenses(currentExpenses);
      }
    }
  }, [expenses, orgId]);

  const addEmployee = (empData: Omit<Employee, 'id'>) => {
    const newEmp: Employee = {
      ...empData,
      id: `emp-${Date.now()}`,
    };
    setEmployees(prev => [newEmp, ...prev]);
    saveEmployeeToFirestore(newEmp, orgId);
    triggerAuditLog('EMPLOYEE_CREATED', {
      employeeId: newEmp.id,
      employeeName: newEmp.name,
      baseSalary: newEmp.baseSalary
    }).catch(console.error);
  };

  const markAttendance = (employeeId: string, status: AttendanceRecord['status'], checkIn?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;

    setAttendance(prev => {
      const existing = prev.find(a => a.employeeId === employeeId && a.date === today);
      if (existing) {
        return prev.map(a => a.id === existing.id ? { ...a, status, checkIn: checkIn || a.checkIn } : a);
      }
      const newRec: AttendanceRecord = {
        id: `att-${Date.now()}`,
        employeeId,
        employeeName: emp.fullName,
        date: today,
        status,
        checkIn: checkIn || '08:30',
      };
      return [newRec, ...prev];
    });
  };

  const generatePayslip = (employeeId: string, month: string) => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;

    const base = emp.baseSalary;
    const cnssEmp = Number((base * 0.0396).toFixed(2)); // 3.96%
    const amoEmp = Number((base * 0.0226).toFixed(2));  // 2.26%
    const cnssEmployer = Number((base * 0.0898).toFixed(2)); // 8.98%
    const net = Number((base - cnssEmp - amoEmp).toFixed(2));

    const newPayslip: Payslip = {
      id: `pay-${Date.now()}`,
      employeeId,
      employeeName: emp.fullName,
      month,
      baseSalary: base,
      overtimeHours: 0,
      overtimePay: 0,
      advancesDeducted: 0,
      cnssEmployeeShare: cnssEmp,
      amoEmployeeShare: amoEmp,
      netPayable: net,
      cnssEmployerShare: cnssEmployer,
      status: 'paid',
      paymentDate: new Date().toISOString().split('T')[0],
    };

    setPayslips(prev => [newPayslip, ...prev]);
    triggerAuditLog('PAYSLIP_CREATED', {
      payslipId: newPayslip.id,
      employeeName: newPayslip.employeeName,
      netPayable: newPayslip.netPayable,
      month: newPayslip.month
    }).catch(console.error);
  };

  const processPosSale = (
    cart: PosCartItem[],
    method: PaymentMethod,
    customerId?: string,
    splitAmounts?: { cash: number; card: number; check: number; kreddy: number },
    idempotencyKey?: string,
    cartDiscountPercent?: number,
    cartDiscountFixed?: number
  ): { success: boolean; error?: string; doc?: BusinessDocument } => {
    if (cart.length === 0) return { success: false, error: "Le panier est vide." };

    // Duplicate protection / Idempotency check
    if (idempotencyKey) {
      const existingDoc = documents.find(d => d.idempotencyKey === idempotencyKey);
      if (existingDoc) {
        return { success: true, doc: existingDoc };
      }
    }

    // 1. Calculate item prices with item-level discounts
    let subtotalHtBeforeCartDiscount = 0;
    cart.forEach(item => {
      const basePrice = item.customPrice !== undefined
        ? item.customPrice
        : (item.selectedVariant ? item.selectedVariant.sellingPrice : item.product.sellingPrice);
      let p = basePrice;
      if (item.discountPercent) p = p * (1 - item.discountPercent / 100);
      if (item.discountFixed) p = Math.max(0, p - item.discountFixed);
      subtotalHtBeforeCartDiscount += p * item.quantity;
    });

    // 2. Compute proportional factor for cart-level discount
    let cartDiscountFactor = 1;
    if (cartDiscountPercent && cartDiscountPercent > 0) {
      cartDiscountFactor = 1 - (cartDiscountPercent / 100);
    } else if (cartDiscountFixed && cartDiscountFixed > 0 && subtotalHtBeforeCartDiscount > 0) {
      cartDiscountFactor = (subtotalHtBeforeCartDiscount - cartDiscountFixed) / subtotalHtBeforeCartDiscount;
      if (cartDiscountFactor < 0) cartDiscountFactor = 0;
    }

    // 3. Build document items list
    let subtotalHt = 0;
    let totalTva = 0;

    const docItems = cart.map((item, idx) => {
      const basePrice = item.customPrice !== undefined
        ? item.customPrice
        : (item.selectedVariant ? item.selectedVariant.sellingPrice : item.product.sellingPrice);
      
      let p = basePrice;
      if (item.discountPercent) p = p * (1 - item.discountPercent / 100);
      if (item.discountFixed) p = Math.max(0, p - item.discountFixed);

      // Apply global cart discount factor
      const finalUnitPrice = Number((p * cartDiscountFactor).toFixed(2));

      const { tvaAmount, amountTtc } = calculateTva(finalUnitPrice * item.quantity, item.product.tvaRate);
      subtotalHt += finalUnitPrice * item.quantity;
      totalTva += tvaAmount;

      const variantAttrStr = item.selectedVariant
        ? Object.entries(item.selectedVariant.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')
        : undefined;

      const fullName = item.selectedVariant
        ? `${item.product.name} (${variantAttrStr})`
        : item.product.name;

      return {
        id: `item-${Date.now()}-${idx}-${item.product.id}`,
        productId: item.product.id,
        productName: fullName,
        variantId: item.selectedVariant?.id,
        variantName: variantAttrStr,
        quantity: item.quantity,
        unitPriceHt: finalUnitPrice,
        tvaRate: item.product.tvaRate,
        totalHt: Number((finalUnitPrice * item.quantity).toFixed(2)),
        totalTva: tvaAmount,
        totalTtc: amountTtc,
      };
    });

    const totalTtc = Number((subtotalHt + totalTva).toFixed(2));
    const droitDeTimbre = calculateDroitDeTimbre(totalTtc, method);
    const finalAmount = Number((totalTtc + droitDeTimbre).toFixed(2));

    const cust = customerId ? customers.find(c => c.id === customerId) : null;
    const custName = cust ? cust.name : 'Client Passage (Comptoir)';

    // 4. Calculate Payment Split / Allocations
    let paidAmt = 0;
    let remainingAmt = 0;
    let paymentStatus: PaymentStatus = 'paid';

    let splitCash = 0;
    let splitCard = 0;
    let splitCheck = 0;
    let splitKreddy = 0;

    if (method === 'split' && splitAmounts) {
      splitCash = splitAmounts.cash || 0;
      splitCard = splitAmounts.card || 0;
      splitCheck = splitAmounts.check || 0;
      splitKreddy = splitAmounts.kreddy || 0;

      paidAmt = Number((splitCash + splitCard + splitCheck).toFixed(2));
      remainingAmt = Number(splitKreddy.toFixed(2));
      paymentStatus = remainingAmt > 0 ? (paidAmt > 0 ? 'partial' : 'unpaid') : 'paid';
    } else {
      if (method === 'kreddy') {
        paidAmt = 0;
        remainingAmt = finalAmount;
        paymentStatus = 'unpaid';
        splitKreddy = finalAmount;
      } else {
        paidAmt = finalAmount;
        remainingAmt = 0;
        paymentStatus = 'paid';
        if (method === 'cash') splitCash = finalAmount;
        if (method === 'cmi_card') splitCard = finalAmount;
        if (method === 'check') splitCheck = finalAmount;
      }
    }

    // 5. Create authoritative document
    const numSeq = Math.floor(1000 + Math.random() * 9000);
    const newDoc: BusinessDocument = {
      id: `doc-${Date.now()}`,
      number: `FAC-POS-${numSeq}`,
      type: 'facture',
      customerId: cust ? cust.id : 'passage',
      customerName: custName,
      customerIce: cust?.ice,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      items: docItems,
      subtotalHt: Number(subtotalHt.toFixed(2)),
      totalTva: Number(totalTva.toFixed(2)),
      droitDeTimbre,
      totalTtc: finalAmount,
      paidAmount: paidAmt,
      remainingAmount: remainingAmt,
      status: paymentStatus,
      paymentMethod: method,
      notes: 'Vente Caisse POS' + (method === 'split' ? ' (Règlement Multi-mode)' : ''),
      idempotencyKey,
    };

    setDocuments(prev => [newDoc, ...prev]);
    saveDocumentToFirestore(newDoc, orgId).catch(console.error);

    // 6. Record Immutable Sale Inventory Movements
    const nowStr = new Date().toISOString();
    const newMovements: InventoryMovement[] = [];
    cart.forEach(ci => {
      const variantAttrStr = ci.selectedVariant
        ? Object.entries(ci.selectedVariant.attributes).map(([k, val]) => `${k}: ${val}`).join(', ')
        : undefined;
      const mov: InventoryMovement = {
        id: `mov-${Date.now()}-${ci.product.id}-${ci.selectedVariant?.id || 'base'}-${Math.floor(Math.random() * 1000)}`,
        organizationId: orgId,
        productId: ci.product.id,
        productName: ci.product.name,
        variantId: ci.selectedVariant?.id,
        variantName: variantAttrStr,
        type: 'sale',
        quantity: ci.quantity,
        unitCost: ci.selectedVariant?.costPrice || ci.product.costPrice,
        referenceType: 'pos',
        referenceId: newDoc.id,
        createdAt: nowStr,
        createdBy: currentUser?.email || 'POS Cashier'
      };
      newMovements.push(mov);
      saveInventoryMovementToFirestore(mov, orgId).catch(console.error);
    });
    setInventoryMovements(prev => [...newMovements, ...prev]);

    // 7. If there is a Kreddy portion, adjust customer balance
    if (splitKreddy > 0 && cust) {
      adjustKreddyBalance(
        cust.id,
        splitKreddy,
        `Vente caisse POS - Facture ${newDoc.number}`,
        'invoice',
        newDoc.id
      );
    }

    // Log Business Events for POS Sale & Stock
    triggerAuditLog('SALE_CREATED', {
      saleId: newDoc.id,
      amountTtc: finalAmount,
      paymentMethod: method
    }).catch(console.error);

    cart.forEach(item => {
      triggerAuditLog('STOCK_SOLD', {
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity
      }).catch(console.error);
    });

    // 8. Update Cash Register Session
    setCashSession(prev => {
      const cashSales = prev.totalSalesCash + splitCash;
      const cardSales = prev.totalSalesCard + splitCard;
      const checkSales = prev.totalSalesCheck + splitCheck;
      const kreddySales = prev.totalSalesKreddy + splitKreddy;

      const expected = prev.initialCash + cashSales + prev.cashAddedManually - prev.cashWithdrawnManually;

      return {
        ...prev,
        totalSalesCash: Number(cashSales.toFixed(2)),
        totalSalesCard: Number(cardSales.toFixed(2)),
        totalSalesCheck: Number(checkSales.toFixed(2)),
        totalSalesKreddy: Number(kreddySales.toFixed(2)),
        expectedCash: Number(expected.toFixed(2)),
      };
    });

    // 8b. Register cash sale in the new active Cash Session if one is open
    if (splitCash > 0) {
      const activeSess = cashSessions.find(s => s.status === 'open');
      if (activeSess) {
        addCashMovement(activeSess.id, 'sale', splitCash, `Vente POS ${newDoc.number}`, newDoc.id);
      }
    }

    // 9. Queue Offline Sale and Inventory Updates in IndexedDB for Background Sync
    queueOfflineSale(newDoc).then(() => {
      refreshPendingCount();
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        syncOfflineDataWithBackend().then(() => refreshPendingCount());
      }
    });

    cart.forEach(ci => {
      queueOfflineInventoryUpdate(ci.product.id, ci.selectedVariant?.id, -ci.quantity);
    });

    return { success: true, doc: newDoc };
  };

  const closeCashSession = (actualCash: number) => {
    setCashSession(prev => {
      const discrepancy = Number((actualCash - prev.expectedCash).toFixed(2));
      return {
        ...prev,
        closedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        actualCash,
        discrepancy,
        status: 'closed',
      };
    });
  };

  const openCashSession = (initialCash: number) => {
    const newSession: CashRegisterSession = {
      id: `session-${Date.now()}`,
      openedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      initialCash,
      totalSalesCash: 0,
      totalSalesCard: 0,
      totalSalesCheck: 0,
      totalSalesKreddy: 0,
      cashAddedManually: 0,
      cashWithdrawnManually: 0,
      expectedCash: initialCash,
      status: 'open',
    };
    setCashSession(newSession);
    triggerAuditLog('STOCK_ADJUSTED', { session: newSession, notes: "Ouverture de session de caisse" }).catch(console.error);
  };

  const addCashToSession = (amount: number, reason: string) => {
    setCashSession(prev => {
      const added = prev.cashAddedManually + amount;
      const expected = prev.initialCash + prev.totalSalesCash + added - prev.cashWithdrawnManually;
      return {
        ...prev,
        cashAddedManually: Number(added.toFixed(2)),
        expectedCash: Number(expected.toFixed(2)),
      };
    });
    triggerAuditLog('STOCK_ADJUSTED', { amount, reason, type: 'cash-in' }).catch(console.error);
  };

  const withdrawCashFromSession = (amount: number, reason: string) => {
    setCashSession(prev => {
      const withdrawn = prev.cashWithdrawnManually + amount;
      const expected = prev.initialCash + prev.totalSalesCash + prev.cashAddedManually - withdrawn;
      return {
        ...prev,
        cashWithdrawnManually: Number(withdrawn.toFixed(2)),
        expectedCash: Number(expected.toFixed(2)),
      };
    });
    triggerAuditLog('STOCK_ADJUSTED', { amount, reason, type: 'cash-out' }).catch(console.error);
  };

  const addCashRegister = (reg: Omit<CashRegister, 'id' | 'orgId'>) => {
    const newReg: CashRegister = {
      ...reg,
      id: `register-${Date.now()}`,
      orgId
    };
    setCashRegisters(prev => [...prev, newReg]);
    saveCashRegisterToFirestore(newReg, orgId).catch(console.error);
    triggerAuditLog('STOCK_ADJUSTED', { register: newReg, notes: "Création d'une nouvelle caisse: " + reg.name }).catch(console.error);
  };

  const updateCashRegister = (reg: CashRegister) => {
    setCashRegisters(prev => prev.map(r => r.id === reg.id ? reg : r));
    saveCashRegisterToFirestore(reg, orgId).catch(console.error);
  };

  const openCashSessionNew = (registerId: string, openingFloat: number) => {
    const reg = cashRegisters.find(r => r.id === registerId) || { name: 'Caisse Centrale', code: 'CAISSE-01' };
    const newSessionId = `session-${Date.now()}`;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const newSession: CashSession = {
      id: newSessionId,
      orgId,
      registerId,
      registerName: reg.name,
      openedAt: nowStr,
      openingFloat,
      totalCashSales: 0,
      totalCashRefunds: 0,
      totalCashIn: 0,
      totalCashOut: 0,
      expectedBalance: openingFloat,
      status: 'open',
      openedBy: userProfile?.displayName || currentUser?.email || 'Caissier',
    };

    setCashRegisters(prev => prev.map(r => r.id === registerId ? { ...r, currentSessionId: newSessionId } : r));
    const targetReg = cashRegisters.find(r => r.id === registerId);
    if (targetReg) {
      saveCashRegisterToFirestore({ ...targetReg, currentSessionId: newSessionId }, orgId).catch(console.error);
    }

    setCashSessions(prev => [newSession, ...prev]);
    saveCashSessionToFirestore(newSession, orgId).catch(console.error);

    // Create opening movement
    const movementId = `mov-${Date.now()}`;
    const openingMovement: CashMovement = {
      id: movementId,
      orgId,
      sessionId: newSessionId,
      registerId,
      type: 'opening',
      amount: openingFloat,
      timestamp: nowStr,
      reason: 'Ouverture de caisse - Solde initial',
      performedBy: userProfile?.displayName || currentUser?.email || 'Caissier'
    };
    setCashMovements(prev => [openingMovement, ...prev]);
    saveCashMovementToFirestore(openingMovement, orgId).catch(console.error);

    // Keep old session synchronized for POS module backward compatibility
    setCashSession({
      id: newSessionId,
      openedAt: nowStr,
      initialCash: openingFloat,
      totalSalesCash: 0,
      totalSalesCard: 0,
      totalSalesCheck: 0,
      totalSalesKreddy: 0,
      cashAddedManually: 0,
      cashWithdrawnManually: 0,
      expectedCash: openingFloat,
      status: 'open'
    });
    
    triggerAuditLog('STOCK_ADJUSTED', { session: newSession, notes: "Ouverture de session de caisse: " + reg.name }).catch(console.error);
  };

  const closeCashSessionNew = (sessionId: string, actualBalance: number, notes?: string, cashBreakdown?: CashReconciliation['cashBreakdown']) => {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const session = cashSessions.find(s => s.id === sessionId);
    if (!session) return;

    const difference = Number((actualBalance - session.expectedBalance).toFixed(2));
    const closedSession: CashSession = {
      ...session,
      closedAt: nowStr,
      actualBalance,
      difference,
      status: 'closed',
      closedBy: userProfile?.displayName || currentUser?.email || 'Responsable',
      notes
    };

    setCashRegisters(prev => prev.map(r => r.id === session.registerId ? { ...r, currentSessionId: undefined } : r));
    const targetReg = cashRegisters.find(r => r.id === session.registerId);
    if (targetReg) {
      saveCashRegisterToFirestore({ ...targetReg, currentSessionId: undefined }, orgId).catch(console.error);
    }

    setCashSessions(prev => prev.map(s => s.id === sessionId ? closedSession : s));
    saveCashSessionToFirestore(closedSession, orgId).catch(console.error);

    // Create reconciliation
    const reconciliationId = `rec-${Date.now()}`;
    const reconciliation: CashReconciliation = {
      id: reconciliationId,
      orgId,
      sessionId,
      registerId: session.registerId,
      timestamp: nowStr,
      expectedBalance: session.expectedBalance,
      actualBalance,
      difference,
      status: difference === 0 ? 'matched' : 'discrepancy',
      reconciledBy: userProfile?.displayName || currentUser?.email || 'Responsable',
      notes,
      cashBreakdown
    };

    setCashReconciliations(prev => [reconciliation, ...prev]);
    saveCashReconciliationToFirestore(reconciliation, orgId).catch(console.error);

    // Keep old session synchronized for POS module backward compatibility
    setCashSession(prev => ({
      ...prev,
      closedAt: nowStr,
      actualCash: actualBalance,
      discrepancy: difference,
      status: 'closed'
    }));

    triggerAuditLog('STOCK_ADJUSTED', { session: closedSession, reconciliation, notes: "Clôture de session de caisse: " + session.registerName }).catch(console.error);
  };

  const addCashMovement = (sessionId: string, type: CashMovement['type'], amount: number, reason: string, referenceId?: string) => {
    const session = cashSessions.find(s => s.id === sessionId);
    if (!session) return;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const movementId = `mov-${Date.now()}`;
    const newMovement: CashMovement = {
      id: movementId,
      orgId,
      sessionId,
      registerId: session.registerId,
      type,
      amount,
      timestamp: nowStr,
      reason,
      performedBy: userProfile?.displayName || currentUser?.email || 'Utilisateur',
      referenceId
    };

    setCashMovements(prev => [newMovement, ...prev]);
    saveCashMovementToFirestore(newMovement, orgId).catch(console.error);

    let totalCashSales = session.totalCashSales;
    let totalCashRefunds = session.totalCashRefunds;
    let totalCashIn = session.totalCashIn;
    let totalCashOut = session.totalCashOut;

    if (type === 'sale') totalCashSales = Number((totalCashSales + amount).toFixed(2));
    if (type === 'refund') totalCashRefunds = Number((totalCashRefunds + amount).toFixed(2));
    if (type === 'cash_in') totalCashIn = Number((totalCashIn + amount).toFixed(2));
    if (type === 'cash_out') totalCashOut = Number((totalCashOut + amount).toFixed(2));

    const expectedBalance = Number((session.openingFloat + totalCashSales - totalCashRefunds + totalCashIn - totalCashOut).toFixed(2));

    const updatedSession: CashSession = {
      ...session,
      totalCashSales,
      totalCashRefunds,
      totalCashIn,
      totalCashOut,
      expectedBalance
    };

    saveCashSessionToFirestore(updatedSession, orgId).catch(console.error);

    setCashSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return updatedSession;
      }
      return s;
    }));

    if (type === 'cash_in' || type === 'cash_out') {
      setCashSession(prev => {
        let added = prev.cashAddedManually;
        let withdrawn = prev.cashWithdrawnManually;
        if (type === 'cash_in') added = Number((added + amount).toFixed(2));
        if (type === 'cash_out') withdrawn = Number((withdrawn + amount).toFixed(2));
        const expected = Number((prev.initialCash + prev.totalSalesCash + added - withdrawn).toFixed(2));
        return {
          ...prev,
          cashAddedManually: added,
          cashWithdrawnManually: withdrawn,
          expectedCash: expected
        };
      });
    } else if (type === 'sale') {
      setCashSession(prev => {
        const sales = Number((prev.totalSalesCash + amount).toFixed(2));
        const expected = Number((prev.initialCash + sales + prev.cashAddedManually - prev.cashWithdrawnManually).toFixed(2));
        return {
          ...prev,
          totalSalesCash: sales,
          expectedCash: expected
        };
      });
    }

    triggerAuditLog('STOCK_ADJUSTED', { movement: newMovement, notes: `Mouvement de caisse (${type}): ${amount} MAD - ${reason}` }).catch(console.error);
  };

  const openWhatsAppModal = (phone: string, name: string, defaultText: string) => {
    setWhatsAppModalData({ isOpen: true, phone, name, text: defaultText });
  };

  const closeWhatsAppModal = () => {
    setWhatsAppModalData(null);
  };

  const derivedCustomers = useMemo(() => {
    return customers.map(c => {
      const entries = creditLedgerEntries.filter(e => e.customerId === c.id);
      
      const openingBalance = entries.filter(e => e.type === 'opening_balance').reduce((sum, e) => sum + e.amount, 0);
      const creditSales = entries.filter(e => e.type === 'credit_sale').reduce((sum, e) => sum + e.amount, 0);
      const payments = entries.filter(e => e.type === 'payment').reduce((sum, e) => sum + e.amount, 0);
      const returns = entries.filter(e => e.type === 'return').reduce((sum, e) => sum + e.amount, 0);
      const adjustmentsPlus = entries.filter(e => e.type === 'adjustment_plus').reduce((sum, e) => sum + e.amount, 0);
      const adjustmentsMinus = entries.filter(e => e.type === 'adjustment_minus').reduce((sum, e) => sum + e.amount, 0);
      
      const calculatedBalance = Number((openingBalance + creditSales - payments - returns + adjustmentsPlus - adjustmentsMinus).toFixed(2));
      
      return {
        ...c,
        kreddyBalance: Math.max(0, calculatedBalance)
      };
    });
  }, [customers, creditLedgerEntries]);

  const derivedProducts = useMemo(() => {
    return products.map(p => {
      if (p.hasVariants && p.variants) {
        const updatedVariants = p.variants.map(v => {
          const vMovements = inventoryMovements.filter(m => m.productId === p.id && m.variantId === v.id);
          let vStock = 0;
          vMovements.forEach(m => {
            if (m.type === 'purchase' || m.type === 'return' || m.type === 'adjustment_in' || m.type === 'opening_balance') {
              vStock += m.quantity;
            } else if (m.type === 'sale' || m.type === 'adjustment_out' || m.type === 'transfer') {
              vStock -= m.quantity;
            }
          });
          return { ...v, stockQty: Math.max(0, vStock) };
        });
        const totalStock = updatedVariants.reduce((sum, v) => sum + v.stockQty, 0);
        return { ...p, variants: updatedVariants, stockQty: Math.max(0, totalStock) };
      } else {
        const pMovements = inventoryMovements.filter(m => m.productId === p.id && (!m.variantId || m.variantId === ''));
        let pStock = 0;
        pMovements.forEach(m => {
          if (m.type === 'purchase' || m.type === 'return' || m.type === 'adjustment_in' || m.type === 'opening_balance') {
            pStock += m.quantity;
          } else if (m.type === 'sale' || m.type === 'adjustment_out' || m.type === 'transfer') {
            pStock -= m.quantity;
          }
        });
        return { ...p, stockQty: Math.max(0, pStock) };
      }
    });
  }, [products, inventoryMovements]);

  return (
    <StoreContext.Provider
      value={{
        language,
        setLanguage,
        activeModule,
        setActiveModule,
        profile,
        updateProfile,
        customers: derivedCustomers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        adjustKreddyBalance,
        creditLedgerEntries,
        addCreditLedgerEntry,
        products: derivedProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        inventoryMovements,
        addInventoryMovement,
        suppliers,
        addSupplier,
        updateSupplier,
        documents,
        addDocument,
        convertDevisToInvoice,
        issueDraftDocument,
        recordDocumentPayment,
        cancelDocument,
        createCreditNote,
        createDebitNote,
        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
        employees,
        addEmployee,
        attendance,
        markAttendance,
        payslips,
        generatePayslip,
        cashSession,
        processPosSale,
        closeCashSession,
        openCashSession,
        addCashToSession,
        withdrawCashFromSession,
        // Expose new cash register system
        cashRegisters,
        addCashRegister,
        updateCashRegister,
        cashSessions,
        openCashSessionNew,
        closeCashSessionNew,
        cashMovements,
        addCashMovement,
        cashReconciliations,
        selectedDocumentForView,
        setSelectedDocumentForView,
        whatsAppModalData,
        openWhatsAppModal,
        closeWhatsAppModal,
        isOnline,
        pendingSyncCount,
        triggerManualSync,
        isLoadingInitialData,
        isSaving,
        setIsSaving,
        businessEvents,
        setBusinessEvents,
        triggerAuditLog,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
