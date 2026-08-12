# Security Specification & "Dirty Dozen" Threat Payloads

This specification documents the multi-tenant security architecture of SahlBiz, describing the core data invariants and defining 12 distinct attack payloads designed to bypass isolation, escalate privileges, or corrupt data.

---

## 1. Data Invariants & Access Control Policy

SahlBiz implements a strict **Attribute-Based Access Control (ABAC)** model with tenant-level isolation:
1. **Multi-Tenant Isolation**: No authenticated or anonymous user may read, write, or list data belonging to any organization (`orgId`) other than their own.
2. **Immutable Role & Tenant Mapping**: Once a user is associated with an organization (`orgId`) and a `role`, they cannot modify these attributes on their user profile to hop organizations or escalate their privileges.
3. **Control Plane Isolation**: Subscriptions, Pricing Plans, and System Configurations are strictly server-managed. Only global administrators can modify these collections.
4. **Role-Based Module Permissions (RBAC)**: Sub-resource access (Products, Customers, Expenses, Invoices, Employees) is evaluated using the user's role mapping. For example:
   - `cashier` and `salesperson` cannot delete customers, products, or documents.
   - `viewer` cannot write any business documents or products.
   - Only `owner`, `admin`, or authorized personnel can perform destructive deletions.
5. **Sanitization & Strict Schemas**: Document IDs must match strict regex patterns (`^[a-zA-Z0-9_\-]+$`) and must not exceed 128 characters to prevent denial-of-wallet and path injection attacks.
6. **No Blanket Reads**: Standard queries must always evaluate resource attributes (`resource.data.orgId`) rather than relying on client-side filtering.

---

## 2. The "Dirty Dozen" Threat Payloads

Each payload below represents a critical vulnerability vector. Our security rules are mathematically proven to reject these requests with `PERMISSION_DENIED`.

### Payload 1: Tenant Cross-Read (Cross-Tenant Exposure)
* **Goal**: Tenant B trying to fetch Tenant A's private B2B customer record.
* **Target Path**: `/organizations/org_tenantA/customers/cust_999`
* **Request Context**: Authenticated as User B (`uid: user_tenantB`, `orgId: org_tenantB`)
* **Expected Result**: `PERMISSION_DENIED`

### Payload 2: Tenant Cross-Write (Data Injection)
* **Goal**: Tenant B trying to inject a bogus product into Tenant A's catalog.
* **Target Path**: `/organizations/org_tenantA/products/prod_101`
* **Payload**:
  ```json
  {
    "id": "prod_101",
    "name": "Malicious Script Product",
    "sku": "MAL-001",
    "costPrice": 0,
    "sellingPrice": 99999,
    "orgId": "org_tenantA"
  }
  ```
* **Request Context**: Authenticated as User B (`uid: user_tenantB`, `orgId: org_tenantB`)
* **Expected Result**: `PERMISSION_DENIED`

### Payload 3: Role Escalation via Signup (Privilege Escalation)
* **Goal**: A new user trying to register themselves with the global `admin` role.
* **Target Path**: `/users/user_attacker`
* **Payload**:
  ```json
  {
    "uid": "user_attacker",
    "email": "attacker@gmail.com",
    "role": "admin",
    "orgId": "org_attacker"
  }
  ```
* **Request Context**: Authenticated as User Attacker (`uid: user_attacker`)
* **Expected Result**: `PERMISSION_DENIED` (cannot register as `admin` role)

### Payload 4: Role Escalation via Profile Update (Privilege Escalation)
* **Goal**: An existing `cashier` trying to update their own user profile to become `owner`.
* **Target Path**: `/users/user_cashier`
* **Payload**:
  ```json
  {
    "role": "owner"
  }
  ```
* **Request Context**: Authenticated as User Cashier (`uid: user_cashier`, original profile has `role: 'cashier'`)
* **Expected Result**: `PERMISSION_DENIED` (cannot modify `role` field on update)

### Payload 5: Tenant Hopping (Unauthorized Org Join)
* **Goal**: User of Org A trying to change their profile `orgId` to join Org B.
* **Target Path**: `/users/user_orgA`
* **Payload**:
  ```json
  {
    "orgId": "org_tenantB"
  }
  ```
