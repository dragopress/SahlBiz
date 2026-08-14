/**
 * SahlBiz - Moroccan Tax Engine (Moteur Fiscal Marocain - CGI)
 * 
 * Compliant with:
 * - Code Général des Impôts du Maroc (CGI) - Articles 89 à 125 (TVA), Articles 193/198 (Droit de timbre)
 * - Multiannual Tax Reform (Lois de Finances 2024, 2025, 2026)
 * - Historical Versioning & Immutability (Tax calculations never silently drift across fiscal years)
 * - Standard Moroccan Double-Entry Chart of Accounts (PCGM) integration
 */

import { PaymentMethod } from '../types';

// ============================================================================
// 1. DOMAIN TYPES & INTERFACES
// ============================================================================

export type MoroccanJurisdiction = 'MA' | 'Morocco' | string;

export type TaxTransactionType =
  | 'sale_b2b'
  | 'sale_b2c'
  | 'pos_sale'
  | 'export'
  | 'purchase_goods'
  | 'purchase_services'
  | 'purchase_capital_assets'
  | 'expense'
  | 'credit_note'
  | 'debit_note'
  | 'return'
  | 'import'
  | 'adjustment';

export type TaxCustomerType =
  | 'business'
  | 'individual'
  | 'exempt_organization'
  | 'foreign'
  | 'diplomatic'
  | 'public_sector';

export type MoroccanProductCategory =
  | 'standard'
  | 'general_goods'
  | 'electricity_low_voltage'
  | 'electricity_medium_high'
  | 'water_drinking'
  | 'sanitation_services'
  | 'pharmaceutical'
  | 'school_supplies'
  | 'basic_food'
  | 'refined_sugar'
  | 'canned_sardines'
  | 'soap_household'
  | 'school_transport'
  | 'hospitality_restaurant'
  | 'banking_financial'
  | 'transport_passenger_freight'
  | 'solar_energy_renewable'
  | 'petroleum_refined'
  | 'telecom'
  | 'capital_assets'
  | 'custom'
  | string;

export type DeductionRight = 'with_deduction' | 'without_deduction' | 'prorata' | 'none';

export interface TaxCalculationParams {
  jurisdiction?: MoroccanJurisdiction;
  taxDate: string | Date;
  transactionType: TaxTransactionType;
  customerType?: TaxCustomerType;
  productCategory?: MoroccanProductCategory;
  amount: number;
  isTaxInclusive?: boolean; // true = amount is TTC (inclusive), false = amount is HT (exclusive)
  paymentMethod?: PaymentMethod | string;
  customRate?: number;
  isExempt?: boolean;
  exemptionCertificateId?: string;
  exemptionReason?: string;
  prorataPercentage?: number; // 0 - 100 for partial VAT recovery
  reason?: string;
  originalInvoiceId?: string;
  originalTaxDate?: string | Date;
}

export interface TaxBreakdownItem {
  name: string;
  code: string;
  rate: number;
  baseAmount: number;
  taxAmount: number;
  pcgmAccount: string;
  isDeductible?: boolean;
}

export interface TaxCalculationResult {
  jurisdiction: string;
  taxDate: string;
  fiscalYear: number;
  appliedFinanceLaw: string;
  ruleVersion: string;
  transactionType: TaxTransactionType;
  customerType: TaxCustomerType;
  productCategory: string;
  amountHt: number;
  tvaRate: number;
  tvaAmount: number;
  rawTtc: number;
  droitDeTimbre: number;
  totalTtc: number;
  isExempt: boolean;
  isZeroRated: boolean;
  exemptionArticle?: string;
  deductionRight: DeductionRight;
  prorataPercentage?: number;
  deductibleTvaAmount: number;
  nonDeductibleTvaAmount: number;
  pcgmVatAccount: string;
  pcgmStampAccount?: string;
  rounding: {
    method: 'half_up_2_decimals';
    precision: number;
    difference: number;
  };
  breakdown: TaxBreakdownItem[];
  warnings: string[];
  isOverCashLegalThreshold: boolean;
  reversalOf?: {
    originalInvoiceId?: string;
    originalTaxDate?: string;
    taxCorrection: number;
  };
}

export interface TaxDocumentItemInput {
  quantity: number;
  unitPrice: number;
  isTaxInclusive?: boolean;
  productCategory?: MoroccanProductCategory;
  tvaRate?: number;
  isExempt?: boolean;
  description?: string;
}

export interface TaxDocumentTotalsResult {
  subtotalHt: number;
  totalTva: number;
  droitDeTimbre: number;
  totalTtc: number;
  remainingAmount: number;
  rateBreakdown: {
    rate: number;
    baseHt: number;
    tvaAmount: number;
    pcgmAccount: string;
  }[];
  appliedFinanceLaw: string;
  warnings: string[];
}

export interface VatProrataResult {
  fiscalYear: number;
  prorataPercentage: number; // e.g. 85.5%
  taxableTurnoverWithDeduction: number;
  exportTurnoverZeroRated: number;
  exemptTurnoverWithoutDeduction: number;
  totalTurnover: number;
  formulaDescription: string;
}

