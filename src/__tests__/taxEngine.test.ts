import { describe, it, expect } from 'vitest';
import { TaxEngine, MOROCCAN_FISCAL_RULES } from '../domain/taxEngine';
import {
  calculateTva,
  calculateDroitDeTimbre,
  detectCashLegalThreshold,
  recalculateDocumentTotals,
  validateIce
} from '../lib/moroccanTax';

describe('Moroccan Tax Engine (Moteur Fiscal Marocain - CGI)', () => {
  describe('1. Standard VAT Rates & Basic Calculations', () => {
    it('calculates standard 20% VAT on tax-exclusive (HT) amounts', () => {
      const result = TaxEngine.calculate({
        taxDate: '2026-05-15',
        transactionType: 'sale_b2b',
        productCategory: 'standard',
        amount: 1000,
        isTaxInclusive: false,
        paymentMethod: 'transfer'
      });

      expect(result.tvaRate).toBe(20);
      expect(result.amountHt).toBe(1000);
      expect(result.tvaAmount).toBe(200);
      expect(result.rawTtc).toBe(1200);
      expect(result.droitDeTimbre).toBe(0);
      expect(result.totalTtc).toBe(1200);
      expect(result.pcgmVatAccount).toBe('44550000');
    });

    it('calculates 14% VAT (Passenger Transport)', () => {
      const result = TaxEngine.calculate({
        taxDate: '2026-06-01',
        transactionType: 'sale_b2b',
        productCategory: 'transport_passenger_freight',
        amount: 500,
        isTaxInclusive: false
      });

      expect(result.tvaRate).toBe(14);
      expect(result.amountHt).toBe(500);
      expect(result.tvaAmount).toBe(70);
      expect(result.totalTtc).toBe(570);
    });

    it('calculates 10% VAT (Hospitality & Restaurant)', () => {
      const result = TaxEngine.calculate({
        taxDate: '2026-06-01',
        transactionType: 'pos_sale',
        productCategory: 'hospitality_restaurant',
        amount: 250,
        isTaxInclusive: false
      });

      expect(result.tvaRate).toBe(10);
      expect(result.amountHt).toBe(250);
      expect(result.tvaAmount).toBe(25);
      expect(result.rawTtc).toBe(275);
    });

    it('calculates 7% VAT (Drinking water)', () => {
      const result = TaxEngine.calculate({
        taxDate: '2026-06-01',
        transactionType: 'sale_b2b',
        productCategory: 'water_drinking',
        amount: 100,
        isTaxInclusive: false
      });

      expect(result.tvaRate).toBe(7);
      expect(result.amountHt).toBe(100);
      expect(result.tvaAmount).toBe(7);
      expect(result.totalTtc).toBe(107);
    });
  });

  describe('2. Tax-Inclusive (TTC) vs Tax-Exclusive (HT) Deconstruction', () => {
    it('correctly deconstructs tax-inclusive price into Base HT and VAT at 20%', () => {
      // 1200 MAD TTC at 20% should give 1000 MAD HT and 200 MAD TVA
      const result = TaxEngine.calculate({
        taxDate: '2026-08-01',
        transactionType: 'sale_b2c',
        productCategory: 'standard',
        amount: 1200,
        isTaxInclusive: true
      });

      expect(result.tvaRate).toBe(20);
      expect(result.amountHt).toBe(1000);
      expect(result.tvaAmount).toBe(200);
      expect(result.rawTtc).toBe(1200);
    });

    it('correctly deconstructs tax-inclusive price with fractional values and half-up rounding', () => {
      // 150 MAD TTC at 20%: 150 / 1.2 = 125 HT, 25 TVA
      const result = TaxEngine.calculate({
        taxDate: '2026-08-01',
        transactionType: 'pos_sale',
        amount: 150,
        isTaxInclusive: true
      });

      expect(result.amountHt).toBe(125);
      expect(result.tvaAmount).toBe(25);
      expect(result.totalTtc).toBe(150);
    });
  });

  describe('3. Versioned Fiscal Laws & Historical Immutability', () => {
    it('applies historical Pre-2024 rates for electricity (14%) for dates in 2023', () => {
      const result2023 = TaxEngine.calculate({
        taxDate: '2023-11-20',
        transactionType: 'purchase_services',
        productCategory: 'electricity_low_voltage',
        amount: 1000
      });

      expect(result2023.fiscalYear).toBe(2023);
      expect(result2023.ruleVersion).toBe('LF-PRE-2024');
      expect(result2023.tvaRate).toBe(14);
      expect(result2023.tvaAmount).toBe(140);
    });

    it('applies LF 2024 transitional rate for electricity (16%) for dates in 2024', () => {
      const result2024 = TaxEngine.calculate({
        taxDate: '2024-04-10',
        transactionType: 'purchase_services',
        productCategory: 'electricity_low_voltage',
        amount: 1000
      });

      expect(result2024.fiscalYear).toBe(2024);
      expect(result2024.ruleVersion).toBe('LF-2024');
      expect(result2024.tvaRate).toBe(16);
      expect(result2024.tvaAmount).toBe(160);
    });

    it('applies LF 2025 transitional rate for electricity (18%) for dates in 2025', () => {
      const result2025 = TaxEngine.calculate({
        taxDate: '2025-07-22',
        transactionType: 'purchase_services',
        productCategory: 'electricity_low_voltage',
        amount: 1000
      });

      expect(result2025.fiscalYear).toBe(2025);
      expect(result2025.ruleVersion).toBe('LF-2025');
      expect(result2025.tvaRate).toBe(18);
      expect(result2025.tvaAmount).toBe(180);
    });

    it('applies LF 2026 converged rate for electricity (20%) for dates in 2026+', () => {
      const result2026 = TaxEngine.calculate({
        taxDate: '2026-08-14',
        transactionType: 'purchase_services',
        productCategory: 'electricity_low_voltage',
        amount: 1000
      });

      expect(result2026.fiscalYear).toBe(2026);
      expect(result2026.ruleVersion).toBe('LF-2026');
      expect(result2026.tvaRate).toBe(20);
      expect(result2026.tvaAmount).toBe(200);
    });

    it('guarantees that calculating historical transactions never mutates past figures', () => {
      const histInvoice = TaxEngine.calculate({
        taxDate: '2022-03-01',
        transactionType: 'purchase_goods',
        productCategory: 'pharmaceutical',
        amount: 1000
      });
      // In 2022 pharmaceuticals had 7% VAT
      expect(histInvoice.tvaRate).toBe(7);
      expect(histInvoice.tvaAmount).toBe(70);

      const modernInvoice = TaxEngine.calculate({
        taxDate: '2026-01-15',
        transactionType: 'purchase_goods',
        productCategory: 'pharmaceutical',
        amount: 1000
      });
      // In 2026 pharmaceuticals are 0% (zero-rated with deduction right Art. 92)
      expect(modernInvoice.tvaRate).toBe(0);
      expect(modernInvoice.isZeroRated).toBe(true);
      expect(modernInvoice.deductionRight).toBe('with_deduction');
    });
  });

  describe('4. Exemptions & Zero-Rated Operations (CGI Art. 91 & 92)', () => {
    it('applies zero-rated export status with deduction right (Art. 92)', () => {
      const result = TaxEngine.calculate({
        taxDate: '2026-08-14',
        transactionType: 'export',
        amount: 50000,
        customerType: 'foreign'
      });

      expect(result.tvaRate).toBe(0);
      expect(result.isZeroRated).toBe(true);
      expect(result.isExempt).toBe(true);
      expect(result.deductionRight).toBe('with_deduction');
      expect(result.exemptionArticle).toContain('Art. 92');
      expect(result.totalTtc).toBe(50000);
    });

    it('applies basic food exemption without deduction right (Art. 91-I-A)', () => {
      const result = TaxEngine.calculate({
        taxDate: '2026-08-14',
        transactionType: 'sale_b2c',
        productCategory: 'basic_food',
        amount: 120
      });

      expect(result.tvaRate).toBe(0);
      expect(result.isExempt).toBe(true);
      expect(result.deductionRight).toBe('without_deduction');
      expect(result.exemptionArticle).toContain('Art. 91');
      expect(result.totalTtc).toBe(120);
    });

    it('handles certified customer tax exemption (e.g. diplomatic / agreement)', () => {
      const result = TaxEngine.calculate({
        taxDate: '2026-08-14',
        transactionType: 'sale_b2b',
        customerType: 'diplomatic',
        isExempt: true,
        exemptionCertificateId: 'DIPL-2026-991',
        amount: 8000
      });

      expect(result.tvaRate).toBe(0);
      expect(result.isExempt).toBe(true);
      expect(result.totalTtc).toBe(8000);
    });
  });

  describe('5. Stamp Duty (Droit de Timbre - CGI Art. 193/198)', () => {
    it('applies 0.25% stamp duty on cash payments', () => {
      const result = TaxEngine.calculate({
        taxDate: '2026-08-14',
        transactionType: 'sale_b2c',
        amount: 1000, // 1000 HT -> 1200 TTC
        paymentMethod: 'cash'
      });

      expect(result.rawTtc).toBe(1200);
      expect(result.droitDeTimbre).toBe(3); // 1200 * 0.0025 = 3.00 MAD
      expect(result.totalTtc).toBe(1203);
      expect(result.pcgmStampAccount).toBe('44521000');
    });

    it('does NOT apply stamp duty on non-cash payments (bank transfer, card, check)', () => {
      const result = TaxEngine.calculate({
        taxDate: '2026-08-14',
        transactionType: 'sale_b2b',
        amount: 1000,
        paymentMethod: 'transfer'
      });

      expect(result.rawTtc).toBe(1200);
      expect(result.droitDeTimbre).toBe(0);
      expect(result.totalTtc).toBe(1200);
    });

    it('generates regulatory warning when cash transaction exceeds 10,000 MAD legal threshold', () => {
      const result = TaxEngine.calculate({
        taxDate: '2026-08-14',
        transactionType: 'pos_sale',
        amount: 10000, // 10,000 HT -> 12,000 TTC > 10,000 MAD
        paymentMethod: 'cash'
      });

      expect(result.isOverCashLegalThreshold).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('CGI Art. 193/198');
      expect(result.droitDeTimbre).toBe(30); // 12000 * 0.0025 = 30.00 MAD
    });
  });

  describe('6. Returns, Credit Notes & Adjustments', () => {
    it('calculates balanced credit note tax reversal referencing original invoice', () => {
      const creditNote = TaxEngine.calculateCreditNote({
        creditNoteAmount: 600,
        tvaRate: 20,
        isTaxInclusive: true,
        taxDate: '2026-08-14',
        originalInvoiceId: 'INV-2026-0042',
        reason: 'Marchandise défectueuse retournée'
      });

      expect(creditNote.transactionType).toBe('credit_note');
      expect(creditNote.amountHt).toBe(500);
      expect(creditNote.tvaAmount).toBe(100);
      expect(creditNote.totalTtc).toBe(600);
      expect(creditNote.droitDeTimbre).toBe(0); // Credit note has no cash stamp duty
      expect(creditNote.reversalOf?.originalInvoiceId).toBe('INV-2026-0042');
      expect(creditNote.reversalOf?.taxCorrection).toBe(100);
    });

    it('calculates Moroccan VAT Prorata under CGI Art. 104', () => {
      const prorata = TaxEngine.calculateVatProrata({
        fiscalYear: 2026,
        turnoverTaxableWithDeduction: 800000,
        turnoverZeroRatedExport: 200000,
        turnoverExemptWithoutDeduction: 250000
      });

      // Numerator: 800,000 + 200,000 = 1,000,000
      // Denominator: 1,000,000 + 250,000 = 1,250,000
      // Prorata = (1,000,000 / 1,250,000) * 100 = 80.00%
      expect(prorata.prorataPercentage).toBe(80);
      expect(prorata.totalTurnover).toBe(1250000);
      expect(prorata.formulaDescription).toContain('CGI Art. 104');
    });

    it('calculates 5-year equipment VAT regularization under CGI Art. 102', () => {
      const adj = TaxEngine.calculateTaxAdjustment({
        assetDescription: 'Machine industrielle',
        acquisitionDate: '2024-01-10',
        disposalOrAdjustmentDate: '2026-06-15',
        initialTvaAmount: 50000,
        adjustmentType: 'early_disposal_5yr'
      });

      // Acquired 2024, disposed 2026 -> 3 years elapsed (2024, 2025, 2026), 2 years remaining (2/5)
      // Reverse deduction: (50000 / 5) * 2 = 20000 MAD payable to Treasury
      expect(adj.yearsElapsed).toBe(3);
      expect(adj.yearsRemaining).toBe(2);
      expect(adj.regularizationFraction).toBe('2/5');
      expect(adj.taxPayableToState).toBe(20000);
      expect(adj.netAdjustment).toBe(-20000);
    });
  });

  describe('7. Multi-Item Document Totals & Rate Breakdown', () => {
    it('calculates multi-rate document totals and distinct rate breakdown', () => {
      const docResult = TaxEngine.calculateDocumentTotals(
        [
          { quantity: 2, unitPrice: 1000, tvaRate: 20, isTaxInclusive: false }, // 2000 HT -> 400 TVA
          { quantity: 1, unitPrice: 500, tvaRate: 10, isTaxInclusive: false },  // 500 HT -> 50 TVA
          { quantity: 10, unitPrice: 20, tvaRate: 0, isExempt: true }           // 200 HT -> 0 TVA
        ],
        {
          paymentMethod: 'cash',
          paidAmount: 1000
        }
      );

      expect(docResult.subtotalHt).toBe(2700);
      expect(docResult.totalTva).toBe(450);
      // Raw TTC = 3150. Droit de timbre (0.25% of 3150) = 7.88 MAD
      expect(docResult.droitDeTimbre).toBe(7.88);
      expect(docResult.totalTtc).toBe(3157.88);
      expect(docResult.remainingAmount).toBe(2157.88);
      expect(docResult.rateBreakdown.length).toBe(3);
    });
  });

  describe('8. Backward Compatibility Wrapper in moroccanTax.ts', () => {
    it('supports calculateTva helper', () => {
      const res = calculateTva(1000, 20);
      expect(res.tvaAmount).toBe(200);
      expect(res.amountTtc).toBe(1200);
    });

    it('supports calculateDroitDeTimbre helper', () => {
      expect(calculateDroitDeTimbre(1000, 'cash')).toBe(2.5);
      expect(calculateDroitDeTimbre(1000, 'transfer')).toBe(0);
    });

    it('supports detectCashLegalThreshold helper', () => {
      const under = detectCashLegalThreshold(5000, 'cash');
      expect(under.isOverThreshold).toBe(false);
      expect(under.droitDeTimbre).toBe(12.5);

      const over = detectCashLegalThreshold(15000, 'cash');
      expect(over.isOverThreshold).toBe(true);
      expect(over.warningMessage).toContain('10.000 MAD');
    });

    it('supports recalculateDocumentTotals helper', () => {
      const totals = recalculateDocumentTotals(
        [{ quantity: 1, unitPriceHt: 100, tvaRate: 20 }],
        'cash',
        0
      );
      expect(totals.subtotalHt).toBe(100);
      expect(totals.totalTva).toBe(20);
      expect(totals.droitDeTimbre).toBe(0.3); // 120 * 0.0025 = 0.3
      expect(totals.totalTtc).toBe(120.3);
    });

    it('validates 15-digit ICE', () => {
      expect(validateIce('123456789012345').valid).toBe(true);
      expect(validateIce('12345').valid).toBe(false);
      expect(validateIce('').valid).toBe(false);
    });
  });
});
