import { describe, it, expect } from 'vitest';
import {
  STANDARD_PCGM_ACCOUNTS,
  STANDARD_PCGM_JOURNALS,
  validateJournalEntryBalance,
  generateSaleJournalEntry,
  generatePurchaseJournalEntry,
  generateExpenseJournalEntry,
  generateCustomerPaymentJournalEntry,
  generatePayrollJournalEntry,
  generateCreditNoteJournalEntry,
  generateGeneralLedger,
  generateBalanceGeneraleReport,
  generateCpcReport,
  generateVatDeclarationReport
} from '../domain/accountingEngine';
import { generateJournalEntriesCsv } from '../lib/accountantExport';
import { Account, Expense } from '../types';

describe('Double-Entry Accounting Engine (PCGM Maroc)', () => {
  const orgId = 'org_test_123';
  const postedBy = 'admin@sahlbiz.ma';

  it('should validate that balanced entries pass and unbalanced fail', () => {
    const balancedLines = [
      {
        id: '1',
        accountId: 'acc-34210000',
        accountCode: '34210000',
        accountName: 'Clients',
        debit: 1200,
        credit: 0
      },
      {
        id: '2',
        accountId: 'acc-71110000',
        accountCode: '71110000',
        accountName: 'Ventes',
        debit: 0,
        credit: 1000
      },
      {
        id: '3',
        accountId: 'acc-44550000',
        accountCode: '44550000',
        accountName: 'TVA Facturée',
        debit: 0,
        credit: 200
      }
    ];

    const result = validateJournalEntryBalance(balancedLines);
    expect(result.isBalanced).toBe(true);
    expect(result.totalDebit).toBe(1200);
    expect(result.totalCredit).toBe(1200);
    expect(result.difference).toBe(0);

    const unbalancedLines = [
      {
        id: '1',
        accountId: 'acc-34210000',
        accountCode: '34210000',
        accountName: 'Clients',
        debit: 1200,
        credit: 0
      },
      {
        id: '2',
        accountId: 'acc-71110000',
        accountCode: '71110000',
        accountName: 'Ventes',
        debit: 0,
        credit: 1000
      }
    ];

    const unbResult = validateJournalEntryBalance(unbalancedLines);
    expect(unbResult.isBalanced).toBe(false);
    expect(unbResult.difference).toBe(200);
  });

  it('should generate a strictly balanced Sale journal entry (VE)', () => {
    const saleEntry = generateSaleJournalEntry({
      docNumber: 'FAC-2026-001',
      docId: 'doc_1',
      date: '2026-08-14',
      subtotalHt: 1000,
      totalTva: 200,
      totalTtc: 1200,
      paymentMethod: 'cash',
      droitDeTimbre: 3,
      customerName: 'Client Alpha SARL',
      orgId,
      postedBy
    });

    expect(saleEntry.isBalanced).toBe(true);
    expect(saleEntry.totalDebit).toBe(1203);
    expect(saleEntry.totalCredit).toBe(1203);
    expect(saleEntry.journalCode).toBe('VE');
    expect(saleEntry.lines.length).toBe(4); // Caisse, Ventes, TVA Facturée, Droit de Timbre
  });

  it('should generate a strictly balanced Purchase journal entry (AC)', () => {
    const purchaseEntry = generatePurchaseJournalEntry({
      purchaseId: 'purch_1',
      purchaseNumber: 'BC-2026-045',
      date: '2026-08-14',
      amountHt: 5000,
      tvaAmount: 1000,
      amountTtc: 6000,
      tvaRate: 20,
      supplierName: 'Fournisseur Central SARL',
      paymentMethod: 'kreddy',
      orgId,
      postedBy
    });

    expect(purchaseEntry.isBalanced).toBe(true);
    expect(purchaseEntry.totalDebit).toBe(6000);
    expect(purchaseEntry.totalCredit).toBe(6000);
    expect(purchaseEntry.journalCode).toBe('AC');
  });

  it('should generate a strictly balanced Credit Note (Avoir Client) entry', () => {
    const avoirEntry = generateCreditNoteJournalEntry({
      creditNoteNumber: 'AVO-2026-0001',
      creditNoteId: 'cn_1',
      invoiceNumber: 'FAC-2026-001',
      date: '2026-08-15',
      amountHt: 500,
      tvaAmount: 100,
      amountTtc: 600,
      customerName: 'Client Alpha SARL',
      reason: 'Retour marchandise défectueuse',
      orgId,
      postedBy
    });

    expect(avoirEntry.isBalanced).toBe(true);
    expect(avoirEntry.totalDebit).toBe(600);
    expect(avoirEntry.totalCredit).toBe(600);
    expect(avoirEntry.journalCode).toBe('VE');
  });

  it('should generate a strictly balanced Expense journal entry', () => {
    const expense: Expense = {
      id: 'exp_rent_1',
      title: 'Loyer Magasin Août 2026',
      amountHt: 4000,
      tvaRate: 20,
      tvaAmount: 800,
      amountTtc: 4800,
      category: 'loyer',
      date: '2026-08-01',
      vendorName: 'Bailleur Commercial',
      paymentMethod: 'transfer'
    };

    const expEntry = generateExpenseJournalEntry({
      expense,
      orgId,
      postedBy
    });

    expect(expEntry.isBalanced).toBe(true);
    expect(expEntry.totalDebit).toBe(4800);
    expect(expEntry.totalCredit).toBe(4800);
  });

  it('should generate a strictly balanced Customer Payment journal entry', () => {
    const paymentEntry = generateCustomerPaymentJournalEntry({
      paymentId: 'pay_001',
      customerId: 'cust_1',
      customerName: 'Karim Bennani',
      amount: 500,
      date: '2026-08-14',
      paymentMethod: 'cash',
      orgId,
      postedBy
    });

    expect(paymentEntry.isBalanced).toBe(true);
    expect(paymentEntry.totalDebit).toBe(500);
    expect(paymentEntry.totalCredit).toBe(500);
  });

  it('should generate a strictly balanced Payroll journal entry (Fiche de Paie)', () => {
    const payrollEntry = generatePayrollJournalEntry({
      payslipId: 'ps_001',
      employeeId: 'emp_1',
      employeeName: 'Mohamed Tazi',
      month: '2026-08',
      date: '2026-08-31',
      baseSalary: 6000,
      cnssEmployee: 268.80,
      amoEmployee: 135.60,
      igrAmount: 231.90,
      netSalary: 5363.70,
      cnssEmployer: 1206.00,
      amoEmployer: 246.60,
      orgId,
      postedBy
    });

    expect(payrollEntry.isBalanced).toBe(true);
    expect(payrollEntry.totalDebit).toBe(payrollEntry.totalCredit);
  });

  it('should produce balanced Trial Balance (Balance Générale) and CPC reports', () => {
    const accounts: Account[] = STANDARD_PCGM_ACCOUNTS.map((a, i) => ({
      ...a,
      id: `acc-${a.code}`,
      orgId
    }));

    const saleEntry = generateSaleJournalEntry({
      docNumber: 'FAC-001',
      docId: 'doc_1',
      date: '2026-08-14',
      subtotalHt: 1000,
      totalTva: 200,
      totalTtc: 1200,
      paymentMethod: 'cash',
      customerName: 'Client 1',
      orgId,
      postedBy
    });

    const expEntry = generateExpenseJournalEntry({
      expense: {
        id: 'exp_1',
        title: 'Électricité',
        amountHt: 200,
        tvaRate: 20,
        tvaAmount: 40,
        amountTtc: 240,
        category: 'electricite',
        date: '2026-08-14',
        vendorName: 'Lydec / Redal',
        paymentMethod: 'cash'
      },
      orgId,
      postedBy
    });

    const balance = generateBalanceGeneraleReport(accounts, [saleEntry, expEntry]);
    expect(balance.isBalanced).toBe(true);
    expect(balance.totalDebitMouvements).toBe(balance.totalCreditMouvements);

    const cpc = generateCpcReport(accounts, [saleEntry, expEntry]);
    expect(cpc.totalProduitsExploitation).toBe(1000);
    expect(cpc.totalChargesExploitation).toBe(200);
    expect(cpc.resultatExploitation).toBe(800);

    const vatReport = generateVatDeclarationReport([saleEntry, expEntry]);
    expect(vatReport.tvaFacturee).toBe(200);
    expect(vatReport.tvaDeductibleCharges).toBe(40);
    expect(vatReport.tvaDue).toBe(160);
  });

  it('should format Sage PNM and Standard PCGM CSV exports accurately', () => {
    const accounts: Account[] = STANDARD_PCGM_ACCOUNTS.map(a => ({
      ...a,
      id: `acc-${a.code}`,
      orgId
    }));

    const saleEntry = generateSaleJournalEntry({
      docNumber: 'FAC-001',
      docId: 'doc_1',
      date: '2026-08-14',
      subtotalHt: 1000,
      totalTva: 200,
      totalTtc: 1200,
      paymentMethod: 'cash',
      customerName: 'Client Test',
      orgId,
      postedBy
    });

    const sagePnm = generateJournalEntriesCsv([saleEntry], accounts, 'Test Org', 'sage');
    expect(sagePnm).toContain('VE');
    expect(sagePnm).toContain('71110000');
    expect(sagePnm).toContain('44550000');

    const standardCsv = generateJournalEntriesCsv([saleEntry], accounts, 'Test Org', 'standard');
    expect(standardCsv).toContain('N_Compte_PCGM');
    expect(standardCsv).toContain('Debit_MAD');
  });
});