export interface TaxAdjustmentParams {
  assetDescription: string;
  acquisitionDate: string | Date;
  disposalOrAdjustmentDate: string | Date;
  initialTvaAmount: number;
  initialProrata?: number;
  newProrata?: number;
  adjustmentType: 'prorata_variation' | 'early_disposal_5yr' | 'early_disposal_10yr_property';
}

export interface TaxAdjustmentResult {
  adjustmentType: string;
  yearsElapsed: number;
  yearsRemaining: number;
  regularizationFraction: string;
  taxPayableToState: number; // Reverse deduction
  taxRecoverableFromState: number; // Additional deduction
  netAdjustment: number;
  pcgmAccount: string;
  legalArticle: string;
}

// ============================================================================
// 2. VERSIONED MOROCCAN FISCAL RULES REGISTRY (Lois de Finances)
// ============================================================================

export interface MoroccanFiscalLawRuleSet {
  yearRange: { startYear: number; endYear: number };
  lawName: string;
  version: string;
  rates: {
    standard: number; // 20%
    intermediate14: number; // 14%
    intermediate10: number; // 10%
    reduced7: number; // 7%
    zero: number; // 0%
  };
  categoryRates: Record<string, { rate: number; isExempt?: boolean; isZeroRated?: boolean; article: string; deduction: DeductionRight }>;
  stampDutyRate: number; // 0.25% (0.0025)
  cashCeilingMad: number; // 10,000 MAD CGI Art. 193/198
}

/**
 * Historical and current versioned fiscal laws according to Moroccan CGI reforms.
 * Rules are selected strictly based on the taxDate of the operation.
 */
