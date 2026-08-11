import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertSucceeds,
  assertFails
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';

/**
 * Automated Firestore Security Rules Unit Tests
 * Enforces multi-tenancy, cross-tenant isolation, subscription protection, 
 * administrative gates, and RBAC operations.
 */

describe('SahlBiz Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment;
  const PROJECT_ID = 'ai-studio-sahlbiz-test';

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  // ==========================================
  // PILLAR 1: GLOBAL DENY & SYSTEM CONFIGS
  // ==========================================

  describe('Global Configuration & Subscriptions', () => {
    it('should deny unauthenticated reads to systemConfig', async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(unauthedDb, 'systemConfig/global')));
    });

    it('should allow authenticated reads to systemConfig', async () => {
      const authedDb = testEnv.authenticatedContext('user_123').firestore();
      await assertSucceeds(getDoc(doc(authedDb, 'systemConfig/global')));
    });

    it('should deny normal users from writing systemConfig', async () => {
      const authedDb = testEnv.authenticatedContext('user_123').firestore();
      await assertFails(setDoc(doc(authedDb, 'systemConfig/global'), { maintenanceMode: true }));
    });

    it('should deny normal users from writing subscription logs', async () => {
      const authedDb = testEnv.authenticatedContext('user_123').firestore();
      await assertFails(setDoc(doc(authedDb, 'subscriptions/sub_user_123'), { plan: 'business' }));
    });

    it('should allow global administrators to write systemConfig', async () => {
      // Admin recognized by email inside the rules
      const adminDb = testEnv.authenticatedContext('admin_user', {
        email: 'admin@sahlbiz.ma',
        email_verified: true
      }).firestore();
      await assertSucceeds(setDoc(doc(adminDb, 'systemConfig/global'), { maintenanceMode: false }));
    });
  });

  // ==========================================
  // PILLAR 2: TENANT ISOLATION (CROSS-TENANT)
  // ==========================================

  describe('Multi-Tenant Isolation & Cross-Access', () => {
    it('should allow Tenant A member to read Tenant A documents', async () => {
      // Simulate user profile and org setup
      const tenantADb = testEnv.authenticatedContext('user_tenantA', {
        email: 'ownerA@sahlbiz.ma',
        email_verified: true
      }).firestore();

      // Seed user profile
      await assertSucceeds(setDoc(doc(tenantADb, 'users/user_tenantA'), {
        uid: 'user_tenantA',
        orgId: 'org_tenantA',
        role: 'owner'
      }));

      // Read own org's customer
      await assertSucceeds(getDoc(doc(tenantADb, 'organizations/org_tenantA/customers/cust_123')));
    });

    it('should reject Tenant B trying to access Tenant A documents (Cross-Tenant)', async () => {
      const tenantBDb = testEnv.authenticatedContext('user_tenantB', {
        email: 'ownerB@sahlbiz.ma',
        email_verified: true
      }).firestore();

      // Seed Tenant B user profile
      await assertSucceeds(setDoc(doc(tenantBDb, 'users/user_tenantB'), {
        uid: 'user_tenantB',
        orgId: 'org_tenantB',
        role: 'owner'
      }));

      // Attempt to read Tenant A customer
      await assertFails(getDoc(doc(tenantBDb, 'organizations/org_tenantA/customers/cust_123')));
    });

    it('should reject Tenant B trying to inject a product into Tenant A (Cross-Write)', async () => {
      const tenantBDb = testEnv.authenticatedContext('user_tenantB', {
        email: 'ownerB@sahlbiz.ma',
        email_verified: true
      }).firestore();

      // Seed Tenant B profile
      await assertSucceeds(setDoc(doc(tenantBDb, 'users/user_tenantB'), {
        uid: 'user_tenantB',
        orgId: 'org_tenantB',
        role: 'owner'
      }));

      // Write product into org_tenantA
      const maliciousProduct = {
        id: 'prod_999',
        name: 'Malicious Hack Product',
        sku: 'HACK-01',
        barcode: '12345678',
        category: 'Injections',
        unit: 'piece',
        costPrice: 10,
        sellingPrice: 100,
        tvaRate: 20,
        stockQty: 50,
        minStockAlert: 5,
        location: 'magasin',
        orgId: 'org_tenantA'
      };

      await assertFails(setDoc(doc(tenantBDb, 'organizations/org_tenantA/products/prod_999'), maliciousProduct));
    });
  });

  // ==========================================
  // PILLAR 3: ROLE-BASED ACCESS CONTROL (RBAC)
  // ==========================================

  describe('Role-Based Access Control', () => {
    it('should deny role escalation on user profile updates', async () => {
      const cashierDb = testEnv.authenticatedContext('user_cashier', {
        email: 'cashier@sahlbiz.ma',
        email_verified: true
      }).firestore();

      // Initial user registration
      await assertSucceeds(setDoc(doc(cashierDb, 'users/user_cashier'), {
        uid: 'user_cashier',
        orgId: 'org_tenantA',
        role: 'cashier'
      }));

      // Try to update role to owner (privilege escalation)
      await assertFails(setDoc(doc(cashierDb, 'users/user_cashier'), {
        uid: 'user_cashier',
        orgId: 'org_tenantA',
        role: 'owner'
      }));
    });

    it('should restrict deletions of customers to manager/owner and block cashiers', async () => {
      const cashierDb = testEnv.authenticatedContext('user_cashier', {
        email: 'cashier@sahlbiz.ma',
        email_verified: true
      }).firestore();

      // Seed cashier user profile mapping
      await assertSucceeds(setDoc(doc(cashierDb, 'users/user_cashier'), {
        uid: 'user_cashier',
        orgId: 'org_tenantA',
        role: 'cashier'
      }));

      // Cashier attempts to delete a customer
      await assertFails(deleteDoc(doc(cashierDb, 'organizations/org_tenantA/customers/cust_123')));
    });
  });

  // ==========================================
  // PILLAR 4: SCHEMAS & DOCUMENT ID REGEX
  // ==========================================

  describe('ID Poisoning & Schema Boundary Integrity', () => {
    it('should deny customer write with malicious path ID', async () => {
      const ownerDb = testEnv.authenticatedContext('user_tenantA', {
        email: 'ownerA@sahlbiz.ma',
        email_verified: true
      }).firestore();

      await assertSucceeds(setDoc(doc(ownerDb, 'users/user_tenantA'), {
        uid: 'user_tenantA',
        orgId: 'org_tenantA',
        role: 'owner'
      }));

      const badCustomer = {
        id: 'cust_bad_id_poisoning_stuff_!!_??',
        name: 'John Doe',
        phone: '+212600000000',
        pricingTier: 'standard',
        creditLimit: 1000,
        kreddyBalance: 0,
        createdAt: '2026-08-11T12:00:00Z',
        orgId: 'org_tenantA'
      };

      // Try with invalid document ID character (!)
      await assertFails(setDoc(doc(ownerDb, 'organizations/org_tenantA/customers/cust_bad_id_poisoning_stuff_!!_??'), badCustomer));
    });

    it('should reject a field that exceeds the volumetric constraint (Denial of Wallet)', async () => {
      const ownerDb = testEnv.authenticatedContext('user_tenantA', {
        email: 'ownerA@sahlbiz.ma',
        email_verified: true
      }).firestore();

      await assertSucceeds(setDoc(doc(ownerDb, 'users/user_tenantA'), {
        uid: 'user_tenantA',
        orgId: 'org_tenantA',
        role: 'owner'
      }));

      const oversizedCustomer = {
        id: 'cust_123',
        name: 'A'.repeat(500), // Max allowed in rule is 100
        phone: '+212600000000',
        pricingTier: 'standard',
        creditLimit: 1000,
        kreddyBalance: 0,
        createdAt: '2026-08-11T12:00:00Z',
        orgId: 'org_tenantA'
      };

      await assertFails(setDoc(doc(ownerDb, 'organizations/org_tenantA/customers/cust_123'), oversizedCustomer));
    });
  });
});
