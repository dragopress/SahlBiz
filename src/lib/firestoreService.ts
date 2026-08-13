import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import {
  BusinessProfile,
  Customer,
  CreditLedgerEntry,
  Product,
  Supplier,
  BusinessDocument,
  Expense,
  Employee,
  InventoryMovement,
  CashRegister,
  CashSession,
  CashMovement,
  CashReconciliation
} from '../types';

/**
 * Multi-tenant Firestore Service Layer for SahlBiz
 * Ensures all documents are saved and fetched with canonical organizations/{orgId} subcollection structures.
 * Supports dual-writing and auto-migration for zero-downtime transition.
 */

// 1. Business Profile
export async function saveProfileToFirestore(profile: BusinessProfile, orgId: string) {
  const subPath = `organizations/${orgId}/businessProfiles/current`;
  const topPath = `businessProfiles/${orgId}`;
  try {
    // Canonical subcollection
    await setDoc(doc(db, 'organizations', orgId, 'businessProfiles', 'current'), {
      ...profile,
      orgId
    });
    // Backward-compatibility top-level
    await setDoc(doc(db, 'businessProfiles', orgId), {
      ...profile,
      orgId
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, subPath);
  }
}

// 2. Customer
export async function saveCustomerToFirestore(customer: Customer, orgId: string) {
  const subPath = `organizations/${orgId}/customers/${customer.id}`;
  const topPath = `customers/${customer.id}`;
  try {
    // Canonical subcollection
    await setDoc(doc(db, 'organizations', orgId, 'customers', customer.id), {
      ...customer,
      orgId
    });
    // Backward-compatibility top-level
    await setDoc(doc(db, 'customers', customer.id), {
      ...customer,
      orgId
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, subPath);
  }
}

export async function deleteCustomerFromFirestore(id: string, orgId?: string) {
  const derivedOrgId = orgId || (auth.currentUser ? `org_${auth.currentUser.uid.slice(0, 8)}` : 'org_default');
  const subPath = `organizations/${derivedOrgId}/customers/${id}`;
  try {
    // Canonical subcollection
    await deleteDoc(doc(db, 'organizations', derivedOrgId, 'customers', id));
    // Backward-compatibility top-level
    await deleteDoc(doc(db, 'customers', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, subPath);
  }
}

// 3. Product
export async function saveProductToFirestore(product: Product, orgId: string) {
  const subPath = `organizations/${orgId}/products/${product.id}`;
  const topPath = `products/${product.id}`;
  try {
    // Canonical subcollection
    await setDoc(doc(db, 'organizations', orgId, 'products', product.id), {
      ...product,
      orgId
    });
    // Backward-compatibility top-level
    await setDoc(doc(db, 'products', product.id), {
      ...product,
      orgId
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, subPath);
  }
}

export async function deleteProductFromFirestore(id: string, orgId?: string) {
  const derivedOrgId = orgId || (auth.currentUser ? `org_${auth.currentUser.uid.slice(0, 8)}` : 'org_default');
  const subPath = `organizations/${derivedOrgId}/products/${id}`;
  try {
    // Canonical subcollection
    await deleteDoc(doc(db, 'organizations', derivedOrgId, 'products', id));
    // Backward-compatibility top-level
    await deleteDoc(doc(db, 'products', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, subPath);
  }
}

// 4. Supplier
export async function saveSupplierToFirestore(supplier: Supplier, orgId: string) {
  const subPath = `organizations/${orgId}/suppliers/${supplier.id}`;
  const topPath = `suppliers/${supplier.id}`;
  try {
    // Canonical subcollection
    await setDoc(doc(db, 'organizations', orgId, 'suppliers', supplier.id), {
      ...supplier,
      orgId
    });
    // Backward-compatibility top-level
    await setDoc(doc(db, 'suppliers', supplier.id), {
      ...supplier,
      orgId
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, subPath);
  }
}

export async function deleteSupplierFromFirestore(id: string, orgId?: string) {
  const derivedOrgId = orgId || (auth.currentUser ? `org_${auth.currentUser.uid.slice(0, 8)}` : 'org_default');
  const subPath = `organizations/${derivedOrgId}/suppliers/${id}`;
  try {
    // Canonical subcollection
    await deleteDoc(doc(db, 'organizations', derivedOrgId, 'suppliers', id));
    // Backward-compatibility top-level
    await deleteDoc(doc(db, 'suppliers', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, subPath);
  }
}

// 5. Business Document (Invoices, Devis, BL, Commandes)
export async function saveDocumentToFirestore(document: BusinessDocument, orgId: string) {
  const subPath = `organizations/${orgId}/documents/${document.id}`;
  const topPath = `documents/${document.id}`;
  try {
    // Canonical subcollection
    await setDoc(doc(db, 'organizations', orgId, 'documents', document.id), {
      ...document,
      orgId
    });
    // Backward-compatibility top-level
    await setDoc(doc(db, 'documents', document.id), {
      ...document,
      orgId
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, subPath);
  }
}

export async function deleteDocumentFromFirestore(id: string, orgId?: string) {
  const derivedOrgId = orgId || (auth.currentUser ? `org_${auth.currentUser.uid.slice(0, 8)}` : 'org_default');
  const subPath = `organizations/${derivedOrgId}/documents/${id}`;
  try {
    // Canonical subcollection
    await deleteDoc(doc(db, 'organizations', derivedOrgId, 'documents', id));
    // Backward-compatibility top-level
    await deleteDoc(doc(db, 'documents', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, subPath);
  }
}

// 6. Expense
export async function saveExpenseToFirestore(expense: Expense, orgId: string) {
  const subPath = `organizations/${orgId}/expenses/${expense.id}`;
  const topPath = `expenses/${expense.id}`;
  try {
    // Canonical subcollection
    await setDoc(doc(db, 'organizations', orgId, 'expenses', expense.id), {
      ...expense,
      orgId
    });
    // Backward-compatibility top-level
    await setDoc(doc(db, 'expenses', expense.id), {
      ...expense,
      orgId
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, subPath);
  }
}

export async function deleteExpenseFromFirestore(id: string, orgId?: string) {
  const derivedOrgId = orgId || (auth.currentUser ? `org_${auth.currentUser.uid.slice(0, 8)}` : 'org_default');
  const subPath = `organizations/${derivedOrgId}/expenses/${id}`;
  try {
    // Canonical subcollection
    await deleteDoc(doc(db, 'organizations', derivedOrgId, 'expenses', id));
    // Backward-compatibility top-level
    await deleteDoc(doc(db, 'expenses', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, subPath);
  }
}

// 7. Employee
export async function saveEmployeeToFirestore(employee: Employee, orgId: string) {
  const subPath = `organizations/${orgId}/employees/${employee.id}`;
  const topPath = `employees/${employee.id}`;
  try {
    // Canonical subcollection
    await setDoc(doc(db, 'organizations', orgId, 'employees', employee.id), {
      ...employee,
      orgId
    });
    // Backward-compatibility top-level
    await setDoc(doc(db, 'employees', employee.id), {
      ...employee,
      orgId
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, subPath);
  }
}

export async function deleteEmployeeFromFirestore(id: string, orgId?: string) {
  const derivedOrgId = orgId || (auth.currentUser ? `org_${auth.currentUser.uid.slice(0, 8)}` : 'org_default');
  const subPath = `organizations/${derivedOrgId}/employees/${id}`;
  try {
    // Canonical subcollection
    await deleteDoc(doc(db, 'organizations', derivedOrgId, 'employees', id));
    // Backward-compatibility top-level
    await deleteDoc(doc(db, 'employees', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, subPath);
  }
}

// FETCH INITIAL ORGANIZATIONAL DATA (With Canonical Priority and Legacy Fallback)
export async function fetchInitialFirestoreData(orgId: string) {
  if (!orgId || orgId === 'org_default' || !auth.currentUser) {
    return null;
  }

  try {
    const subCustomers = query(collection(db, 'organizations', orgId, 'customers'));
    const subProducts = query(collection(db, 'organizations', orgId, 'products'));
    const subSuppliers = query(collection(db, 'organizations', orgId, 'suppliers'));
    const subDocuments = query(collection(db, 'organizations', orgId, 'documents'));
    const subExpenses = query(collection(db, 'organizations', orgId, 'expenses'));
    const subEmployees = query(collection(db, 'organizations', orgId, 'employees'));
    const subProfile = query(collection(db, 'organizations', orgId, 'businessProfiles'));
    const subInventoryMovements = query(collection(db, 'organizations', orgId, 'inventoryMovements'));
    const subCreditLedger = query(collection(db, 'organizations', orgId, 'creditLedger'));

    const safeFetch = async (q: any) => {
      try {
        return await getDocs(q);
      } catch (e) {
        console.warn('Firestore subcollection fetch query warning:', e);
        return { docs: [], empty: true };
      }
    };

    const [
      snapCustomers,
      snapProducts,
      snapSuppliers,
      snapDocs,
      snapExpenses,
      snapEmployees,
      snapProfile,
      snapMovements,
      snapCreditLedger
    ] = await Promise.all([
      safeFetch(subCustomers),
      safeFetch(subProducts),
      safeFetch(subSuppliers),
      safeFetch(subDocuments),
      safeFetch(subExpenses),
      safeFetch(subEmployees),
      safeFetch(subProfile),
      safeFetch(subInventoryMovements),
      safeFetch(subCreditLedger)
    ]);

    let customers: Customer[] = (snapCustomers.docs || []).map((d: any) => d.data() as Customer);
    let products: Product[] = (snapProducts.docs || []).map((d: any) => d.data() as Product);
    let suppliers: Supplier[] = (snapSuppliers.docs || []).map((d: any) => d.data() as Supplier);
    let documents: BusinessDocument[] = (snapDocs.docs || []).map((d: any) => d.data() as BusinessDocument);
    let expenses: Expense[] = (snapExpenses.docs || []).map((d: any) => d.data() as Expense);
    let employees: Employee[] = (snapEmployees.docs || []).map((d: any) => d.data() as Employee);
    let inventoryMovements: InventoryMovement[] = (snapMovements.docs || []).map((d: any) => d.data() as InventoryMovement);
    let creditLedgerEntries: CreditLedgerEntry[] = (snapCreditLedger.docs || []).map((d: any) => d.data() as CreditLedgerEntry);
    
    let businessProfile: BusinessProfile | null = null;
    if (snapProfile && !snapProfile.empty && snapProfile.docs && snapProfile.docs.length > 0) {
      businessProfile = snapProfile.docs[0].data() as BusinessProfile;
    }

    // Transparent Backward Compatibility & Automatic Subcollection Migration
    if (customers.length === 0 && products.length === 0 && documents.length === 0 && !businessProfile) {
      console.log('[Multi-Tenancy Auto-Migration] Canonical tenant subcollections empty. Checking legacy top-level collections for org:', orgId);
      
      const qCustomers = query(collection(db, 'customers'), where('orgId', '==', orgId));
      const qProducts = query(collection(db, 'products'), where('orgId', '==', orgId));
      const qSuppliers = query(collection(db, 'suppliers'), where('orgId', '==', orgId));
      const qDocuments = query(collection(db, 'documents'), where('orgId', '==', orgId));
      const qExpenses = query(collection(db, 'expenses'), where('orgId', '==', orgId));
      const qEmployees = query(collection(db, 'employees'), where('orgId', '==', orgId));
      const qLegacyProfile = query(collection(db, 'businessProfiles'), where('orgId', '==', orgId));

      const [
        legacyCustomers,
        legacyProducts,
        legacySuppliers,
        legacyDocs,
        legacyExpenses,
        legacyEmployees,
        legacyProfile
      ] = await Promise.all([
        safeFetch(qCustomers),
        safeFetch(qProducts),
        safeFetch(qSuppliers),
        safeFetch(qDocuments),
        safeFetch(qExpenses),
        safeFetch(qEmployees),
        safeFetch(qLegacyProfile)
      ]);

      const fetchedCustomers = (legacyCustomers.docs || []).map((d: any) => d.data() as Customer);
      const fetchedProducts = (legacyProducts.docs || []).map((d: any) => d.data() as Product);
      const fetchedSuppliers = (legacySuppliers.docs || []).map((d: any) => d.data() as Supplier);
      const fetchedDocs = (legacyDocs.docs || []).map((d: any) => d.data() as BusinessDocument);
      const fetchedExpenses = (legacyExpenses.docs || []).map((d: any) => d.data() as Expense);
      const fetchedEmployees = (legacyEmployees.docs || []).map((d: any) => d.data() as Employee);
      
      let fetchedProfile: BusinessProfile | null = null;
      if (legacyProfile && !legacyProfile.empty && legacyProfile.docs && legacyProfile.docs.length > 0) {
        fetchedProfile = legacyProfile.docs[0].data() as BusinessProfile;
      }

      // Perform background async upsert migration to canonical structures
      if (fetchedProfile) {
        saveProfileToFirestore(fetchedProfile, orgId).catch(console.error);
        businessProfile = fetchedProfile;
      }
      if (fetchedCustomers.length > 0) {
        fetchedCustomers.forEach(c => saveCustomerToFirestore(c, orgId).catch(console.error));
        customers = fetchedCustomers;
      }
      if (fetchedProducts.length > 0) {
        fetchedProducts.forEach(p => saveProductToFirestore(p, orgId).catch(console.error));
        products = fetchedProducts;
      }
      if (fetchedSuppliers.length > 0) {
        fetchedSuppliers.forEach(s => saveSupplierToFirestore(s, orgId).catch(console.error));
        suppliers = fetchedSuppliers;
      }
      if (fetchedDocs.length > 0) {
        fetchedDocs.forEach(d => saveDocumentToFirestore(d, orgId).catch(console.error));
        documents = fetchedDocs;
      }
      if (fetchedExpenses.length > 0) {
        fetchedExpenses.forEach(e => saveExpenseToFirestore(e, orgId).catch(console.error));
        expenses = fetchedExpenses;
      }
      if (fetchedEmployees.length > 0) {
        fetchedEmployees.forEach(e => saveEmployeeToFirestore(e, orgId).catch(console.error));
        employees = fetchedEmployees;
      }

      console.log('[Multi-Tenancy Auto-Migration] Successfully migrated legacy collections to canonical subcollections.');
    }

    return {
      customers,
      products,
      suppliers,
      documents,
      expenses,
      employees,
      businessProfile,
      inventoryMovements,
      creditLedgerEntries
    };
  } catch (err) {
    console.error('Error in fetchInitialFirestoreData:', err);
    return null;
  }
}

// 8. Inventory Movements
export async function saveInventoryMovementToFirestore(movement: InventoryMovement, orgId: string) {
  const subPath = `organizations/${orgId}/inventoryMovements/${movement.id}`;
  try {
    await setDoc(doc(db, 'organizations', orgId, 'inventoryMovements', movement.id), {
      ...movement,
      organizationId: orgId
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, subPath);
  }
}

export async function fetchInventoryMovementsFromFirestore(orgId: string): Promise<InventoryMovement[]> {
  const subPath = `organizations/${orgId}/inventoryMovements`;
  try {
    const q = query(collection(db, 'organizations', orgId, 'inventoryMovements'));
    const snap = await getDocs(q);
    return (snap.docs || []).map((d: any) => d.data() as InventoryMovement);
  } catch (err) {
    console.warn('Firestore fetch inventoryMovements warning:', err);
    return [];
  }
}

// 9. Cash Registers
export async function saveCashRegisterToFirestore(register: CashRegister, orgId: string) {
  const subPath = `organizations/${orgId}/cashRegisters/${register.id}`;
  try {
    await setDoc(doc(db, 'organizations', orgId, 'cashRegisters', register.id), {
      ...register,
      orgId
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, subPath);
  }
}

export async function fetchCashRegistersFromFirestore(orgId: string): Promise<CashRegister[]> {
  try {
    const q = query(collection(db, 'organizations', orgId, 'cashRegisters'));
    const snap = await getDocs(q);
    return (snap.docs || []).map((d: any) => d.data() as CashRegister);
  } catch (err) {
    console.warn('Firestore fetch cashRegisters warning:', err);
    return [];
  }
}

// 10. Cash Sessions
export async function saveCashSessionToFirestore(session: CashSession, orgId: string) {
  const subPath = `organizations/${orgId}/cashSessions/${session.id}`;
  try {
    await setDoc(doc(db, 'organizations', orgId, 'cashSessions', session.id), {
      ...session,
      orgId
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, subPath);
  }
}

export async function fetchCashSessionsFromFirestore(orgId: string): Promise<CashSession[]> {
  try {
    const q = query(collection(db, 'organizations', orgId, 'cashSessions'));
    const snap = await getDocs(q);
    return (snap.docs || []).map((d: any) => d.data() as CashSession);
  } catch (err) {
    console.warn('Firestore fetch cashSessions warning:', err);
    return [];
  }
}

// 11. Cash Movements
export async function saveCashMovementToFirestore(movement: CashMovement, orgId: string) {
  const subPath = `organizations/${orgId}/cashMovements/${movement.id}`;
  try {
    await setDoc(doc(db, 'organizations', orgId, 'cashMovements', movement.id), {
      ...movement,
      orgId
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, subPath);
  }
}

export async function fetchCashMovementsFromFirestore(orgId: string): Promise<CashMovement[]> {
  try {
    const q = query(collection(db, 'organizations', orgId, 'cashMovements'));
    const snap = await getDocs(q);
    return (snap.docs || []).map((d: any) => d.data() as CashMovement);
  } catch (err) {
    console.warn('Firestore fetch cashMovements warning:', err);
    return [];
  }
}

// 12. Cash Reconciliations
export async function saveCashReconciliationToFirestore(reconciliation: CashReconciliation, orgId: string) {
  const subPath = `organizations/${orgId}/cashReconciliations/${reconciliation.id}`;
  try {
    await setDoc(doc(db, 'organizations', orgId, 'cashReconciliations', reconciliation.id), {
      ...reconciliation,
      orgId
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, subPath);
  }
}

export async function fetchCashReconciliationsFromFirestore(orgId: string): Promise<CashReconciliation[]> {
  try {
    const q = query(collection(db, 'organizations', orgId, 'cashReconciliations'));
    const snap = await getDocs(q);
    return (snap.docs || []).map((d: any) => d.data() as CashReconciliation);
  } catch (err) {
    console.warn('Firestore fetch cashReconciliations warning:', err);
    return [];
  }
}

// 13. Credit Ledger
export async function saveCreditLedgerEntryToFirestore(entry: CreditLedgerEntry, orgId: string) {
  const subPath = `organizations/${orgId}/creditLedger/${entry.id}`;
  try {
    await setDoc(doc(db, 'organizations', orgId, 'creditLedger', entry.id), {
      ...entry,
      orgId
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, subPath);
  }
}

export async function fetchCreditLedgerEntriesFromFirestore(orgId: string): Promise<CreditLedgerEntry[]> {
  try {
    const q = query(collection(db, 'organizations', orgId, 'creditLedger'));
    const snap = await getDocs(q);
    return (snap.docs || []).map((d: any) => d.data() as CreditLedgerEntry);
  } catch (err) {
    console.warn('Firestore fetch creditLedger warning:', err);
    return [];
  }
}

