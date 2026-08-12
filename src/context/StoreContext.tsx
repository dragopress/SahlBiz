import React, { createContext, useContext, useState, useEffect } from 'react';
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
  DocumentType,
  BusinessEvent,
  BusinessEventType
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
  fetchInitialFirestoreData
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
  | 'audit';

export interface PosCartItem {
  product: Product;
  selectedVariant?: ProductVariant;
  quantity: number;
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
  adjustKreddyBalance: (customerId: string, amountChange: number) => void;

  products: Product[];
  addProduct: (prod: Omit<Product, 'id'>) => void;
  updateProduct: (prod: Product) => void;
  deleteProduct: (id: string) => void;

  suppliers: Supplier[];
  addSupplier: (supp: Omit<Supplier, 'id' | 'outstandingDebt'>) => void;
  updateSupplier: (supp: Supplier) => void;

  documents: BusinessDocument[];
  addDocument: (doc: Omit<BusinessDocument, 'id' | 'number'>) => void;
  convertDevisToInvoice: (devisId: string) => void;
  recordDocumentPayment: (docId: string, amount: number, method: PaymentMethod) => void;

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
  processPosSale: (cart: PosCartItem[], method: PaymentMethod, customerId?: string) => void;
  closeCashSession: (actualCash: number) => void;

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
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [documents, setDocuments] = useState<BusinessDocument[]>(INITIAL_DOCUMENTS);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [payslips, setPayslips] = useState<Payslip[]>(INITIAL_PAYSLIPS);
  const [cashSession, setCashSession] = useState<CashRegisterSession>(INITIAL_CASH_SESSION);

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
      }
    } catch (e) {
      console.error('Failed to load local storage state:', e);
    }

    // Try fetching remote Firestore collections for this org
    if (currentUser && orgId && orgId !== 'org_default') {
      setIsLoadingInitialData(true);
      Promise.all([
        fetchInitialFirestoreData(orgId),
        fetchBusinessEvents(orgId)
      ]).then(([remoteData, events]) => {
        if (remoteData) {
          if (remoteData.businessProfile) setProfile(remoteData.businessProfile);
          if (remoteData.customers && remoteData.customers.length > 0) setCustomers(remoteData.customers);
          if (remoteData.products && remoteData.products.length > 0) setProducts(remoteData.products);
          if (remoteData.suppliers && remoteData.suppliers.length > 0) setSuppliers(remoteData.suppliers);
          if (remoteData.documents && remoteData.documents.length > 0) setDocuments(remoteData.documents);
          if (remoteData.expenses && remoteData.expenses.length > 0) setExpenses(remoteData.expenses);
          if (remoteData.employees && remoteData.employees.length > 0) setEmployees(remoteData.employees);
        }
        if (events && events.length > 0) {
          setBusinessEvents(events);
        } else {
          setBusinessEvents(getDemoEvents(orgId));
        }
      })
      .catch(err => console.warn('Firestore initial sync note:', err))
      .finally(() => {
        setIsLoadingInitialData(false);
      });
    } else {
      setBusinessEvents(getDemoEvents(orgId));
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
      };
      localStorage.setItem(`${STORAGE_KEY}_${orgId}`, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
    }
  }, [orgId, profile, customers, products, suppliers, documents, expenses, employees, attendance, payslips, cashSession]);

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

  const adjustKreddyBalance = async (customerId: string, amountChange: number) => {
    setIsSaving(true);
    try {
      let updatedToSave: Customer | null = null;
      setCustomers(prev => prev.map(c => {
        if (c.id === customerId) {
          const updated = {
            ...c,
            kreddyBalance: Math.max(0, Number((c.kreddyBalance + amountChange).toFixed(2))),
          };
          updatedToSave = updated;
          return updated;
        }
        return c;
      }));
      if (updatedToSave) {
        await saveCustomerToFirestore(updatedToSave, orgId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const addProduct = async (prodData: Omit<Product, 'id'>) => {
    setIsSaving(true);
    try {
      const newProd: Product = {
        ...prodData,
        id: `prod-${Date.now()}`,
      };
      setProducts(prev => [newProd, ...prev]);
      await saveProductToFirestore(newProd, orgId);
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

  const addDocument = async (docData: Omit<BusinessDocument, 'id' | 'number'>) => {
    setIsSaving(true);
    try {
      const prefix = docData.type === 'facture' ? 'FAC' : docData.type === 'devis' ? 'DEV' : docData.type === 'bl' ? 'BL' : 'BC';
      const numSeq = Math.floor(100 + Math.random() * 900);
      const newNum = `${prefix}-2026-${numSeq}`;

      // Authoritative calculation of financial metrics
      const totals = recalculateDocumentTotals(docData.items, docData.paymentMethod, docData.paidAmount);

      const newDoc: BusinessDocument = {
        ...docData,
        id: `doc-${Date.now()}`,
        number: newNum,
        subtotalHt: totals.subtotalHt,
        totalTva: totals.totalTva,
        droitDeTimbre: totals.droitDeTimbre,
        totalTtc: totals.totalTtc,
        remainingAmount: totals.remainingAmount,
        status: totals.remainingAmount <= 0 ? 'paid' : docData.paidAmount > 0 ? 'partial' : 'unpaid'
      };

      setDocuments(prev => [newDoc, ...prev]);
      await saveDocumentToFirestore(newDoc, orgId);

      // Log Business Events
      if (newDoc.type === 'facture') {
        await triggerAuditLog('INVOICE_CREATED', {
          documentId: newDoc.id,
          documentNumber: newDoc.number,
          amountTtc: newDoc.totalTtc,
          customerName: newDoc.customerName
        });
      }

      // If invoice is unpaid/partial and set to Kreddy, update client balance
      if (newDoc.type === 'facture' && newDoc.paymentMethod === 'kreddy' && newDoc.remainingAmount > 0) {
        await adjustKreddyBalance(newDoc.customerId, newDoc.remainingAmount);
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

      const numSeq = Math.floor(100 + Math.random() * 900);
      const totals = recalculateDocumentTotals(devis.items, devis.paymentMethod, 0);

      const newInvoice: BusinessDocument = {
        ...devis,
        id: `doc-${Date.now()}`,
        number: `FAC-2026-${numSeq}`,
        type: 'facture',
        convertedFromId: devis.id,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        status: 'unpaid',
        paidAmount: 0,
        subtotalHt: totals.subtotalHt,
        totalTva: totals.totalTva,
        droitDeTimbre: totals.droitDeTimbre,
        totalTtc: totals.totalTtc,
        remainingAmount: totals.totalTtc,
      };

      setDocuments(prev => [newInvoice, ...prev]);
      await saveDocumentToFirestore(newInvoice, orgId);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const recordDocumentPayment = async (docId: string, amount: number, method: PaymentMethod) => {
    setIsSaving(true);
    try {
      let docToSave: BusinessDocument | null = null;
      setDocuments(prev => prev.map(doc => {
        if (doc.id === docId) {
          const newPaid = Number((doc.paidAmount + amount).toFixed(2));
          const newRemaining = Math.max(0, Number((doc.totalTtc - newPaid).toFixed(2)));
          const newStatus = newRemaining === 0 ? 'paid' : 'partial';

          // If paying a Kreddy debt
          if (doc.customerId) {
            adjustKreddyBalance(doc.customerId, -amount);
          }

          const updatedDoc = {
            ...doc,
            paidAmount: newPaid,
            remainingAmount: newRemaining,
            status: newStatus,
            paymentMethod: method,
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

  const processPosSale = (cart: PosCartItem[], method: PaymentMethod, customerId?: string) => {
    if (cart.length === 0) return;

    // Calculate Totals
    let subtotalHt = 0;
    let totalTva = 0;

    const docItems = cart.map((item, idx) => {
      const unitPrice = item.selectedVariant ? item.selectedVariant.sellingPrice : item.product.sellingPrice;
      const { tvaAmount, amountTtc } = calculateTva(unitPrice * item.quantity, item.product.tvaRate);
      subtotalHt += unitPrice * item.quantity;
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
        unitPriceHt: unitPrice,
        tvaRate: item.product.tvaRate,
        totalHt: Number((unitPrice * item.quantity).toFixed(2)),
        totalTva: tvaAmount,
        totalTtc: amountTtc,
      };
    });

    const totalTtc = Number((subtotalHt + totalTva).toFixed(2));
    const droitDeTimbre = calculateDroitDeTimbre(totalTtc, method);
    const finalAmount = Number((totalTtc + droitDeTimbre).toFixed(2));

    const cust = customerId ? customers.find(c => c.id === customerId) : null;
    const custName = cust ? cust.name : 'Client Passage (Comptoir)';

    // 1. Create Invoice / Receipt
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
      paidAmount: method === 'kreddy' ? 0 : finalAmount,
      remainingAmount: method === 'kreddy' ? finalAmount : 0,
      status: method === 'kreddy' ? 'unpaid' : 'paid',
      paymentMethod: method,
      notes: 'Vente Caisse POS',
    };

    setDocuments(prev => [newDoc, ...prev]);

    // 2. Decrement Product & Variant Stock
    setProducts(prev => prev.map(p => {
      // Find all cart items for this product
      const matchingItems = cart.filter(ci => ci.product.id === p.id);
      if (matchingItems.length === 0) return p;

      let newStockQty = p.stockQty;
      let newVariants = p.variants;

      matchingItems.forEach(ci => {
        newStockQty = Math.max(0, newStockQty - ci.quantity);
        if (ci.selectedVariant && newVariants) {
          newVariants = newVariants.map(v => {
            if (v.id === ci.selectedVariant!.id) {
              return { ...v, stockQty: Math.max(0, v.stockQty - ci.quantity) };
            }
            return v;
          });
        }
      });

      return {
        ...p,
        stockQty: newStockQty,
        variants: newVariants,
      };
    }));

    // 3. If method is Kreddy, update customer balance
    if (method === 'kreddy' && cust) {
      adjustKreddyBalance(cust.id, finalAmount);
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

    // 4. Update Cash Register Session
    setCashSession(prev => {
      let cashSales = prev.totalSalesCash;
      let cardSales = prev.totalSalesCard;
      let checkSales = prev.totalSalesCheck;
      let kreddySales = prev.totalSalesKreddy;

      if (method === 'cash') cashSales += finalAmount;
      if (method === 'cmi_card') cardSales += finalAmount;
      if (method === 'check') checkSales += finalAmount;
      if (method === 'kreddy') kreddySales += finalAmount;

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

    // 5. Queue Offline Sale and Inventory Updates in IndexedDB for Background Sync
    queueOfflineSale(newDoc).then(() => {
      refreshPendingCount();
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        syncOfflineDataWithBackend().then(() => refreshPendingCount());
      }
    });

    cart.forEach(ci => {
      queueOfflineInventoryUpdate(ci.product.id, ci.selectedVariant?.id, -ci.quantity);
    });
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

  const openWhatsAppModal = (phone: string, name: string, defaultText: string) => {
    setWhatsAppModalData({ isOpen: true, phone, name, text: defaultText });
  };

  const closeWhatsAppModal = () => {
    setWhatsAppModalData(null);
  };

  return (
    <StoreContext.Provider
      value={{
        language,
        setLanguage,
        activeModule,
        setActiveModule,
        profile,
        updateProfile,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        adjustKreddyBalance,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        suppliers,
        addSupplier,
        updateSupplier,
        documents,
        addDocument,
        convertDevisToInvoice,
        recordDocumentPayment,
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