export const MOROCCAN_FISCAL_RULES: MoroccanFiscalLawRuleSet[] = [
  // 1. HISTORICAL: PRE-2024 (<= 2023-12-31)
  {
    yearRange: { startYear: 1900, endYear: 2023 },
    lawName: 'Loi de Finances Historique (<= 2023)',
    version: 'LF-PRE-2024',
    rates: {
      standard: 20,
      intermediate14: 14,
      intermediate10: 10,
      reduced7: 7,
      zero: 0
    },
    categoryRates: {
      standard: { rate: 20, article: 'Art. 98 CGI', deduction: 'with_deduction' },
      general_goods: { rate: 20, article: 'Art. 98 CGI', deduction: 'with_deduction' },
      telecom: { rate: 20, article: 'Art. 98 CGI', deduction: 'with_deduction' },
      capital_assets: { rate: 20, article: 'Art. 98 CGI', deduction: 'with_deduction' },
      electricity_low_voltage: { rate: 14, article: 'Art. 99-1° CGI (Historique)', deduction: 'with_deduction' },
      electricity_medium_high: { rate: 14, article: 'Art. 99-1° CGI (Historique)', deduction: 'with_deduction' },
      water_drinking: { rate: 7, article: 'Art. 99-3° CGI', deduction: 'with_deduction' },
      sanitation_services: { rate: 7, article: 'Art. 99-3° CGI', deduction: 'with_deduction' },
      pharmaceutical: { rate: 7, article: 'Art. 99-3° CGI (Historique)', deduction: 'with_deduction' },
      school_supplies: { rate: 0, isExempt: true, article: 'Art. 91-I-A CGI', deduction: 'without_deduction' },
      basic_food: { rate: 0, isExempt: true, article: 'Art. 91-I-A CGI', deduction: 'without_deduction' },
      refined_sugar: { rate: 7, article: 'Art. 99-3° CGI', deduction: 'with_deduction' },
      canned_sardines: { rate: 7, article: 'Art. 99-3° CGI', deduction: 'with_deduction' },
      soap_household: { rate: 7, article: 'Art. 99-3° CGI', deduction: 'with_deduction' },
      school_transport: { rate: 14, article: 'Art. 99-1° CGI', deduction: 'with_deduction' },
      hospitality_restaurant: { rate: 10, article: 'Art. 99-2° CGI', deduction: 'with_deduction' },
      banking_financial: { rate: 10, article: 'Art. 99-2° CGI', deduction: 'with_deduction' },
      transport_passenger_freight: { rate: 14, article: 'Art. 99-1° CGI', deduction: 'with_deduction' },
      solar_energy_renewable: { rate: 10, article: 'Art. 99-2° CGI', deduction: 'with_deduction' },
      petroleum_refined: { rate: 10, article: 'Art. 99-2° CGI', deduction: 'with_deduction' }
    },
    stampDutyRate: 0.0025,
    cashCeilingMad: 10000
  },

  // 2. LOI DE FINANCES 2024 (2024-01-01 to 2024-12-31)
  // Reform kick-off: progressive harmonization of electricity (14% -> 16%), pharmaceuticals to 0% with deduction right
  {
    yearRange: { startYear: 2024, endYear: 2024 },
    lawName: 'Loi de Finances 2024 (Maroc LF N° 55-23)',
    version: 'LF-2024',
    rates: {
      standard: 20,
      intermediate14: 14,
      intermediate10: 10,
      reduced7: 7,
      zero: 0
    },
    categoryRates: {
      standard: { rate: 20, article: 'Art. 98 CGI', deduction: 'with_deduction' },
      general_goods: { rate: 20, article: 'Art. 98 CGI', deduction: 'with_deduction' },
      telecom: { rate: 20, article: 'Art. 98 CGI', deduction: 'with_deduction' },
      capital_assets: { rate: 20, article: 'Art. 98 CGI', deduction: 'with_deduction' },
      electricity_low_voltage: { rate: 16, article: 'Art. 99 CGI (LF 2024 transition 16%)', deduction: 'with_deduction' },
      electricity_medium_high: { rate: 14, article: 'Art. 99 CGI', deduction: 'with_deduction' },
      water_drinking: { rate: 7, article: 'Art. 99-3° CGI', deduction: 'with_deduction' },
      sanitation_services: { rate: 7, article: 'Art. 99-3° CGI', deduction: 'with_deduction' },
      pharmaceutical: { rate: 0, isZeroRated: true, article: 'Art. 92-I-54° CGI (LF 2024)', deduction: 'with_deduction' },
      school_supplies: { rate: 0, isExempt: true, article: 'Art. 91-I-A CGI', deduction: 'without_deduction' },
      basic_food: { rate: 0, isExempt: true, article: 'Art. 91-I-A CGI', deduction: 'without_deduction' },
      refined_sugar: { rate: 8, article: 'Art. 99 CGI (LF 2024 transition 8%)', deduction: 'with_deduction' },
      canned_sardines: { rate: 8, article: 'Art. 99 CGI (LF 2024 transition 8%)', deduction: 'with_deduction' },
      soap_household: { rate: 8, article: 'Art. 99 CGI (LF 2024 transition 8%)', deduction: 'with_deduction' },
      school_transport: { rate: 10, article: 'Art. 99-2° CGI (LF 2024)', deduction: 'with_deduction' },
      hospitality_restaurant: { rate: 10, article: 'Art. 99-2° CGI', deduction: 'with_deduction' },
      banking_financial: { rate: 10, article: 'Art. 99-2° CGI', deduction: 'with_deduction' },
      transport_passenger_freight: { rate: 14, article: 'Art. 99-1° CGI', deduction: 'with_deduction' },
      solar_energy_renewable: { rate: 10, article: 'Art. 99-2° CGI', deduction: 'with_deduction' },
      petroleum_refined: { rate: 10, article: 'Art. 99-2° CGI', deduction: 'with_deduction' }
    },
    stampDutyRate: 0.0025,
    cashCeilingMad: 10000
  },

  // 3. LOI DE FINANCES 2025 (2025-01-01 to 2025-12-31)
  // Progressive step: electricity (18%), sugar/soap/sardines (9%), water & sanitation harmonization
  {
    yearRange: { startYear: 2025, endYear: 2025 },
    lawName: 'Loi de Finances 2025 (Maroc LF N° 60-24)',
    version: 'LF-2025',
    rates: {
      standard: 20,
      intermediate14: 14,
      intermediate10: 10,
      reduced7: 7,
      zero: 0
    },
    categoryRates: {
      standard: { rate: 20, article: 'Art. 98 CGI', deduction: 'with_deduction' },
      general_goods: { rate: 20, article: 'Art. 98 CGI', deduction: 'with_deduction' },
      telecom: { rate: 20, article: 'Art. 98 CGI', deduction: 'with_deduction' },
      capital_assets: { rate: 20, article: 'Art. 98 CGI', deduction: 'with_deduction' },
      electricity_low_voltage: { rate: 18, article: 'Art. 99 CGI (LF 2025 transition 18%)', deduction: 'with_deduction' },
      electricity_medium_high: { rate: 16, article: 'Art. 99 CGI', deduction: 'with_deduction' },
      water_drinking: { rate: 7, article: 'Art. 99-3° CGI', deduction: 'with_deduction' },
      sanitation_services: { rate: 8, article: 'Art. 99 CGI (LF 2025 transition 8%)', deduction: 'with_deduction' },
      pharmaceutical: { rate: 0, isZeroRated: true, article: 'Art. 92-I-54° CGI', deduction: 'with_deduction' },
      school_supplies: { rate: 0, isExempt: true, article: 'Art. 91-I-A CGI', deduction: 'without_deduction' },
      basic_food: { rate: 0, isExempt: true, article: 'Art. 91-I-A CGI', deduction: 'without_deduction' },
      refined_sugar: { rate: 9, article: 'Art. 99 CGI (LF 2025 transition 9%)', deduction: 'with_deduction' },
      canned_sardines: { rate: 9, article: 'Art. 99 CGI (LF 2025 transition 9%)', deduction: 'with_deduction' },
      soap_household: { rate: 9, article: 'Art. 99 CGI (LF 2025 transition 9%)', deduction: 'with_deduction' },
      school_transport: { rate: 10, article: 'Art. 99-2° CGI', deduction: 'with_deduction' },
      hospitality_restaurant: { rate: 10, article: 'Art. 99-2° CGI', deduction: 'with_deduction' },
      banking_financial: { rate: 10, article: 'Art. 99-2° CGI', deduction: 'with_deduction' },
      transport_passenger_freight: { rate: 14, article: 'Art. 99-1° CGI', deduction: 'with_deduction' },
      solar_energy_renewable: { rate: 10, article: 'Art. 99-2° CGI', deduction: 'with_deduction' },
      petroleum_refined: { rate: 10, article: 'Art. 99-2° CGI', deduction: 'with_deduction' }
    },
    stampDutyRate: 0.0025,
    cashCeilingMad: 10000
  },

  // 4. LOI DE FINANCES 2026 ET AU-DELÀ (>= 2026-01-01)
  // Final target structure of multiannual reform: converged rates (0%, 10%, 20%)
  {
    yearRange: { startYear: 2026, endYear: 2099 },
    lawName: 'Loi de Finances 2026 (Maroc CGI Cible Finale)',
    version: 'LF-2026',
    rates: {
      standard: 20,
      intermediate14: 14,
      intermediate10: 10,
      reduced7: 7,
      zero: 0
    },
    categoryRates: {
      standard: { rate: 20, article: 'Art. 98 CGI (Taux Normal 20%)', deduction: 'with_deduction' },
      general_goods: { rate: 20, article: 'Art. 98 CGI', deduction: 'with_deduction' },
      telecom: { rate: 20, article: 'Art. 98 CGI', deduction: 'with_deduction' },
      capital_assets: { rate: 20, article: 'Art. 98 CGI', deduction: 'with_deduction' },
      electricity_low_voltage: { rate: 20, article: 'Art. 98 CGI (LF 2026 Convergence 20%)', deduction: 'with_deduction' },
      electricity_medium_high: { rate: 20, article: 'Art. 98 CGI', deduction: 'with_deduction' },
      water_drinking: { rate: 7, article: 'Art. 99-3° CGI (Eau potable usage domestique)', deduction: 'with_deduction' },
      sanitation_services: { rate: 10, article: 'Art. 99-2° CGI (LF 2026 Convergence 10%)', deduction: 'with_deduction' },
      pharmaceutical: { rate: 0, isZeroRated: true, article: 'Art. 92-I-54° CGI (0% avec droit à déduction)', deduction: 'with_deduction' },
      school_supplies: { rate: 0, isExempt: true, article: 'Art. 91-I-A CGI (Fournitures scolaires exonérées)', deduction: 'without_deduction' },
      basic_food: { rate: 0, isExempt: true, article: 'Art. 91-I-A CGI (Denrées de base non transformées)', deduction: 'without_deduction' },
      refined_sugar: { rate: 10, article: 'Art. 99-2° CGI (LF 2026 Convergence 10%)', deduction: 'with_deduction' },
      canned_sardines: { rate: 10, article: 'Art. 99-2° CGI (LF 2026 Convergence 10%)', deduction: 'with_deduction' },
      soap_household: { rate: 10, article: 'Art. 99-2° CGI (LF 2026 Convergence 10%)', deduction: 'with_deduction' },
      school_transport: { rate: 10, article: 'Art. 99-2° CGI', deduction: 'with_deduction' },
      hospitality_restaurant: { rate: 10, article: 'Art. 99-2° CGI (Hôtellerie et Restauration)', deduction: 'with_deduction' },
      banking_financial: { rate: 10, article: 'Art. 99-2° CGI (Opérations de banque et crédit)', deduction: 'with_deduction' },
      transport_passenger_freight: { rate: 14, article: 'Art. 99-1° CGI (Transport routier et ferroviaire)', deduction: 'with_deduction' },
      solar_energy_renewable: { rate: 10, article: 'Art. 99-2° CGI (Énergies renouvelables)', deduction: 'with_deduction' },
      petroleum_refined: { rate: 10, article: 'Art. 99-2° CGI', deduction: 'with_deduction' }
    },
    stampDutyRate: 0.0025,
    cashCeilingMad: 10000
  }
];

