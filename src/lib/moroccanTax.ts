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