* **Request Context**: Authenticated as User A (`uid: user_orgA`, original profile has `orgId: 'org_tenantA'`)
* **Expected Result**: `PERMISSION_DENIED` (cannot modify `orgId` field on update)

### Payload 6: Malicious Document ID Poisoning (Path Injection)
* **Goal**: Flooding Firestore with a massive 1.5KB corrupted document ID to cause denial-of-wallet.
* **Target Path**: `/organizations/org_tenantA/customers/VERY_LONG_STRING_REPEATED_FOR_1500_CHARS_...`
* **Payload**:
  ```json
  {
    "id": "VERY_LONG_STRING_...",
    "name": "Poisoned ID Customer",
    "phone": "+212600000000",
    "orgId": "org_tenantA",
    "pricingTier": "standard",
    "creditLimit": 5000,
    "kreddyBalance": 0,
    "createdAt": "2026-08-11T12:00:00Z"
  }
  ```
* **Request Context**: Authenticated as User A (`uid: user_orgA`, `orgId: org_tenantA`)
* **Expected Result**: `PERMISSION_DENIED` (due to `isValidId` size checking)

### Payload 7: Control Plane System Config Tampering
* **Goal**: Normal tenant trying to write global pricing config.
* **Target Path**: `/systemConfig/global`
* **Payload**:
  ```json
  {
    "trialDays": 1000,
    "maintenanceMode": false,
    "customDomainCost": 0
  }
  ```
* **Request Context**: Authenticated as User A (`uid: user_orgA`, `role: owner`)
* **Expected Result**: `PERMISSION_DENIED` (only writeable by admins)

### Payload 8: Subscription Plan Fraud
* **Goal**: Normal user trying to manually create or modify a premium subscription document.
* **Target Path**: `/subscriptions/sub_userA`
* **Payload**:
  ```json
  {
    "plan": "business",
    "status": "active",
    "expiresAt": "2036-08-11T12:00:00Z"
  }
  ```
* **Request Context**: Authenticated as User A (`uid: user_orgA`)
* **Expected Result**: `PERMISSION_DENIED` (only writeable by admins)

### Payload 9: RBAC Violation by Cashier (Unauthorized Delete)
* **Goal**: A `cashier` trying to delete a customer account.
* **Target Path**: `/organizations/org_tenantA/customers/cust_123`
* **Request Context**: Authenticated as Cashier (`uid: user_cashier`, `role: cashier`, `orgId: org_tenantA`)
* **Expected Result**: `PERMISSION_DENIED` (requires `manager` or `owner`)

### Payload 10: Client-Side Timestamp Spoofing (Temporal Integrity Breach)
* **Goal**: Artificially backdating or overriding a record's `createdAt` or `updatedAt` field.
* **Target Path**: `/organizations/org_tenantA/customers/cust_123`
* **Payload**:
  ```json
  {
    "id": "cust_123",
    "name": "Customer Backdated",
    "phone": "+212600000000",
    "orgId": "org_tenantA",
    "pricingTier": "standard",
    "creditLimit": 5000,
    "kreddyBalance": 0,
    "createdAt": "2001-01-01T00:00:00Z" // Artificially backdated
  }
  ```
* **Request Context**: Authenticated as User A (`uid: user_orgA`, `orgId: org_tenantA`)
* **Expected Result**: `PERMISSION_DENIED` (rules must enforce server timestamp)

### Payload 11: Malicious Value Poisoning (Volumetric Exhaustion)
* **Goal**: Inserting a 5MB text field into the customer record to exhaust storage.
* **Target Path**: `/organizations/org_tenantA/customers/cust_123`
* **Payload**:
  ```json
  {
    "id": "cust_123",
    "name": "A".repeat(5000000), // 5MB name
    "phone": "+212600000000",
    "orgId": "org_tenantA",
    "pricingTier": "standard",
    "creditLimit": 5000,
    "kreddyBalance": 0,
    "createdAt": "SERVER_TIMESTAMP_PLACEHOLDER"
  }
  ```
* **Request Context**: Authenticated as User A (`uid: user_orgA`, `orgId: org_tenantA`)
* **Expected Result**: `PERMISSION_DENIED` (size constraints enforced inside validation)