// ============================================================================
// 3. PCGM ACCOUNT MAPPING ENGINE FOR VAT & STAMP DUTY
// ============================================================================

export function getPcgmtVatAccount(params: {
  transactionType: TaxTransactionType;
  rate: number;
  isCapitalAsset?: boolean;
}): string {
  const { transactionType, rate, isCapitalAsset } = params;

  // 1. Sales & Output TVA (TVA Collectée / Facturée)
  if (['sale_b2b', 'sale_b2c', 'pos_sale', 'credit_note', 'return'].includes(transactionType)) {
    return '44550000'; // État - TVA Facturée
  }

  // 2. Fixed Capital Assets (Immobilisations)
  if (isCapitalAsset || transactionType === 'purchase_capital_assets') {
    return '34551000'; // État - TVA Récupérable sur immobilisations
  }

  // 3. Deductible VAT on Operating Purchases & Expenses by Rate
  switch (Math.round(rate)) {
    case 20:
      return '34551000'; // TVA 20% sur charges
    case 14:
      return '34552000'; // TVA 14% sur charges
    case 10:
      return '34553000'; // TVA 10% sur charges
    case 7:
    case 8:
    case 9:
      return '34554000'; // TVA 7% / réduite sur charges
    default:
      return '34551000';
  }
}

// ============================================================================
// 4. CORE TAX ENGINE ABSTRACTION (TaxEngine)
// ============================================================================

