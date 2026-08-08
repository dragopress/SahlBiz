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
  Product,
  Supplier,
  BusinessDocument,
  Expense,
  Employee
} from '../types';

/**
 * Multi-tenant Firestore Service Layer for SahlBiz
 * Ensures all documents are saved and fetched with orgId scoping.
 */

// 1. Business Profile
export async function saveProfileToFirestore(profile: BusinessProfile, orgId: string) {
  const path = `businessProfiles/${orgId}`;
  try {
    await setDoc(doc(db, 'businessProfiles', orgId), {
      ...profile,
      orgId
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// 2. Customer
export async function saveCustomerToFirestore(customer: Customer, orgId: string) {
  const path = `customers/${customer.id}`;
  try {
    await setDoc(doc(db, 'customers', customer.id), {
      ...customer,
      orgId
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteCustomerFromFirestore(id: string) {
  const path = `customers/${id}`;
  try {
    await deleteDoc(doc(db, 'customers', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// 3. Product
export async function saveProductToFirestore(product: Product, orgId: string) {
  const path = `products/${product.id}`;
  try {
    await setDoc(doc(db, 'products', product.id), {
      ...product,
      orgId
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteProductFromFirestore(id: string) {
  const path = `products/${id}`;
  try {
    await deleteDoc(doc(db, 'products', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// 4. Supplier
export async function saveSupplierToFirestore(supplier: Supplier, orgId: string) {
  const path = `suppliers/${supplier.id}`;
  try {
    await setDoc(doc(db, 'suppliers', supplier.id), {
      ...supplier,
      orgId
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// 5. Business Document (Invoices, Devis, BL, Commandes)
export async function saveDocumentToFirestore(document: BusinessDocument, orgId: string) {
  const path = `documents/${document.id}`;
  try {
    await setDoc(doc(db, 'documents', document.id), {
      ...document,
      orgId
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// 6. Expense
export async function saveExpenseToFirestore(expense: Expense, orgId: string) {
  const path = `expenses/${expense.id}`;
  try {
    await setDoc(doc(db, 'expenses', expense.id), {
      ...expense,
      orgId
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteExpenseFromFirestore(id: string) {
  const path = `expenses/${id}`;
  try {
    await deleteDoc(doc(db, 'expenses', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// 7. Employee
export async function saveEmployeeToFirestore(employee: Employee, orgId: string) {
  const path = `employees/${employee.id}`;
  try {
    await setDoc(doc(db, 'employees', employee.id), {
      ...employee,
      orgId
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteEmployeeFromFirestore(id: string) {
  const path = `employees/${id}`;
  try {
    await deleteDoc(doc(db, 'employees', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// FETCH INITIAL ORGANIZATIONAL DATA
export async function fetchInitialFirestoreData(orgId: string) {
  if (!orgId || orgId === 'org_default' || !auth.currentUser) {
    return null;
  }

  try {
    const qCustomers = query(collection(db, 'customers'), where('orgId', '==', orgId));
    const qProducts = query(collection(db, 'products'), where('orgId', '==', orgId));
    const qSuppliers = query(collection(db, 'suppliers'), where('orgId', '==', orgId));
    const qDocuments = query(collection(db, 'documents'), where('orgId', '==', orgId));
    const qExpenses = query(collection(db, 'expenses'), where('orgId', '==', orgId));
    const qEmployees = query(collection(db, 'employees'), where('orgId', '==', orgId));
    const qProfile = query(collection(db, 'businessProfiles'), where('orgId', '==', orgId));

    const safeFetch = async (q: any) => {
      try {
        return await getDocs(q);
      } catch (e) {
        console.warn('Firestore fetch query warning:', e);
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
      snapProfile
    ] = await Promise.all([
      safeFetch(qCustomers),
      safeFetch(qProducts),
      safeFetch(qSuppliers),
      safeFetch(qDocuments),
      safeFetch(qExpenses),
      safeFetch(qEmployees),
      safeFetch(qProfile)
    ]);

    const customers: Customer[] = (snapCustomers.docs || []).map((d: any) => d.data() as Customer);
    const products: Product[] = (snapProducts.docs || []).map((d: any) => d.data() as Product);
    const suppliers: Supplier[] = (snapSuppliers.docs || []).map((d: any) => d.data() as Supplier);
    const documents: BusinessDocument[] = (snapDocs.docs || []).map((d: any) => d.data() as BusinessDocument);
    const expenses: Expense[] = (snapExpenses.docs || []).map((d: any) => d.data() as Expense);
    const employees: Employee[] = (snapEmployees.docs || []).map((d: any) => d.data() as Employee);
    
    let businessProfile: BusinessProfile | null = null;
    if (snapProfile && !snapProfile.empty && snapProfile.docs && snapProfile.docs.length > 0) {
      businessProfile = snapProfile.docs[0].data() as BusinessProfile;
    }

    return {
      customers,
      products,
      suppliers,
      documents,
      expenses,
      employees,
      businessProfile
    };
  } catch (err) {
    console.error('Error in fetchInitialFirestoreData:', err);
    return null;
  }
}
