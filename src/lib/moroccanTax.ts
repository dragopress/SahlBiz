import { TvaRate, PaymentMethod } from '../types';

export function validateIce(iceString: string): { valid: boolean; message?: string } {
  const cleaned = iceString.trim().replace(/\s+/g, '');
  if (!cleaned) {
    return { valid: false, message: "L'ICE est obligatoire pour les factures B2B au Maroc." };
  }
  if (!/^\d{15}$/.test(cleaned)) {
    return { valid: false, message: "L'ICE doit comporter exactement 15 chiffres." };
  }
  return { valid: true };
}

export function calculateTva(amountHt: number, rate: TvaRate): { tvaAmount: number; amountTtc: number } {
  if (rate === 0) {
    return { tvaAmount: 0, amountTtc: amountHt };
  }
  const tvaAmount = Number((amountHt * (rate / 100)).toFixed(2));
  const amountTtc = Number((amountHt + tvaAmount).toFixed(2));
  return { tvaAmount, amountTtc };
}

export function calculateDroitDeTimbre(amountTtc: number, paymentMethod?: PaymentMethod): number {
  // Moroccan Tax Code: 0.25% Droit de Timbre applies on cash payments
  if (paymentMethod === 'cash') {
    return Number((amountTtc * 0.0025).toFixed(2));
  }
  return 0;
}

export interface CashThresholdResult {
  isCash: boolean;
  isOverThreshold: boolean;
  thresholdLimit: number; // 10,000 MAD
  droitDeTimbre: number; // 0.25% stamp duty
  amountTtcWithStampDuty: number;
  warningMessage: string | null;
}

export function detectCashLegalThreshold(amountTtc: number, paymentMethod?: PaymentMethod): CashThresholdResult {
  const isCash = paymentMethod === 'cash';
  const thresholdLimit = 10000;
  const isOverThreshold = isCash && amountTtc > thresholdLimit;
  const droitDeTimbre = isCash ? Number((amountTtc * 0.0025).toFixed(2)) : 0;
  const amountTtcWithStampDuty = Number((amountTtc + droitDeTimbre).toFixed(2));

  let warningMessage: string | null = null;
  if (isOverThreshold) {
    warningMessage = `Avertissement Légal (CGI Art. 193/198): Le paiement en espèces (${formatMad(amountTtc)}) dépasse le plafond légal de 10.000 MAD TTC. Un droit de timbre de 0,25% (${formatMad(droitDeTimbre)}) s'applique automatiquement.`;
  } else if (isCash && amountTtc > 0) {
    warningMessage = `Règlement Espèces: Droit de timbre légal de 0,25% (${formatMad(droitDeTimbre)}) appliqué sur le montant TTC.`;
  }

  return {
    isCash,
    isOverThreshold,
    thresholdLimit,
    droitDeTimbre,
    amountTtcWithStampDuty,
    warningMessage
  };
}

export function formatMad(amount: number, showSymbol = true): string {
  const formatted = new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

  return showSymbol ? `${formatted} MAD` : formatted;
}

export function recalculateDocumentTotals(
  items: { quantity: number; unitPriceHt: number; tvaRate: number }[],
  paymentMethod?: string,
  paidAmount = 0
): {
  subtotalHt: number;
  totalTva: number;
  droitDeTimbre: number;
  totalTtc: number;
  remainingAmount: number;
} {
  let subtotalHt = 0;
  let totalTva = 0;

  items.forEach(item => {
    const totalHt = Number((item.quantity * item.unitPriceHt).toFixed(2));
    const totalTvaItem = Number((totalHt * (item.tvaRate / 100)).toFixed(2));
    subtotalHt += totalHt;
    totalTva += totalTvaItem;
  });

  subtotalHt = Number(subtotalHt.toFixed(2));
  totalTva = Number(totalTva.toFixed(2));
  const rawTtc = Number((subtotalHt + totalTva).toFixed(2));

  // 0.25% stamp duty for cash payment
  const droitDeTimbre = paymentMethod === 'cash' ? Number((rawTtc * 0.0025).toFixed(2)) : 0;
  const totalTtc = Number((rawTtc + droitDeTimbre).toFixed(2));
  const remainingAmount = Number((totalTtc - paidAmount).toFixed(2));

  return {
    subtotalHt,
    totalTva,
    droitDeTimbre,
    totalTtc,
    remainingAmount: remainingAmount > 0 ? remainingAmount : 0
  };
}

export interface PayslipResult {
  baseSalary: number;
  cnssEmployee: number;
  amoEmployee: number;
  igrAmount: number;
  netSalary: number;
  cnssEmployer: number;
  amoEmployer: number;
  employerTotalCharges: number;
  totalCostToCompany: number;
}

export function calculateMoroccanPayroll(baseSalary: number): PayslipResult {
  // CNSS & AMO Employee Deductions
  const cnssEmployeeRate = 0.0448; // 4.48%
  const amoEmployeeRate = 0.0226; // 2.26%

  const cnssEmployee = Number((baseSalary * cnssEmployeeRate).toFixed(2));
  const amoEmployee = Number((baseSalary * amoEmployeeRate).toFixed(2));

  // Taxable salary for IGR: Base salary - social contributions (CNSS + AMO)
  const taxableSalary = baseSalary - cnssEmployee - amoEmployee;

  // IGR monthly brackets
  let igrRate = 0;
  let deduction = 0;

  if (taxableSalary <= 2500) {
    igrRate = 0;
    deduction = 0;
  } else if (taxableSalary <= 4166.67) {
    igrRate = 0.10;
    deduction = 250;
  } else if (taxableSalary <= 5000) {
    igrRate = 0.20;
    deduction = 666.67;
  } else if (taxableSalary <= 6666.67) {
    igrRate = 0.30;
    deduction = 1166.67;
  } else if (taxableSalary <= 15000) {
    igrRate = 0.34;
    deduction = 1433.33;
  } else {
    igrRate = 0.38;
    deduction = 2033.33;
  }

  let igrAmount = Number(((taxableSalary * igrRate) - deduction).toFixed(2));
  if (igrAmount < 0) igrAmount = 0;

  const netSalary = Number((baseSalary - cnssEmployee - amoEmployee - igrAmount).toFixed(2));

  // Employer Charges
  const cnssEmployerRate = 0.2010; // 20.10%
  const amoEmployerRate = 0.0411; // 4.11%

  const cnssEmployer = Number((baseSalary * cnssEmployerRate).toFixed(2));
  const amoEmployer = Number((baseSalary * amoEmployerRate).toFixed(2));
  const employerTotalCharges = Number((cnssEmployer + amoEmployer).toFixed(2));
  const totalCostToCompany = Number((baseSalary + employerTotalCharges).toFixed(2));

  return {
    baseSalary,
    cnssEmployee,
    amoEmployee,
    igrAmount,
    netSalary,
    cnssEmployer,
    amoEmployer,
    employerTotalCharges,
    totalCostToCompany
  };
}

export const PCGM_ACCOUNTS = {
  CLIENTS: '34210000',
  FOURNISSEURS: '44110000',
  VENTES_MARCHANDISES: '71110000',
  ACHATS_REVENTE: '61110000',
  TVA_FACTUREE: '44550000',
  TVA_RECUPERABLE: '34550000',
  CAISSE: '51610000',
  BANQUE: '51410000',
  EXPENSES_LOYER: '61310000',
  EXPENSES_EAU_ELEC: '61250000',
  EXPENSES_TRANSPORT: '61420000',
  EXPENSES_SALAIRES: '61710000',
};