export class TaxEngine {
  /**
   * Resolves the active fiscal law for a given date.
   * Guarantees that historical documents always retrieve historical tax rules.
   */
  public static getFiscalRule(taxDate: string | Date): MoroccanFiscalLawRuleSet {
    const parsedDate = typeof taxDate === 'string' ? new Date(taxDate) : taxDate;
    const year = isNaN(parsedDate.getTime()) ? new Date().getFullYear() : parsedDate.getFullYear();

    const ruleSet = MOROCCAN_FISCAL_RULES.find(
      r => year >= r.yearRange.startYear && year <= r.yearRange.endYear
    );

    return ruleSet || MOROCCAN_FISCAL_RULES[MOROCCAN_FISCAL_RULES.length - 1];
  }

  /**
   * Main calculation API: TaxEngine.calculate({...})
   * Calculates VAT, stamp duty (droit de timbre), exemptions, deductions, and PCGM accounts.
   */
  public static calculate(params: TaxCalculationParams): TaxCalculationResult {
    const {
      jurisdiction = 'MA',
      taxDate,
      transactionType,
      customerType = 'business',
      productCategory = 'standard',
      amount,
      isTaxInclusive = false,
      paymentMethod = 'transfer',
      customRate,
      isExempt = false,
      exemptionCertificateId,
      exemptionReason,
      prorataPercentage = 100,
      reason,
      originalInvoiceId,
      originalTaxDate
    } = params;

    const dateObj = typeof taxDate === 'string' ? new Date(taxDate) : taxDate;
    const isoDateStr = isNaN(dateObj.getTime())
      ? new Date().toISOString().split('T')[0]
      : dateObj.toISOString().split('T')[0];
    const fiscalYear = isNaN(dateObj.getTime()) ? new Date().getFullYear() : dateObj.getFullYear();

    const fiscalRule = this.getFiscalRule(isoDateStr);
    const warnings: string[] = [];

    // --- 1. RESOLVE VAT RATE & EXEMPTION STATUS ---
    let effectiveRate = 20;
    let isZeroRated = false;
    let isExplicitlyExempt = isExempt;
    let exemptionArticle: string | undefined;
    let deductionRight: DeductionRight = 'with_deduction';

    // A. Direct export transaction: Zero-rated with deduction right (CGI Art. 92)
    if (transactionType === 'export' || customerType === 'foreign') {
      effectiveRate = 0;
      isZeroRated = true;
      isExplicitlyExempt = true;
      exemptionArticle = 'Art. 92-I-1° CGI (Exportations de produits et services)';
      deductionRight = 'with_deduction';
    }
    // B. Diplomatic or Certified Exemption
    else if (customerType === 'diplomatic' || (isExempt && exemptionCertificateId)) {
      effectiveRate = 0;
      isExplicitlyExempt = true;
      exemptionArticle = exemptionReason || 'Art. 92 CGI (Exonération conventionnelle / visa fiscal)';
      deductionRight = 'with_deduction';
    }
    // C. Custom rate override
    else if (customRate !== undefined && customRate !== null && !isNaN(customRate)) {
      effectiveRate = customRate;
      if (effectiveRate === 0) {
        isExplicitlyExempt = true;
        exemptionArticle = exemptionReason || 'Exonération spécifique';
        deductionRight = 'without_deduction';
      }
    }
    // D. Versioned product category mapping
    else {
      const catConfig = fiscalRule.categoryRates[productCategory] || fiscalRule.categoryRates['standard'];
      effectiveRate = catConfig.rate;
      isExplicitlyExempt = Boolean(catConfig.isExempt);
      isZeroRated = Boolean(catConfig.isZeroRated);
      exemptionArticle = catConfig.article;
      deductionRight = catConfig.deduction;
    }

    // --- 2. BASE HT & VAT COMPUTATION (INCLUSIVE VS EXCLUSIVE) ---
    const numericAmount = Number(amount) || 0;
    let amountHt = 0;
    let tvaAmount = 0;
    let rawTtc = 0;

    if (isTaxInclusive) {
      // Amount is TTC: HT = TTC / (1 + Rate/100)
      if (effectiveRate > 0) {
        amountHt = Number((numericAmount / (1 + effectiveRate / 100)).toFixed(2));
        tvaAmount = Number((numericAmount - amountHt).toFixed(2));
        rawTtc = Number((amountHt + tvaAmount).toFixed(2));
      } else {
        amountHt = Number(numericAmount.toFixed(2));
        tvaAmount = 0;
        rawTtc = amountHt;
      }
    } else {
      // Amount is HT: TVA = HT * Rate/100, TTC = HT + TVA
      amountHt = Number(numericAmount.toFixed(2));
      if (effectiveRate > 0) {
        tvaAmount = Number((amountHt * (effectiveRate / 100)).toFixed(2));
        rawTtc = Number((amountHt + tvaAmount).toFixed(2));
      } else {
        tvaAmount = 0;
        rawTtc = amountHt;
      }
    }

    // --- 3. RETURNS / CREDIT NOTES REVERSAL LOGIC ---
    const isCreditNoteOrReturn = transactionType === 'credit_note' || transactionType === 'return';
    let reversalMetadata: TaxCalculationResult['reversalOf'];

    if (isCreditNoteOrReturn) {
      reversalMetadata = {
        originalInvoiceId: originalInvoiceId || undefined,
        originalTaxDate: originalTaxDate ? (typeof originalTaxDate === 'string' ? originalTaxDate : originalTaxDate.toISOString().split('T')[0]) : undefined,
        taxCorrection: tvaAmount
      };
    }

    // --- 4. DROIT DE TIMBRE (STAMP DUTY - CGI ART. 193/198) ---
    // 0.25% stamp duty applies exclusively on cash payments
    const isCash = paymentMethod === 'cash';
    let droitDeTimbre = 0;

    if (isCash && rawTtc > 0 && !isCreditNoteOrReturn) {
      droitDeTimbre = Number((rawTtc * fiscalRule.stampDutyRate).toFixed(2));
    }

    const totalTtc = Number((rawTtc + droitDeTimbre).toFixed(2));

    // --- 5. CASH THRESHOLD AUDIT & WARNINGS (CGI Art. 193/198) ---
    const isOverCashLegalThreshold = isCash && rawTtc > fiscalRule.cashCeilingMad;
    if (isOverCashLegalThreshold) {
      warnings.push(
        `Avertissement Légal (CGI Art. 193/198): Règlement en espèces de ${this.formatMad(rawTtc)} supérieur au plafond légal de ${this.formatMad(fiscalRule.cashCeilingMad)}. Droit de timbre de 0,25% (${this.formatMad(droitDeTimbre)}) appliqué.`
      );
    } else if (isCash && droitDeTimbre > 0) {
      warnings.push(
        `Règlement Espèces: Droit de timbre fiscal de 0,25% (${this.formatMad(droitDeTimbre)}) appliqué.`
      );
    }

    // --- 6. DEDUCTIBILITY & PRORATA (CGI Art. 104) ---
    let deductibleTvaAmount = 0;
    let nonDeductibleTvaAmount = 0;

    if (['purchase_goods', 'purchase_services', 'purchase_capital_assets', 'expense'].includes(transactionType)) {
      if (deductionRight === 'without_deduction' || deductionRight === 'none') {
        deductibleTvaAmount = 0;
        nonDeductibleTvaAmount = tvaAmount;
      } else {
        const normalizedProrata = Math.max(0, Math.min(100, prorataPercentage));
        if (normalizedProrata < 100) {
          deductibleTvaAmount = Number((tvaAmount * (normalizedProrata / 100)).toFixed(2));
          nonDeductibleTvaAmount = Number((tvaAmount - deductibleTvaAmount).toFixed(2));
          deductionRight = 'prorata';
        } else {
          deductibleTvaAmount = tvaAmount;
          nonDeductibleTvaAmount = 0;
        }
      }
    } else {
      deductibleTvaAmount = 0;
      nonDeductibleTvaAmount = 0;
    }

    // --- 7. PCGM ACCOUNT RESOLUTION ---
    const pcgmVatAccount = getPcgmtVatAccount({
      transactionType,
      rate: effectiveRate,
      isCapitalAsset: productCategory === 'capital_assets' || transactionType === 'purchase_capital_assets'
    });
    const pcgmStampAccount = isCash && droitDeTimbre > 0 ? '44521000' : undefined;

    // --- 8. BREAKDOWN GENERATION ---
    const breakdown: TaxBreakdownItem[] = [];

    // Base HT item
    breakdown.push({
      name: `Base HT (${effectiveRate}%)`,
      code: 'BASE_HT',
      rate: effectiveRate,
      baseAmount: amountHt,
      taxAmount: 0,
      pcgmAccount: isCreditNoteOrReturn ? '71110000' : (['sale_b2b', 'sale_b2c', 'pos_sale'].includes(transactionType) ? '71110000' : '61110000')
    });

    // TVA item
    if (tvaAmount > 0 || isZeroRated || isExplicitlyExempt) {
      breakdown.push({
        name: isZeroRated ? 'TVA Exonérée (Export - Art. 92)' : (isExplicitlyExempt ? `TVA Exonérée (${exemptionArticle || 'Art. 91'})` : `TVA ${effectiveRate}%`),
        code: `TVA_${effectiveRate}`,
        rate: effectiveRate,
        baseAmount: amountHt,
        taxAmount: tvaAmount,
        pcgmAccount: pcgmVatAccount,
        isDeductible: deductibleTvaAmount > 0
      });
    }

    // Stamp Duty item
    if (droitDeTimbre > 0) {
      breakdown.push({
        name: 'Droit de Timbre (0.25% Espèces)',
        code: 'DROIT_DE_TIMBRE',
        rate: 0.25,
        baseAmount: rawTtc,
        taxAmount: droitDeTimbre,
        pcgmAccount: pcgmStampAccount || '44521000'
      });
    }

    return {
      jurisdiction,
      taxDate: isoDateStr,
      fiscalYear,
      appliedFinanceLaw: fiscalRule.lawName,
      ruleVersion: fiscalRule.version,
      transactionType,
      customerType,
      productCategory,
      amountHt,
      tvaRate: effectiveRate,
      tvaAmount,
      rawTtc,
      droitDeTimbre,
      totalTtc,
      isExempt: isExplicitlyExempt,
      isZeroRated,
      exemptionArticle,
      deductionRight,
      prorataPercentage: prorataPercentage < 100 ? prorataPercentage : undefined,
      deductibleTvaAmount,
      nonDeductibleTvaAmount,
      pcgmVatAccount,
      pcgmStampAccount,
      rounding: {
        method: 'half_up_2_decimals',
        precision: 2,
        difference: Number((totalTtc - (amountHt + tvaAmount + droitDeTimbre)).toFixed(4))
      },
      breakdown,
      warnings,
      isOverCashLegalThreshold,
      reversalOf: reversalMetadata
    };
  }