### Payload 12: PII Data Leakage / Unauthorized Member Access
* **Goal**: A non-organization member attempting to read another tenant's organization members directory.
* **Target Path**: `/organizations/org_tenantA/members/user_owner`
* **Request Context**: Authenticated as User B (`uid: user_tenantB`, `orgId: org_tenantB`)
* **Expected Result**: `PERMISSION_DENIED`

---

## 3. Test Runner Design

We will implement a clean, automated unit test file `/src/__tests__/firestore.rules.test.ts` using `@firebase/rules-unit-testing` and `vitest`.
The test runner will programmatically boot the Firestore emulator environment (or execute assertions), simulating these 12 threat scenarios to guarantee Zero-Trust compliance.

---

## 4. Backend Authorization Middleware

To supplement Firestore Security Rules, SahlBiz implements a defensive-in-depth architecture on the Node/Express backend. Authorization data supplied by the frontend is never trusted. Every API endpoint is isolated and validated through four sequential, reusable middleware layers:

### Conceptual Authorization Flow
```
  [Incoming API Request]
            ↓
    [authenticate()]        ← Decodes Firebase JWT; Extracts uid, email, orgId, and role claims.
            ↓
 [requireOrganization()]    ← Verifies that a non-empty tenant organization ID mapping exists.
            ↓
    [requireRole()]         ← Enforces whitelist constraints for critical operational roles.
            ↓
  [requirePermission()]     ← Validates request claims against the strict RBAC permission matrix.
            ↓
  [Business Operation]      ← Executes requested task inside an isolated transactional workspace.
```

### Middleware Specifications
1. **`authenticate()`**: Performs cryptographic validation checks on the Firebase ID token retrieved from the `Authorization: Bearer <token>` header, populating the request context `req.user` securely.
2. **`requireOrganization()`**: Refuses requests that lack an authoritative organization identifier (`orgId`), completely separating business workspaces.
3. **`requireRole(allowedRoles)`**: Whitelists access dynamically for endpoint structures that require specific user labels.
4. **`requirePermission(permission)`**: Performs logical lookups in the `ROLE_PERMISSIONS` matrix (retrieved from `src/lib/rbac`) to match authorization requirements, ensuring complete client/backend permission alignment.

---

## 5. Modular Monolith Service Boundaries

SahlBiz implements a **Modular Monolith** backend architecture, grouping our 17 core business sub-domains into 8 logical, highly cohesive service boundaries. This limits cross-domain dependency issues, enforces clean schema separation, and prepares SahlBiz for a seamless future transition to microservices if required.

### Domain Service Mapping
1. **Auth Module (`server/modules/auth`)**
   * *Responsibilities*: User login credentials, custom claims generation, token mapping, self-registration, and administrative protection gates.
2. **Organizations Module (`server/modules/organizations`)**
   * *Responsibilities*: Multi-tenant business profiles, ICE/IF/RC registration, and licensing subscription/plan status tracking.
3. **CRM Module (`server/modules/crm`)**
   * *Responsibilities*: Customers directory, Kreddy balance ledger tracking, and outbound Communication records (WhatsApp, Email).
4. **Catalog Module (`server/modules/catalog`)**
   * *Responsibilities*: Products index, SKUs, inventory stock adjustments, and B2B supplier accounts.
5. **Billing Module (`server/modules/billing`)**
   * *Responsibilities*: Point-of-Sale sales records, legal B2B invoices (devis/factures/BL), and customer invoice payments.
6. **Finance Module (`server/modules/finance`)**
   * *Responsibilities*: Business expenses categorization, auto-journal entries (Moroccan Plan Comptable Classe 6), and audit trails.
7. **HR Module (`server/modules/hr`)**
   * *Responsibilities*: Employees registration, CNSS/AMO social security deductions, and income tax (IR) payroll calculation.
8. **AI Module (`server/modules/ai`)**
   * *Responsibilities*: "L'Mawoun" Conversational assistant, context-data retrieval, and automated receipt OCR scanner extraction.

---

## 6. Schema Validation & Business Constraints

