# SahlBiz (سهل بيز) 🇲🇦

**Moroccan-First Business Operating System for Small & Medium Enterprises (TPMEs)**

SahlBiz is an auditable, multi-tenant, cloud-native enterprise resource planning (ERP) and point-of-sale (POS) operating system tailored specifically to the operational, fiscal, and regulatory realities of Moroccan commerce.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Business Modules](#-key-business-modules)
  - [1. Point of Sale & Cash Register (Caisse)](#1-point-of-sale--cash-register-caisse)
  - [2. Kreddy (Customer Credit) Ledger](#2-kreddy-customer-credit-ledger)
  - [3. Product & Inventory Ledger](#3-product--inventory-ledger)
  - [4. Commercial Documents & Invoicing](#4-commercial-documents--invoicing)
  - [5. Moroccan Accounting & Fiscal Exports](#5-moroccan-accounting--fiscal-exports)
  - [6. HR & Moroccan Payroll (Paie & CNSS)](#6-hr--moroccan-payroll-paie--cnss)
  - [7. Purchases, Expenses & AI Receipt OCR](#7-purchases-expenses--ai-receipt-ocr)
  - [8. L'Mawoun (الماعون) — AI Business Assistant](#8-lmawoun-الماعون--ai-business-assistant)
  - [9. Cryptographic Audit Trail & Security](#9-cryptographic-audit-trail--security)
- [System Architecture](#-system-architecture)
  - [Full-Stack Architecture](#full-stack-architecture)
  - [Multi-Tenancy & Zero-Trust Security Model](#multi-tenancy--zero-trust-security-model)
  - [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
- [Localization & Moroccan Fiscal Compliance](#-localization--moroccan-fiscal-compliance)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Available Scripts](#available-scripts)
  - [Environment Variables](#environment-variables)
- [Testing & Quality Assurance](#-testing--quality-assurance)

---

## 🌟 Overview

Moroccan merchants, retailers, wholesalers, and service businesses face unique operational challenges:
- High volume of customer credit (*L'Kreddy* / دفتر الكريدي) requiring strict tracking to prevent cashflow stagnation.
- Moroccan fiscal specifics: ICE (*Identifiant Commun de l'Entreprise*), IF (*Identifiant Fiscal*), RC (*Registre de Commerce*), Taxe Professionnelle (TP), and multi-rate TVA (0%, 7%, 10%, 14%, 20%).
- Realities of mixed connectivity requiring resilient offline execution and synchronization.
- Multi-lingual workforce requiring support for **Moroccan Darija (الدارجة)**, **French**, **Arabic (with native RTL)**, and **English**.

SahlBiz unifies these requirements into a cohesive, secure, and intuitive web application.

---

## 📦 Key Business Modules

### 1. Point of Sale & Cash Register (Caisse)
- **Fast POS Interface**: Touch-friendly checkout, barcode scanner support (`html5-qrcode`), search-by-name/SKU, and quick payment tender buttons.
- **Multi-Payment Tenders**: Support for Cash (*Espèces*), CMI Card (*Carte Bancaire*), Cheque (*Chèque*), Commercial Bill (*Traite*), Bank Transfer (*Virement*), and Kreddy (*Crédit Client*).
- **Cash Management Lifecycle**: Session opening with starting float, mid-shift cash-in/cash-out tracking, end-of-day Z-report reconciliation, and discrepancy audit.
- **Thermal Receipt Printing**: 80mm & 58mm POS receipt layout generation ready for ESC/POS thermal printers.

### 2. Kreddy (Customer Credit) Ledger
- **Immutable Credit Ledger**: Customer credit balances are strictly derived from chronological ledger transactions (`CreditLedgerEntry`), rather than relying on an untracked mutable balance field alone:
  $$\text{Opening Balance} + \text{Credit Sales} - \text{Payments} - \text{Returns} \pm \text{Adjustments} = \text{Current Balance}$$
- **Credit Limits & Availability**: Real-time enforcement of maximum credit ceilings and available balance calculation.
- **Overdue Tracking**: Automatic detection of overdue balances against scheduled payment terms.
- **Relevé de Compte (Statement of Account)**: Formatted, print-ready account statements with running cumulative balances.
- **1-Click WhatsApp Reminders**: Localized Darija, French, and Arabic WhatsApp reminders for gentle follow-ups, overdue payment notices, and monthly statements.

### 3. Product & Inventory Ledger
- **Ledger-Based Inventory Movements**: Every stock change is backed by an `InventoryMovement` record (purchases, sales, customer returns, supplier returns, physical inventory adjustments, and transfers).
- **Variant Support**: Multi-attribute SKUs (size, color, weight, volume) with individual barcodes and stock levels.
- **Low Stock Alerts**: Configurable stock thresholds and reorder triggers.

### 4. Commercial Documents & Invoicing
- **Document Types**: *Factures* (Invoices), *Bons de Livraison* (Delivery Notes / BL), *Devis* (Quotes), and *Bons de Commande* (Purchase Orders).
- **Fiscal Compliance**: Built-in mandatory legal mentions for Morocco (ICE, IF, RC, TP, CNSS, Capital Social, and VAT breakdown tables).
- **Document Transformation**: 1-click conversion from Quote to Delivery Note to Final Invoice.
- **Status Workflows**: Draft $\rightarrow$ Sent $\rightarrow$ Partial $\rightarrow$ Paid $\rightarrow$ Cancelled / Credit Note.

### 5. Moroccan Accounting & Fiscal Exports
- **Plan Comptable Général Marocain (PCGM)**: Standard classes 1 through 7 chart of accounts.
- **Double-Entry Invariant**: Strict server-side invariant checking:
  $$\sum \text{Debits} \equiv \sum \text{Credits}$$
- **Financial Statements**: *Grand Livre* (General Ledger), *Balance Générale*, and *Compte de Produits et Charges (CPC)*.
- **FEC / EDI Export**: Standardized export formats for external Moroccan fiduciaries and accounting software (Sage, Ciel, Cegid).

### 6. HR & Moroccan Payroll (Paie & CNSS)
- **Moroccan Statutory Deductions**:
  - CNSS (*Caisse Nationale de Sécurité Sociale*) employee and employer share with statutory ceiling calculations.
  - AMO (*Assurance Maladie Obligatoire*).
  - Moroccan IGR (*Impôt sur le Revenu*) progressive bracket computation.
  - CIMR retirement contributions and professional fee allowances.
- **Time & Attendance**: Daily check-in/check-out tracking and overtime calculations.
- **Fiches de Paie**: Print-ready Moroccan standard monthly payslips.

### 7. Purchases, Expenses & AI Receipt OCR
- **Expense Categorization**: Moroccan accounting expense classifications (Rent, Salaries, Raw Materials, Transport, Electricity, Taxes, Maintenance).
- **Multi-Rate TVA Accounting**: Split tracking of deductible input VAT (TVA récupérable) across 20%, 14%, 10%, 7%, and exempt.
- **Gemini Receipt OCR**: Instant scanning of paper receipts via device camera or file upload, automatically parsing vendor ICE, date, HT, TVA rate, and TTC totals.

### 8. L'Mawoun (الماعون) — AI Business Assistant
- **Trilingual Moroccan AI**: Communicates naturally in Moroccan Darija (Arabic script or Arabizi), French, Standard Arabic, and English.
- **Business Intelligence**: Instant insights into daily takings, top debts, low-stock warnings, and cash status.
- **Safe Action Execution**: Suggests actionable shortcuts (e.g. sending a WhatsApp reminder or creating a purchase order) with mandatory user confirmation for sensitive mutations.
- **High-Resiliency Fallback**: Built-in graceful degradation ensuring seamless operation even under API rate limits or offline states.

### 9. Cryptographic Audit Trail & Security
- **Tamper-Evident Event Log**: Critical business events (sales, adjustments, voids, logins) are cryptographically hashed and chained to prevent retrospective tampering.
- **Real-Time Verification**: Instant verification interface to detect any log tampering or unauthorized data manipulation.

---

## 🏗️ System Architecture

### Full-Stack Architecture
```
┌──────────────────────────────────────────────────────────┐
│                   React 19 + Vite SPA                    │
│   (Tailwind CSS 4, Motion Animations, Recharts, Lucide)   │
└────────────────────────────┬─────────────────────────────┘
                             │ HTTPS / REST (JSON)
┌────────────────────────────▼─────────────────────────────┐
│                   Express API Server                     │
│   • Multi-Tenant Isolation & Authentication Middleware   │
│   • Granular RBAC Permission Evaluation                  │
│   • Idempotency Middleware for Financial Mutations       │
│   • Google Gemini 2.5/3.5 Generative AI SDK              │
│   • Zero-Trust Input Validation (Zod)                    │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────┐
│                 Firebase Cloud Firestore                 │
│   • Tenant-Scoped Subcollections (/organizations/{id}/…) │
│   • Zero-Trust CEL Security Rules (Pillars 1–7)          │
│   • Real-Time Offline Cache & Synchronization            │
└──────────────────────────────────────────────────────────┘
```

### Multi-Tenancy & Zero-Trust Security Model
Every piece of tenant data lives under the tenant's isolated root path:
`/organizations/{orgId}/[customers|products|inventoryMovements|documents|expenses|creditLedger|cashRegisters|cashSessions|...]`

Security rules enforce:
1. **Default-Deny**: All paths reject access unless explicitly matched by rules.
2. **Tenant Membership**: Verification that `request.auth.uid` belongs to `orgId`.
3. **Cross-Tenant Prevention**: Users cannot read, write, or query documents belonging to other organizations.
4. **Data Validation**: Strict schema, bounds, and string sanitization inside Firestore Security Rules.

### Role-Based Access Control (RBAC)

| Role | Description |
| :--- | :--- |
| **Owner** | Full administrative, financial, and organizational control. |
| **Admin** | Complete operational access across all modules. |
| **Manager** | Day-to-day operations, approvals, catalog and customer management. |
| **Accountant** | Financial reporting, fiscal documents, accounting entries, and tax exports. |
| **Cashier** | POS sales, cash registers, receipt generation, and payment recording. |
| **Inventory Manager** | Stock movements, receiving, adjustments, and variant tracking. |
| **Salesperson** | Customer creation, quoting, and order drafting. |
| **Viewer** | Read-only access to selected operational modules. |

---

## 🌐 Localization & Moroccan Fiscal Compliance

- **4 First-Class Languages**: French (`fr`), Moroccan Darija (`dr`), Standard Arabic (`ar`), and English (`en`).
- **First-Class RTL (Right-to-Left)**: Bidirectional layouts adapting dynamically when Arabic or Darija script is active.
- **Currency & Number Formatting**: Moroccan Dirham (`MAD` / `د.م.`) formatted with proper regional decimal and thousand separators.
- **Fiscal Identifiers**: Dedicated fields and validation for ICE (15 digits), IF, RC, CNSS, and Taxe Professionnelle.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/sahlbiz.git
   cd sahlbiz
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and provide your configuration:
   ```bash
   cp .env.example .env
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:3000`.

---

### Available Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| **Development** | `npm run dev` | Starts the Express server and Vite development middleware on port 3000. |
| **Type Check & Lint** | `npm run lint` | Runs TypeScript compiler (`tsc --noEmit`) to validate type safety. |
| **Build Production** | `npm run build` | Compiles client assets (`vite build`) and bundles server (`esbuild server.ts`). |
| **Start Production** | `npm start` | Runs the compiled CommonJS server (`node dist/server.cjs`). |
| **Preview** | `npm run preview` | Previews the static production build. |

---

### Environment Variables

| Variable | Description |
| :--- | :--- |
| `PORT` | Web server port (Default: `3000`). |
| `NODE_ENV` | Environment mode (`development` or `production`). |
| `GEMINI_API_KEY` | Google Gemini API key for AI Assistant and Receipt OCR features. |
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key for client authentication. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain. |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID. |
| `VITE_FIREBASE_STORAGE_BUCKET`| Firebase Storage Bucket. |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging Sender ID. |
| `VITE_FIREBASE_APP_ID` | Firebase Web App ID. |

---

## 🧪 Testing & Quality Assurance

SahlBiz maintains rigorous automated testing covering security and business invariants:

- **Type Safety**: Full strict-mode TypeScript compilation across frontend and backend.
- **Firestore Security Rules Testing**: Automated rule unit test suite (`src/__tests__/firestore.rules.test.ts`) validating cross-tenant isolation and unauthorized operation prevention.
- **Idempotency Protection**: Middleware preventing duplicate payment and POS sales submissions.

To run verification:
```bash
npm run lint
npm run build
```

---

## 📄 License

Proprietary — All rights reserved © SahlBiz Morocco.