  /**
   * Recalculates full document totals with granular line item categorization,
   * multiple VAT rates, stamp duty, and payment method audit.
   */
  public static calculateDocumentTotals(
    items: TaxDocumentItemInput[],
    options?: {
      taxDate?: string | Date;
      paymentMethod?: PaymentMethod | string;
      paidAmount?: number;
      customerType?: TaxCustomerType;
      jurisdiction?: MoroccanJurisdiction;
    }
  ): TaxDocumentTotalsResult {
    const taxDate = options?.taxDate || new Date().toISOString().split('T')[0];
    const paymentMethod = options?.paymentMethod || 'transfer';
    const paidAmount = options?.paidAmount || 0;
    const customerType = options?.customerType || 'business';
    const jurisdiction = options?.jurisdiction || 'MA';

    let subtotalHt = 0;
    let totalTva = 0;
    const rateMap = new Map<number, { baseHt: number; tvaAmount: number; pcgmAccount: string }>();
    const allWarnings: string[] = [];

    items.forEach(item => {
      const lineQty = Number(item.quantity) || 1;
      const lineUnitPrice = Number(item.unitPrice) || 0;
      const lineGrossAmount = Number((lineQty * lineUnitPrice).toFixed(2));

      const calc = this.calculate({
        jurisdiction,
        taxDate,
        transactionType: 'sale_b2b',
        customerType,
        productCategory: item.productCategory || 'standard',
        customRate: item.tvaRate,
        isExempt: item.isExempt,
        amount: lineGrossAmount,
        isTaxInclusive: item.isTaxInclusive,
        paymentMethod
      });

      subtotalHt += calc.amountHt;
      totalTva += calc.tvaAmount;

      const current = rateMap.get(calc.tvaRate) || {
        baseHt: 0,
        tvaAmount: 0,
        pcgmAccount: calc.pcgmVatAccount
      };
      current.baseHt += calc.amountHt;
      current.tvaAmount += calc.tvaAmount;
      rateMap.set(calc.tvaRate, current);

      calc.warnings.forEach(w => {
        if (!allWarnings.includes(w)) allWarnings.push(w);
      });
    });

    subtotalHt = Number(subtotalHt.toFixed(2));
    totalTva = Number(totalTva.toFixed(2));
    const rawTtc = Number((subtotalHt + totalTva).toFixed(2));

    const droitDeTimbre = this.calculateDroitDeTimbre(rawTtc, paymentMethod);
    const totalTtc = Number((rawTtc + droitDeTimbre).toFixed(2));
    const remainingAmount = Number((totalTtc - paidAmount).toFixed(2));

    const rateBreakdown = Array.from(rateMap.entries()).map(([rate, data]) => ({
      rate,
      baseHt: Number(data.baseHt.toFixed(2)),
      tvaAmount: Number(data.tvaAmount.toFixed(2)),
      pcgmAccount: data.pcgmAccount
    }));

    const fiscalRule = this.getFiscalRule(taxDate);

    return {
      subtotalHt,
      totalTva,
      droitDeTimbre,
      totalTtc,
      remainingAmount: remainingAmount > 0 ? remainingAmount : 0,
      rateBreakdown,
      appliedFinanceLaw: fiscalRule.lawName,
      warnings: allWarnings
    };
  }