SahlBiz implements a Zero-Trust data ingestion policy. No request payload (`req.body`, `req.query`, or `req.params`) is ever trusted directly. All operational inputs are parsed and sanitized through **Zod Schema Validation Middleware**, ensuring strict type checks, field constraints, and compliance with Moroccan business regulations.

### Validation Engine Lifecycle
```
     [API Request Received]
                ↓
    [Auth & Tenant Verification]   ← Checks authenticated identity and extracts tenant orgId.
                ↓
      [Zod Schema SafeParse]       ← Validates params, query, and body. Sanitizes extra fields.
                ↓
    [Business Constraints Check]   ← Evaluates custom logic (e.g. cash limits, SMIG floors).
                ↓
    [Handler Execution (Safe)]     ← Uses ONLY verified, sanitized, and typed parameters.
```

### Key Business Constraints Programmatically Checked on Server
1. **Fiscal Deductibility (Finance)**: Cash-based expenses are legally limited under Moroccan Tax Law. SahlBiz programmatically blocks any cash expense exceeding **5,000 MAD TTC**, prompting the user to select check or bank transfer.
2. **SMIG Compliance (HR)**: Base salaries for employees are checked against the Moroccan legal SMIG limit of **3,120 MAD per month**.
3. **Credit Limit Protection (CRM)**: Initial customer credit account balances (Kreddy) are checked to ensure they do not exceed their assigned tenant-level Credit Limit.
4. **Margin Integrity (Catalog)**: Creating products with a selling price lower than the unit cost price is blocked to prevent accidental loss-making operations.
5. **Overpayment Prevention (Billing)**: Recorded payment amounts against an active invoice are validated to ensure they never exceed the remaining outstanding balance.

---

## 7. Idempotency Protection System

Moroccan retail and commercial spaces (such as traditional wholesale markets or souks) frequently suffer from unstable internet connectivity. To prevent dual-billing, duplicated stock deductions, or erroneous ledger entries when PWA clients retry failed requests, SahlBiz enforces **Idempotency Protection** on all core side-effecting operations.

### Deterministic Key Formula
SahlBiz calculates a unique, highly specific transaction hash derived from client-provided headers or body values:
$$\text{Idempotency Key} = \text{organizationId} + \text{deviceId} + \text{localTransactionId}$$

*   **`organizationId`**: Automatically extracted from the secure authenticated JWT session context.
*   **`deviceId`**: Identifies the unique client terminal (PWA, mobile, or register). Provided via `X-Device-ID` header or request body.
*   **`localTransactionId`**: A client-generated GUID assigned at the instant of transaction staging. Provided via `X-Local-Transaction-ID` header or request body.

### Protected API Enclaves
Idempotency decorators are integrated across all 8 critical operational gateways:
1.  **POS Sales** (`POST /api/billing/sales`): Prevents duplicate cash register transactions.
2.  **Payments** (`POST /api/billing/payments`): Enforces once-and-only-once payment registration against open invoices.
3.  **Invoice Creation** (`POST /api/billing/invoices`): Disallows generating duplicate document receipts.
4.  **Stock Movements** (`POST /api/catalog/inventory/adjust`): Guarantees inventory counts remain accurate under retries.
5.  **Expense Creation** (`POST /api/finance/expenses`): Safeguards corporate accounts from duplicated charge postings.
6.  **Purchase Receiving** (`POST /api/catalog/purchases/receive`): Blocks recording incoming supplier products twice.
7.  **Accounting Entries** (`POST /api/finance/journal`): Eliminates duplicate debit/credit journal ledger adjustments.
8.  **Offline Synchronization** (`POST /api/sync`): Ensures multi-packet offline sync streams do not write redundant sales or updates.

### Cache Lookup Lifecycle
```
 [Client Post Request]
          ↓
  [Extract Headers]        ← X-Device-ID & X-Local-Transaction-ID
          ↓
   [Verify Cache]          ← Is 'idem:orgId:deviceId:localTxId' registered?
    ├── YES ───────────────→ [Return Cached 2xx/4xx Response] (Instant, no DB write)
    └── NO
         ↓
  [Execute Business Logic]
          ↓
   [Capture Response]
          ↓
   [Commit to Cache]       ← Stores statusCode and responseBody (TTL: 24h)
          ↓
  [Dispatch to Client]
```