  /**
   * Calculates balanced credit note / avoir client tax reversal.
   */
  public static calculateCreditNote(params: {
    creditNoteAmount: number;
    tvaRate?: number;
    productCategory?: MoroccanProductCategory;
    isTaxInclusive?: boolean;
    taxDate?: string | Date;
    originalInvoiceId?: string;
    originalTaxDate?: string | Date;
    reason?: string;
  }): TaxCalculationResult {
    return this.calculate({
      taxDate: params.taxDate || new Date().toISOString().split('T')[0],
      transactionType: 'credit_note',
      productCategory: params.productCategory || 'standard',
      customRate: params.tvaRate,
      amount: params.creditNoteAmount,
      isTaxInclusive: Boolean(params.isTaxInclusive),
      originalInvoiceId: params.originalInvoiceId,
      originalTaxDate: params.originalTaxDate,
      reason: params.reason
    });
  }

  /**
   * Computes the Moroccan General Tax Code VAT Prorata (CGI Article 104)
   * Formula:
   * Prorata % = [ (CA Imposable TTC + CA Export exonéré avec déduction) / (Numérateur + CA Exonéré sans déduction) ] * 100
   */
  public static calculateVatProrata(params: {
    fiscalYear?: number;
    turnoverTaxableWithDeduction: number;
    turnoverZeroRatedExport: number;
    turnoverExemptWithoutDeduction: number;
    otherTurnover?: number;
  }): VatProrataResult {
    const fiscalYear = params.fiscalYear || new Date().getFullYear();
    const caTaxable = Number(params.turnoverTaxableWithDeduction) || 0;
    const caExport = Number(params.turnoverZeroRatedExport) || 0;
    const caExemptWithout = Number(params.turnoverExemptWithoutDeduction) || 0;
    const caOther = Number(params.otherTurnover) || 0;

    const numerator = caTaxable + caExport;
    const denominator = numerator + caExemptWithout + caOther;

    let prorataPercentage = 100;
    if (denominator > 0) {
      prorataPercentage = Number(((numerator / denominator) * 100).toFixed(2));
    }

    return {
      fiscalYear,
      prorataPercentage: Math.max(0, Math.min(100, prorataPercentage)),
      taxableTurnoverWithDeduction: caTaxable,
      exportTurnoverZeroRated: caExport,
      exemptTurnoverWithoutDeduction: caExemptWithout,
      totalTurnover: denominator,
      formulaDescription: 'Prorata CGI Art. 104 = [(CA Imposable + Export Art. 92) / CA Total] × 100'
    };
  }

  /**
   * Computes VAT Regularization on Capital Assets (Régularisation de TVA sur immobilisations)
   * Under CGI Article 102:
   * - Movable equipment (Biens meubles): 5-year clawback window (1/5 per remaining year)
   * - Real estate properties (Biens immeubles): 10-year clawback window (1/10 per remaining year)
   */
  public static calculateTaxAdjustment(params: TaxAdjustmentParams): TaxAdjustmentResult {
    const {
      acquisitionDate,
      disposalOrAdjustmentDate,
      initialTvaAmount,
      initialProrata = 100,
      newProrata = 100,
      adjustmentType
    } = params;

    const dAcq = typeof acquisitionDate === 'string' ? new Date(acquisitionDate) : acquisitionDate;
    const dAdj = typeof disposalOrAdjustmentDate === 'string' ? new Date(disposalOrAdjustmentDate) : disposalOrAdjustmentDate;

    const yearsElapsed = Math.max(1, dAdj.getFullYear() - dAcq.getFullYear() + 1);
    const maxYears = adjustmentType === 'early_disposal_10yr_property' ? 10 : 5;
    const yearsRemaining = Math.max(0, maxYears - yearsElapsed);

    let taxPayableToState = 0;
    let taxRecoverableFromState = 0;
    let netAdjustment = 0;
    let legalArticle = 'Art. 102 CGI Maroc';

    if (adjustmentType === 'prorata_variation') {
      // Annual prorata variation > 5 percentage points
      const diff = newProrata - initialProrata;
      const variationShare = (initialTvaAmount / 5) * (Math.abs(diff) / 100);
      if (diff < -5) {
        // Drop in prorata: Reversal of deduction (reverser au Trésor)
        taxPayableToState = Number(variationShare.toFixed(2));
        netAdjustment = -taxPayableToState;
      } else if (diff > 5) {
        // Increase in prorata: Additional deduction
        taxRecoverableFromState = Number(variationShare.toFixed(2));
        netAdjustment = taxRecoverableFromState;
      }
    } else {
      // Early asset disposal / cessation within 5 or 10 years
      if (yearsRemaining > 0) {
        taxPayableToState = Number(((initialTvaAmount / maxYears) * yearsRemaining).toFixed(2));
        netAdjustment = -taxPayableToState;
      }
    }

    return {
      adjustmentType,
      yearsElapsed,
      yearsRemaining,
      regularizationFraction: `${yearsRemaining}/${maxYears}`,
      taxPayableToState,
      taxRecoverableFromState,
      netAdjustment,
      pcgmAccount: '44560000', // État - TVA due (Régularisation)
      legalArticle
    };
  }

  /**
   * Helper: Calculates 0.25% Droit de Timbre for cash transactions (CGI Art. 193/198)
   */
  public static calculateDroitDeTimbre(amountTtc: number, paymentMethod?: PaymentMethod | string): number {
    if (paymentMethod === 'cash' && amountTtc > 0) {
      return Number((amountTtc * 0.0025).toFixed(2));
    }
    return 0;
  }

  /**
   * Helper: Validates Moroccan 15-digit ICE (Identifiant Commun de l'Entreprise)
   */
  public static validateIce(iceString: string): { valid: boolean; message?: string } {
    const cleaned = (iceString || '').trim().replace(/\s+/g, '');
    if (!cleaned) {
      return { valid: false, message: "L'ICE est obligatoire pour les factures B2B au Maroc." };
    }
    if (!/^\d{15}$/.test(cleaned)) {
      return { valid: false, message: "L'ICE doit comporter exactement 15 chiffres." };
    }
    return { valid: true };
  }

  /**
   * Formats currency in Moroccan Dirhams (MAD) with standard 2 decimal places
   */
  public static formatMad(amount: number, showSymbol = true): string {
    const formatted = new Intl.NumberFormat('fr-MA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);

    return showSymbol ? `${formatted} MAD` : formatted;
  }
}
