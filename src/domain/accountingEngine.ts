/**
 * SahlBiz - Double-Entry Accounting Engine (PCGM Maroc)
 * 
 * Invariants:
 * - Every journal entry MUST balance: totalDebits === totalCredits (|difference| < 0.001)
 * - Every financial event creates an immutable, balanced, multi-legged accounting entry
 * - Full alignment with Plan Comptable Général Marocain (Classes 1 to 7)
 */

import {
  Account,
  Journal,
  JournalCode,
  JournalEntry,
  JournalLine,
  FiscalPeriod,
  TaxEntry,
  AccountingPayment,
  Reconciliation,
  BusinessDocument,
  Expense,
  Customer,
  Supplier,
  PaymentMethod
} from '../types';

// ============================================================================
// 1. STANDARD MOROCCAN CHART OF ACCOUNTS (PCGM) SEED DEFINITIONS
// ============================================================================

export const STANDARD_PCGM_ACCOUNTS: Omit<Account, 'id' | 'orgId'>[] = [
  // --- CLASSE 1 : FINANCEMENT PERMANENT ---
  {
    code: '11110000',
    name: 'Capital social ou personnel',
    nameAr: 'رأس المال الاجتماعي أو الشخصي',
    type: 'equity',
    accountClass: 1,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Capital initial et apports de l’exploitant'
  },
  {
    code: '11190000',
    name: 'Compte de l’exploitant (Retraits / Apports)',
    nameAr: 'حساب المستغل (سحوبات / مدفوعات)',
    type: 'equity',
    accountClass: 1,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Prélèvements et apports personnels de l’exploitant'
  },
  {
    code: '14810000',
    name: 'Emprunts auprès des établissements de crédit',
    nameAr: 'قروض من مؤسسات الائتمان',
    type: 'liability',
    accountClass: 1,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Crédits bancaires à moyen et long terme'
  },

  // --- CLASSE 2 : ACTIF IMMOBILISÉ ---
  {
    code: '23320000',
    name: 'Matériel et outillage',
    nameAr: 'معدات وأدوات',
    type: 'asset',
    accountClass: 2,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Équipements et matériel d’exploitation'
  },
  {
    code: '23400000',
    name: 'Matériel de transport',
    nameAr: 'معدات النقل',
    type: 'asset',
    accountClass: 2,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Véhicules utilitaires et de livraison'
  },
  {
    code: '23550000',
    name: 'Matériel informatique et caisses',
    nameAr: 'معدات معلوميات ونقاط بيع',
    type: 'asset',
    accountClass: 2,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Terminaux POS, ordinateurs et imprimantes'
  },

  // --- CLASSE 3 : ACTIF CIRCULANT (HORS TRÉSORERIE) ---
  {
    code: '31110000',
    name: 'Marchandises (Stock Magasin)',
    nameAr: 'بضائع (مخزون المحل)',
    type: 'asset',
    accountClass: 3,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Valeur du stock de marchandises'
  },
  {
    code: '34210000',
    name: 'Clients (Créances Kreddy & Factures)',
    nameAr: 'زبناء (ديون الكريدي وفواتير)',
    type: 'asset',
    accountClass: 3,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Créances clients et carnet Kreddy'
  },
  {
    code: '34551000',
    name: 'État - TVA Récupérable sur charges (20%)',
    nameAr: 'الدولة - ضريبة مسترجعة على التكاليف (20%)',
    type: 'asset',
    accountClass: 3,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'TVA déductible sur achats et dépenses d’exploitation (20%)'
  },
  {
    code: '34552000',
    name: 'État - TVA Récupérable sur charges (14%)',
    nameAr: 'الدولة - ضريبة مسترجعة على التكاليف (14%)',
    type: 'asset',
    accountClass: 3,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'TVA déductible taux intermédiaire (14%)'
  },
  {
    code: '34553000',
    name: 'État - TVA Récupérable sur charges (10%)',
    nameAr: 'الدولة - ضريبة مسترجعة على التكاليف (10%)',
    type: 'asset',
    accountClass: 3,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'TVA déductible restauration, hôtellerie (10%)'
  },
  {
    code: '34554000',
    name: 'État - TVA Récupérable sur charges (7%)',
    nameAr: 'الدولة - ضريبة مسترجعة على التكاليف (7%)',
    type: 'asset',
    accountClass: 3,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'TVA déductible produits de première nécessité (7%)'
  },
  {
    code: '34560000',
    name: 'État - Crédit de TVA à reporter',
    nameAr: 'الدولة - فائض الضريبة على القيمة المضافة',
    type: 'asset',
    accountClass: 3,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Crédit de TVA reportable sur les déclarations suivantes'
  },

  // --- CLASSE 4 : PASSIF CIRCULANT (HORS TRÉSORERIE) ---
  {
    code: '44110000',
    name: 'Fournisseurs (Dettes d’achats)',
    nameAr: 'موردون (ديون المشتريات)',
    type: 'liability',
    accountClass: 4,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Dettes envers les fournisseurs de marchandises et services'
  },
  {
    code: '44410000',
    name: 'Personnel - Rémunérations dues (Salaires)',
    nameAr: 'المستخدمون - أجور مستحقة',
    type: 'liability',
    accountClass: 4,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Salaires nets à verser aux employés'
  },
  {
    code: '44430000',
    name: 'CNSS & Organismes sociaux',
    nameAr: 'الصندوق الوطني للضمان الاجتماعي والهيئات',
    type: 'liability',
    accountClass: 4,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Cotisations CNSS + AMO (salariales et patronales)'
  },
  {
    code: '44520000',
    name: 'État - Impôts et taxes retenus à la source (IGR)',
    nameAr: 'الدولة - الضريبة على الدخل المقتطعة',
    type: 'liability',
    accountClass: 4,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Impôt sur le Revenu (IGR) retenu sur salaires'
  },
  {
    code: '44550000',
    name: 'État - TVA Facturée sur Ventes',
    nameAr: 'الدولة - الضريبة على القيمة المضافة المفوتورة',
    type: 'liability',
    accountClass: 4,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'TVA collectée sur ventes de biens et services'
  },
  {
    code: '44580000',
    name: 'État - Droits de Timbre Fiscal (0.25%)',
    nameAr: 'الدولة - حقوق التمبر الجبائي',
    type: 'liability',
    accountClass: 4,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Droit de timbre de 0.25% sur encaissements espèces (CGI)'
  },

  // --- CLASSE 5 : TRÉSORERIE ---
  {
    code: '51410000',
    name: 'Banques (Compte Courant Commercial)',
    nameAr: 'الأبناك (الحساب التجاري)',
    type: 'asset',
    accountClass: 5,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Fonds disponibles sur compte bancaire professionnel'
  },
  {
    code: '51430000',
    name: 'Terminaux Cartes Bancaires (CMI / TPE)',
    nameAr: 'أجهزة الدفع الإلكتروني بالبطاقة',
    type: 'asset',
    accountClass: 5,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Encaissements en attente de télécollecte CMI'
  },
  {
    code: '51610000',
    name: 'Caisse Centrale / Magasin',
    nameAr: 'صندوق المحل المركزي (السيولة)',
    type: 'asset',
    accountClass: 5,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Espèces disponibles en caisse physique'
  },
  {
    code: '51110000',
    name: 'Chèques à encaisser',
    nameAr: 'شيكات للتحصيل',
    type: 'asset',
    accountClass: 5,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Chèques reçus des clients en attente d’encaissement'
  },
  {
    code: '51130000',
    name: 'Effets à encaisser (Traites)',
    nameAr: 'كمبيالات للتحصيل',
    type: 'asset',
    accountClass: 5,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Lettres de change et traites commerciales reçues'
  },

  // --- CLASSE 6 : CHARGES ---
  {
    code: '61110000',
    name: 'Achats de marchandises revendues en l’état',
    nameAr: 'مشتريات بضائع للبيع',
    type: 'expense',
    accountClass: 6,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Coût d’achat hors taxe des marchandises destinées à la revente'
  },
  {
    code: '61220000',
    name: 'Achats de fournitures consommables & emballages',
    nameAr: 'مشتريات لوازم استهلاكية وتغليف',
    type: 'expense',
    accountClass: 6,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Sacs, boîtes d’emballage, rouleaux thermiques de caisse'
  },
  {
    code: '61250000',
    name: 'Achats d’eau et électricité (Lydec/Redal/ONEE)',
    nameAr: 'مصاريف الماء والكهرباء',
    type: 'expense',
    accountClass: 6,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Factures d’électricité, eau et énergie'
  },
  {
    code: '61310000',
    name: 'Locations et charges locatives (Loyer Magasin)',
    nameAr: 'كراء المحل والمستودع',
    type: 'expense',
    accountClass: 6,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Loyer commercial du magasin ou entrepôt'
  },
  {
    code: '61330000',
    name: 'Entretien et réparations',
    nameAr: 'صيانة وإصلاحات',
    type: 'expense',
    accountClass: 6,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Maintenance des locaux et matériels'
  },
  {
    code: '61420000',
    name: 'Transports et déplacements / Livraisons',
    nameAr: 'مصاريف النقل والتوصيل',
    type: 'expense',
    accountClass: 6,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Frais de livraison, carburant et transport'
  },
  {
    code: '61450000',
    name: 'Frais postaux et de télécommunications (Maroc Telecom/Inwi/Orange)',
    nameAr: 'مصاريف الاتصالات والإنترنت',
    type: 'expense',
    accountClass: 6,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Abonnements téléphoniques et internet'
  },
  {
    code: '61470000',
    name: 'Services bancaires et commissions CMI',
    nameAr: 'خدمات بنكية وعمولات الأداء الإلكتروني',
    type: 'expense',
    accountClass: 6,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Commissions TPE/CMI et frais de tenue de compte'
  },
  {
    code: '61610000',
    name: 'Impôts et taxes directs (Taxe Professionnelle / Patente)',
    nameAr: 'ضرائب ورسوم مهنية (البتنتة)',
    type: 'expense',
    accountClass: 6,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Taxe professionnelle et taxes communales'
  },
  {
    code: '61710000',
    name: 'Rémunérations du personnel (Salaires Bruts)',
    nameAr: 'أجور المستخدمين الإجمالية',
    type: 'expense',
    accountClass: 6,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Salaires bruts versés aux salariés'
  },
  {
    code: '61740000',
    name: 'Charges sociales patronales (Cotisations CNSS/AMO)',
    nameAr: 'التحملات الاجتماعية للمشغل (الضمان الاجتماعي)',
    type: 'expense',
    accountClass: 6,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Part patronale CNSS, AMO et accidents du travail'
  },
  {
    code: '61960000',
    name: 'Pertes sur créances irrécouvrables (Kreddy Annulé)',
    nameAr: 'خسائر عن ديون غير قابلة للاسترجاع',
    type: 'expense',
    accountClass: 6,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Pertes sur créances clients irrécouvrables'
  },

  // --- CLASSE 7 : PRODUITS ---
  {
    code: '71110000',
    name: 'Ventes de marchandises au Maroc (HT)',
    nameAr: 'مبيعات البضائع بالمغرب (صافي)',
    type: 'revenue',
    accountClass: 7,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Chiffre d’affaires hors taxe sur revente de marchandises'
  },
  {
    code: '71240000',
    name: 'Prestations de services et travaux',
    nameAr: 'تقديم خدمات وأشغال',
    type: 'revenue',
    accountClass: 7,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Chiffre d’affaires hors taxe sur prestations de services'
  },
  {
    code: '71190000',
    name: 'Rabais, remises et ristournes accordés',
    nameAr: 'تخفيضات ممنوحة للزبناء',
    type: 'revenue',
    accountClass: 7,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Réductions commerciales accordées aux clients'
  },
  {
    code: '75810000',
    name: 'Produits exceptionnels divers',
    nameAr: 'مداخيل استثنائية متنوعة',
    type: 'revenue',
    accountClass: 7,
    currency: 'MAD',
    isSystem: true,
    isActive: true,
    description: 'Gains et produits exceptionnels'
  }
];

export const PCGM_MOROCCAN_STANDARD_ACCOUNTS = STANDARD_PCGM_ACCOUNTS;

// ============================================================================
// 2. STANDARD JOURNALS (JOURNAUX AUXILIAIRES PCGM)
// ============================================================================

export const STANDARD_PCGM_JOURNALS: Omit<Journal, 'id' | 'orgId'>[] = [
  {
    code: 'VE',
    name: 'Journal des Ventes & POS',
    nameAr: 'سجل المبيعات ونقاط البيع',
    type: 'sales'
  },
  {
    code: 'AC',
    name: 'Journal des Achats & Fournisseurs',
    nameAr: 'سجل المشتريات والموردين',
    type: 'purchases'
  },
  {
    code: 'CA',
    name: 'Journal de Caisse (Espèces)',
    nameAr: 'سجل الصندوق (السيولة)',
    type: 'cash',
    defaultAccountId: '51610000'
  },
  {
    code: 'BQ',
    name: 'Journal de Banque & CMI',
    nameAr: 'سجل البنك والبطاقات',
    type: 'bank',
    defaultAccountId: '51410000'
  },
  {
    code: 'OD',
    name: 'Journal des Opérations Diverses & Paie',
    nameAr: 'سجل العمليات المتنوعة والأجور',
    type: 'general'
  },
  {
    code: 'AN',
    name: 'Journal des À-Nouveaux (Bilan d’ouverture)',
    nameAr: 'سجل الرصيد الافتتاحي',
    type: 'opening'
  }
];

// ============================================================================
// 3. INVARIANT VALIDATOR: VERIFY DOUBLE-ENTRY BALANCE
// ============================================================================

export interface BalanceValidationResult {
  isBalanced: boolean;
  totalDebit: number;
  totalCredit: number;
  difference: number;
  errorMessage?: string;
}

export function validateJournalEntryBalance(lines: JournalLine[]): BalanceValidationResult {
  const totalDebit = Number(lines.reduce((sum, line) => sum + (line.debit || 0), 0).toFixed(2));
  const totalCredit = Number(lines.reduce((sum, line) => sum + (line.credit || 0), 0).toFixed(2));
  const difference = Number(Math.abs(totalDebit - totalCredit).toFixed(2));

  // Precision tolerance: 0.001 MAD
  const isBalanced = difference < 0.01 && lines.length >= 2;

  let errorMessage: string | undefined;
  if (lines.length < 2) {
    errorMessage = "Une écriture comptable doit comporter au moins 2 lignes (un Débit et un Crédit).";
  } else if (!isBalanced) {
    errorMessage = `Écriture déséquilibrée: Total Débit (${totalDebit.toFixed(2)} MAD) !== Total Crédit (${totalCredit.toFixed(2)} MAD). Écart: ${difference.toFixed(2)} MAD. Invariant violé.`;
  }

  return {
    isBalanced,
    totalDebit,
    totalCredit,
    difference,
    errorMessage
  };
}

// ============================================================================
// 4. FISCAL PERIOD GENERATOR
// ============================================================================

export function generateFiscalPeriodsForYear(year: number, orgId: string): FiscalPeriod[] {
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  return monthNames.map((name, index) => {
    const month = index + 1;
    const monthStr = month.toString().padStart(2, '0');
    const code = `${year}-${monthStr}`;
    const daysInMonth = new Date(year, month, 0).getDate();

    return {
      id: `fp-${orgId}-${code}`,
      year,
      month,
      code,
      name: `${name} ${year}`,
      startDate: `${year}-${monthStr}-01`,
      endDate: `${year}-${monthStr}-${daysInMonth.toString().padStart(2, '0')}`,
      status: 'open',
      orgId
    };
  });
}

// ============================================================================
// 5. AUTOMATED DOUBLE-ENTRY GENERATION FROM BUSINESS EVENTS
// ============================================================================

/**
 * Generates balanced double-entry accounting records for a Sale (Invoice or POS Sale).
 *
 * Example Rule:
 * Dr Cash (51610000) or Bank (51410000) or Accounts Receivable / Clients (34210000) [Total TTC + Timbre]
 * Cr Revenue / Ventes de Marchandises (71110000) [Subtotal HT]
 * Cr VAT Payable / TVA Facturée (44550000) [Total TVA]
 * Cr Stamp Duty / Droits de Timbre (44580000) [If cash payment]
 */
export function generateSaleJournalEntry(params: {
  docNumber: string;
  docId: string;
  date: string;
  subtotalHt: number;
  totalTva: number;
  totalTtc: number;
  droitDeTimbre?: number;
  paymentMethod?: PaymentMethod | string;
  isCreditSale?: boolean;
  customerId?: string;
  customerName: string;
  customerIce?: string;
  orgId: string;
  postedBy: string;
}): JournalEntry {
  const {
    docNumber,
    docId,
    date,
    subtotalHt,
    totalTva,
    totalTtc,
    droitDeTimbre = 0,
    paymentMethod = 'cash',
    isCreditSale = false,
    customerId,
    customerName,
    orgId,
    postedBy
  } = params;

  const fiscalPeriodId = date.slice(0, 7); // e.g. "2026-08"
  const lines: JournalLine[] = [];

  // Determine Debit Account
  let debitAccountCode = '34210000';
  let debitAccountName = `Clients - ${customerName}`;
  let journalCode: JournalCode = 'VE';

  if (isCreditSale || paymentMethod === 'kreddy') {
    debitAccountCode = '34210000';
    debitAccountName = `Clients (Créance Kreddy) - ${customerName}`;
    journalCode = 'VE';
  } else if (paymentMethod === 'cash') {
    debitAccountCode = '51610000';
    debitAccountName = 'Caisse Centrale (Espèces)';
    journalCode = 'VE';
  } else if (paymentMethod === 'cmi_card') {
    debitAccountCode = '51430000';
    debitAccountName = 'Terminaux Cartes CMI';
    journalCode = 'VE';
  } else if (paymentMethod === 'transfer' || paymentMethod === 'bank_transfer') {
    debitAccountCode = '51410000';
    debitAccountName = 'Banque (Virement Reçu)';
    journalCode = 'VE';
  } else if (paymentMethod === 'check') {
    debitAccountCode = '51110000';
    debitAccountName = 'Chèques à encaisser';
    journalCode = 'VE';
  } else if (paymentMethod === 'traite') {
    debitAccountCode = '51130000';
    debitAccountName = 'Effets à encaisser (Traite)';
    journalCode = 'VE';
  }

  const grandTotal = Number((totalTtc + (paymentMethod === 'cash' ? droitDeTimbre : 0)).toFixed(2));

  // 1. DEBIT: Asset (Cash/Bank/Receivable)
  lines.push({
    id: `jl-dr-${docId}`,
    accountId: `acc-${debitAccountCode}`,
    accountCode: debitAccountCode,
    accountName: debitAccountName,
    debit: grandTotal,
    credit: 0,
    description: `Facture N° ${docNumber} - ${customerName}`,
    partnerId: customerId,
    partnerType: 'customer',
    partnerName: customerName
  });

  // 2. CREDIT: Revenue (71110000)
  lines.push({
    id: `jl-cr-rev-${docId}`,
    accountId: 'acc-71110000',
    accountCode: '71110000',
    accountName: 'Ventes de marchandises au Maroc (HT)',
    debit: 0,
    credit: Number(subtotalHt.toFixed(2)),
    description: `Chiffre d'affaires HT Facture N° ${docNumber}`
  });

  // 3. CREDIT: VAT Payable (44550000)
  if (totalTva > 0) {
    lines.push({
      id: `jl-cr-tva-${docId}`,
      accountId: 'acc-44550000',
      accountCode: '44550000',
      accountName: 'État - TVA Facturée sur Ventes',
      debit: 0,
      credit: Number(totalTva.toFixed(2)),
      description: `TVA Facturée Facture N° ${docNumber}`
    });
  }

  // 4. CREDIT: Stamp Duty (44580000) if cash payment
  if (paymentMethod === 'cash' && droitDeTimbre > 0) {
    lines.push({
      id: `jl-cr-timbre-${docId}`,
      accountId: 'acc-44580000',
      accountCode: '44580000',
      accountName: 'État - Droits de Timbre Fiscal (0.25%)',
      debit: 0,
      credit: Number(droitDeTimbre.toFixed(2)),
      description: `Droit de timbre 0.25% sur espèces Facture N° ${docNumber}`
    });
  }

  const balanceCheck = validateJournalEntryBalance(lines);
  if (!balanceCheck.isBalanced) {
    throw new Error(`CRITICAL: Unbalanced sale journal entry generated for doc ${docNumber}. ${balanceCheck.errorMessage}`);
  }

  return {
    id: `je-sale-${docId}`,
    entryNumber: `VE-${date.replace(/-/g, '')}-${docNumber.replace(/[^a-zA-Z0-9]/g, '')}`,
    journalId: `journal-${journalCode}`,
    journalCode,
    fiscalPeriodId,
    date,
    referenceType: 'sale_invoice',
    referenceId: docId,
    referenceNumber: docNumber,
    description: `Vente Facture N° ${docNumber} - ${customerName}`,
    lines,
    totalDebit: balanceCheck.totalDebit,
    totalCredit: balanceCheck.totalCredit,
    status: 'posted',
    isBalanced: true,
    postedAt: new Date().toISOString(),
    postedBy,
    orgId
  };
}

/**
 * Generates balanced double-entry accounting records for a Purchase or Supplier Invoice.
 *
 * Example Rule:
 * Dr Inventory / Merchandise (61110000) [Amount HT]
 * Dr VAT Recoverable / TVA Récupérable (34551000) [TVA Amount]
 * Cr Accounts Payable / Fournisseurs (44110000) or Cash/Bank [Total TTC]
 */
export function generatePurchaseJournalEntry(params: {
  purchaseId: string;
  purchaseNumber: string;
  date: string;
  amountHt: number;
  tvaAmount: number;
  amountTtc: number;
  tvaRate?: number;
  supplierId?: string;
  supplierName: string;
  supplierIce?: string;
  paymentMethod?: PaymentMethod | string;
  isPaid?: boolean;
  orgId: string;
  postedBy: string;
}): JournalEntry {
  const {
    purchaseId,
    purchaseNumber,
    date,
    amountHt,
    tvaAmount,
    amountTtc,
    tvaRate = 20,
    supplierId,
    supplierName,
    paymentMethod = 'kreddy',
    isPaid = false,
    orgId,
    postedBy
  } = params;

  const fiscalPeriodId = date.slice(0, 7);
  const lines: JournalLine[] = [];

  // 1. DEBIT: Purchases of Merchandise (61110000)
  lines.push({
    id: `jl-dr-purch-${purchaseId}`,
    accountId: 'acc-61110000',
    accountCode: '61110000',
    accountName: 'Achats de marchandises revendues en l’état',
    debit: Number(amountHt.toFixed(2)),
    credit: 0,
    description: `Achat N° ${purchaseNumber} - ${supplierName}`,
    partnerId: supplierId,
    partnerType: 'supplier',
    partnerName: supplierName
  });

  // 2. DEBIT: VAT Recoverable
  if (tvaAmount > 0) {
    let tvaAccountCode = '34551000';
    if (tvaRate === 14) tvaAccountCode = '34552000';
    else if (tvaRate === 10) tvaAccountCode = '34553000';
    else if (tvaRate === 7) tvaAccountCode = '34554000';

    lines.push({
      id: `jl-dr-tva-${purchaseId}`,
      accountId: `acc-${tvaAccountCode}`,
      accountCode: tvaAccountCode,
      accountName: `État - TVA Récupérable sur charges (${tvaRate}%)`,
      debit: Number(tvaAmount.toFixed(2)),
      credit: 0,
      description: `TVA Récupérable Achat N° ${purchaseNumber} (${supplierName})`
    });
  }

  // 3. CREDIT: Supplier Liability (44110000) or Cash/Bank
  let creditAccountCode = '44110000';
  let creditAccountName = `Fournisseurs - ${supplierName}`;

  if (isPaid) {
    if (paymentMethod === 'cash') {
      creditAccountCode = '51610000';
      creditAccountName = 'Caisse Centrale (Espèces)';
    } else if (paymentMethod === 'transfer' || paymentMethod === 'bank_transfer') {
      creditAccountCode = '51410000';
      creditAccountName = 'Banque (Virement Émis)';
    } else if (paymentMethod === 'check') {
      creditAccountCode = '51410000';
      creditAccountName = 'Banque (Chèque Émis)';
    }
  }

  lines.push({
    id: `jl-cr-supp-${purchaseId}`,
    accountId: `acc-${creditAccountCode}`,
    accountCode: creditAccountCode,
    accountName: creditAccountName,
    debit: 0,
    credit: Number(amountTtc.toFixed(2)),
    description: `Règlement/Dette Achat N° ${purchaseNumber} - ${supplierName}`,
    partnerId: supplierId,
    partnerType: 'supplier',
    partnerName: supplierName
  });

  const balanceCheck = validateJournalEntryBalance(lines);
  if (!balanceCheck.isBalanced) {
    throw new Error(`CRITICAL: Unbalanced purchase journal entry generated for purchase ${purchaseNumber}. ${balanceCheck.errorMessage}`);
  }

  return {
    id: `je-purch-${purchaseId}`,
    entryNumber: `AC-${date.replace(/-/g, '')}-${purchaseNumber.replace(/[^a-zA-Z0-9]/g, '')}`,
    journalId: 'journal-AC',
    journalCode: 'AC',
    fiscalPeriodId,
    date,
    referenceType: 'purchase_invoice',
    referenceId: purchaseId,
    referenceNumber: purchaseNumber,
    description: `Achat Fournisseur ${supplierName} (N° ${purchaseNumber})`,
    lines,
    totalDebit: balanceCheck.totalDebit,
    totalCredit: balanceCheck.totalCredit,
    status: 'posted',
    isBalanced: true,
    postedAt: new Date().toISOString(),
    postedBy,
    orgId
  };
}

/**
 * Generates balanced double-entry accounting records for an Expense.
 *
 * Example Rule:
 * Dr Expense Account (6131 Loyer, 6125 Eau/Elec, 6142 Transport, 6122 Fournitures, etc.) [Amount HT]
 * Dr VAT Recoverable (34551000) [TVA Amount]
 * Cr Cash (51610000) or Bank (51410000) or Accounts Payable (44110000) [Total TTC]
 */
export function generateExpenseJournalEntry(params: {
  expense: Expense;
  orgId: string;
  postedBy: string;
}): JournalEntry {
  const { expense, orgId, postedBy } = params;
  const fiscalPeriodId = expense.date.slice(0, 7);
  const lines: JournalLine[] = [];

  // Map category to PCGM Account
  let expenseAccountCode = '61110000';
  let expenseAccountName = 'Achats de matières et fournitures consommables';

  switch (expense.category as string) {
    case 'loyer':
      expenseAccountCode = '61310000';
      expenseAccountName = 'Locations et charges locatives (Loyer Magasin)';
      break;
    case 'eau_electricite':
    case 'electricite':
      expenseAccountCode = '61250000';
      expenseAccountName = 'Achats d’eau et électricité (Lydec/Redal/ONEE)';
      break;
    case 'transport':
      expenseAccountCode = '61420000';
      expenseAccountName = 'Transports et déplacements / Livraisons';
      break;
    case 'salaires':
      expenseAccountCode = '61710000';
      expenseAccountName = 'Rémunérations du personnel (Salaires)';
      break;
    case 'telecom':
      expenseAccountCode = '61450000';
      expenseAccountName = 'Frais postaux et de télécommunications';
      break;
    case 'entretien':
    case 'entretiens':
      expenseAccountCode = '61330000';
      expenseAccountName = 'Entretien et réparations';
      break;
    case 'taxes':
    case 'impots':
      expenseAccountCode = '61610000';
      expenseAccountName = 'Impôts et taxes directs (Taxe Pro / Taxes locales)';
      break;
    case 'fournitures':
    case 'matieres':
      expenseAccountCode = '61220000';
      expenseAccountName = 'Achats de fournitures consommables & emballages';
      break;
    case 'marketing':
      expenseAccountCode = '61440000';
      expenseAccountName = 'Publicité, publications et relations publiques';
      break;
    default:
      expenseAccountCode = '61220000';
      expenseAccountName = `Charges d’exploitation (${expense.category || 'divers'})`;
      break;
  }

  // 1. DEBIT: Expense Charge Account
  lines.push({
    id: `jl-dr-exp-${expense.id}`,
    accountId: `acc-${expenseAccountCode}`,
    accountCode: expenseAccountCode,
    accountName: expenseAccountName,
    debit: Number(expense.amountHt.toFixed(2)),
    credit: 0,
    description: expense.title,
    partnerName: expense.vendorName || (expense as any).supplierName || 'Divers'
  });

  // 2. DEBIT: Recoverable VAT (if applicable)
  if (expense.tvaAmount > 0) {
    lines.push({
      id: `jl-dr-tva-exp-${expense.id}`,
      accountId: 'acc-34551000',
      accountCode: '34551000',
      accountName: `État - TVA Récupérable sur charges (${expense.tvaRate}%)`,
      debit: Number(expense.tvaAmount.toFixed(2)),
      credit: 0,
      description: `TVA sur ${expense.title}`
    });
  }

  // 3. CREDIT: Payment Source (Cash / Bank / Supplier)
  let paymentAccountCode = '51610000';
  let paymentAccountName = 'Caisse Centrale (Espèces)';
  let journalCode: JournalCode = 'AC';

  const method = (expense.paymentMethod as string) || 'cash';
  if (method === 'bank_transfer' || method === 'transfer' || method === 'cmi' || method === 'cmi_card') {
    paymentAccountCode = '51410000';
    paymentAccountName = 'Banque (Règlement Virement/Carte)';
    journalCode = 'BQ';
  } else if (method === 'check' || method === 'traite') {
    paymentAccountCode = '51410000';
    paymentAccountName = 'Banque (Chèque/Effet Émis)';
    journalCode = 'BQ';
  } else if (method === 'cash') {
    paymentAccountCode = '51610000';
    paymentAccountName = 'Caisse Centrale (Espèces)';
    journalCode = 'CA';
  } else {
    paymentAccountCode = '44110000';
    paymentAccountName = 'Fournisseurs (Dette d\'exploitation)';
    journalCode = 'AC';
  }

  lines.push({
    id: `jl-cr-pay-exp-${expense.id}`,
    accountId: `acc-${paymentAccountCode}`,
    accountCode: paymentAccountCode,
    accountName: paymentAccountName,
    debit: 0,
    credit: Number(expense.amountTtc.toFixed(2)),
    description: `Règlement ${expense.title}`
  });

  const balanceCheck = validateJournalEntryBalance(lines);
  if (!balanceCheck.isBalanced) {
    throw new Error(`CRITICAL: Unbalanced expense journal entry for expense ${expense.id}. ${balanceCheck.errorMessage}`);
  }

  return {
    id: `je-exp-${expense.id}`,
    entryNumber: `AC-${expense.date.replace(/-/g, '')}-${expense.id.slice(-6).toUpperCase()}`,
    journalId: `journal-${journalCode}`,
    journalCode,
    fiscalPeriodId,
    date: expense.date,
    referenceType: 'expense',
    referenceId: expense.id,
    referenceNumber: expense.title,
    description: `Dépense: ${expense.title} (${expense.category})`,
    lines,
    totalDebit: balanceCheck.totalDebit,
    totalCredit: balanceCheck.totalCredit,
    status: 'posted',
    isBalanced: true,
    postedAt: new Date().toISOString(),
    postedBy,
    orgId
  };
}

/**
 * Generates balanced double-entry accounting records for a Customer Payment (Settling Kreddy/Invoice)
 *
 * Example Rule:
 * Dr Cash (51610000) or Bank (51410000) [Amount]
 * Cr Accounts Receivable / Clients (34210000) [Amount]
 */
export function generateCustomerPaymentJournalEntry(params: {
  paymentId: string;
  customerId?: string;
  customerName?: string;
  paymentNumber?: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod | string;
  referenceDocNumber?: string;
  reference?: string;
  orgId: string;
  postedBy: string;
  notes?: string;
}): JournalEntry {
  const {
    paymentId,
    customerId,
    customerName = 'Client',
    paymentNumber,
    amount,
    date,
    paymentMethod,
    referenceDocNumber,
    reference,
    orgId,
    postedBy,
    notes
  } = params;

  const fiscalPeriodId = date.slice(0, 7);
  const lines: JournalLine[] = [];

  let debitAccountCode = '51610000';
  let debitAccountName = 'Caisse Centrale (Espèces)';
  let journalCode: JournalCode = 'CA';

  if (paymentMethod === 'transfer' || paymentMethod === 'bank_transfer') {
    debitAccountCode = '51410000';
    debitAccountName = 'Banque (Virement Reçu)';
    journalCode = 'BQ';
  } else if (paymentMethod === 'cmi_card') {
    debitAccountCode = '51430000';
    debitAccountName = 'Terminaux Cartes CMI';
    journalCode = 'BQ';
  } else if (paymentMethod === 'check') {
    debitAccountCode = '51110000';
    debitAccountName = 'Chèques à encaisser';
    journalCode = 'BQ';
  } else if (paymentMethod === 'traite') {
    debitAccountCode = '51130000';
    debitAccountName = 'Effets à encaisser (Traites)';
    journalCode = 'OD';
  }

  // 1. DEBIT: Cash / Bank
  lines.push({
    id: `jl-dr-pay-${paymentId}`,
    accountId: `acc-${debitAccountCode}`,
    accountCode: debitAccountCode,
    accountName: debitAccountName,
    debit: Number(amount.toFixed(2)),
    credit: 0,
    description: `Encaissement Règlement Client: ${customerName} ${referenceDocNumber ? `(Réf: ${referenceDocNumber})` : ''}`,
    partnerId: customerId,
    partnerType: 'customer',
    partnerName: customerName
  });

  // 2. CREDIT: Clients (34210000)
  lines.push({
    id: `jl-cr-cust-${paymentId}`,
    accountId: 'acc-34210000',
    accountCode: '34210000',
    accountName: `Clients (Kreddy Réglé) - ${customerName}`,
    debit: 0,
    credit: Number(amount.toFixed(2)),
    description: `Extinction de créance client: ${customerName} ${notes ? `- ${notes}` : ''}`,
    partnerId: customerId,
    partnerType: 'customer',
    partnerName: customerName
  });

  const balanceCheck = validateJournalEntryBalance(lines);
  if (!balanceCheck.isBalanced) {
    throw new Error(`CRITICAL: Unbalanced payment journal entry. ${balanceCheck.errorMessage}`);
  }

  return {
    id: `je-pay-${paymentId}`,
    entryNumber: `${journalCode}-${date.replace(/-/g, '')}-${paymentId.slice(-6).toUpperCase()}`,
    journalId: `journal-${journalCode}`,
    journalCode,
    fiscalPeriodId,
    date,
    referenceType: 'payment_customer',
    referenceId: paymentId,
    referenceNumber: referenceDocNumber,
    description: `Encaissement Règlement Kreddy/Client: ${customerName}`,
    lines,
    totalDebit: balanceCheck.totalDebit,
    totalCredit: balanceCheck.totalCredit,
    status: 'posted',
    isBalanced: true,
    postedAt: new Date().toISOString(),
    postedBy,
    orgId
  };
}

/**
 * Generates balanced double-entry accounting records for a Payroll run (Fiche de Paie)
 *
 * Example Rule:
 * Dr Gross Salaries / Rémunérations (61710000) [Brut]
 * Dr Employer Social Charges / CNSS Patronale (61740000) [CNSS Patronale]
 * Cr Net Salary Payable / Personnel Rémunérations Dues (44410000) [Net à Payer]
 * Cr CNSS Contributions / CNSS & AMO Dues (44430000) [Salariale + Patronale]
 * Cr Income Tax Withholding / État IGR (44520000) [IGR Retenu]
 */
export function generatePayrollJournalEntry(params: {
  payslipId: string;
  employeeId: string;
  employeeName: string;
  month: string; // "2026-08"
  date: string;
  baseSalary: number;
  cnssEmployee: number;
  amoEmployee: number;
  igrAmount: number;
  netSalary: number;
  cnssEmployer: number;
  amoEmployer: number;
  orgId: string;
  postedBy: string;
}): JournalEntry {
  const {
    payslipId,
    employeeId,
    employeeName,
    month,
    date,
    baseSalary,
    cnssEmployee,
    amoEmployee,
    igrAmount,
    netSalary,
    cnssEmployer,
    amoEmployer,
    orgId,
    postedBy
  } = params;

  const totalEmployerCharges = Number((cnssEmployer + amoEmployer).toFixed(2));
  const totalSocialDues = Number((cnssEmployee + amoEmployee + cnssEmployer + amoEmployer).toFixed(2));
  const lines: JournalLine[] = [];

  // 1. DEBIT: Gross Salaries Charge (61710000)
  lines.push({
    id: `jl-dr-sal-${payslipId}`,
    accountId: 'acc-61710000',
    accountCode: '61710000',
    accountName: 'Rémunérations du personnel (Salaires Bruts)',
    debit: Number(baseSalary.toFixed(2)),
    credit: 0,
    description: `Salaire brut ${employeeName} (${month})`,
    partnerId: employeeId,
    partnerType: 'employee',
    partnerName: employeeName
  });

  // 2. DEBIT: Employer Social Charges (61740000)
  if (totalEmployerCharges > 0) {
    lines.push({
      id: `jl-dr-patr-${payslipId}`,
      accountId: 'acc-61740000',
      accountCode: '61740000',
      accountName: 'Charges sociales patronales (Cotisations CNSS/AMO)',
      debit: totalEmployerCharges,
      credit: 0,
      description: `Part patronale CNSS/AMO ${employeeName} (${month})`,
      partnerId: employeeId,
      partnerType: 'employee',
      partnerName: employeeName
    });
  }

  // 3. CREDIT: Net Salary Payable to Employee (44410000)
  lines.push({
    id: `jl-cr-net-${payslipId}`,
    accountId: 'acc-44410000',
    accountCode: '44410000',
    accountName: 'Personnel - Rémunérations dues (Salaires Nets)',
    debit: 0,
    credit: Number(netSalary.toFixed(2)),
    description: `Net à payer à ${employeeName} (${month})`,
    partnerId: employeeId,
    partnerType: 'employee',
    partnerName: employeeName
  });

  // 4. CREDIT: Total Social Security (CNSS + AMO salariales et patronales) (44430000)
  if (totalSocialDues > 0) {
    lines.push({
      id: `jl-cr-cnss-${payslipId}`,
      accountId: 'acc-44430000',
      accountCode: '44430000',
      accountName: 'CNSS & Organismes sociaux (Cotisations dues)',
      debit: 0,
      credit: totalSocialDues,
      description: `Cotisations CNSS & AMO ${month} (${employeeName})`
    });
  }

  // 5. CREDIT: Income Tax Withholding / IGR (44520000)
  if (igrAmount > 0) {
    lines.push({
      id: `jl-cr-igr-${payslipId}`,
      accountId: 'acc-44520000',
      accountCode: '44520000',
      accountName: 'État - Impôts et taxes retenus à la source (IGR)',
      debit: 0,
      credit: Number(igrAmount.toFixed(2)),
      description: `Retenue à la source IGR ${month} (${employeeName})`
    });
  }

  const balanceCheck = validateJournalEntryBalance(lines);
  if (!balanceCheck.isBalanced) {
    throw new Error(`CRITICAL: Unbalanced payroll journal entry. ${balanceCheck.errorMessage}`);
  }

  return {
    id: `je-payr-${payslipId}`,
    entryNumber: `OD-${date.replace(/-/g, '')}-PAIE-${employeeName.slice(0, 3).toUpperCase()}`,
    journalId: 'journal-OD',
    journalCode: 'OD',
    fiscalPeriodId: month,
    date,
    referenceType: 'payroll',
    referenceId: payslipId,
    referenceNumber: `PAIE-${month}`,
    description: `Fiche de Paie & Charges Sociales ${employeeName} (${month})`,
    lines,
    totalDebit: balanceCheck.totalDebit,
    totalCredit: balanceCheck.totalCredit,
    status: 'posted',
    isBalanced: true,
    postedAt: new Date().toISOString(),
    postedBy,
    orgId
  };
}

/**
 * Generates balanced double-entry accounting records for a Credit Note / Avoir Client
 *
 * Example Rule:
 * Dr Sales / RRR accordés (71110000 / 71190000) [Amount HT]
 * Dr VAT Collected (44550000) [Amount TVA]
 * Cr Accounts Receivable / Clients (34210000) [Amount TTC]
 */
export function generateCreditNoteJournalEntry(params: {
  creditNoteNumber: string;
  creditNoteId: string;
  invoiceNumber?: string;
  date: string;
  amountHt: number;
  tvaAmount: number;
  amountTtc: number;
  customerName?: string;
  customerId?: string;
  reason?: string;
  orgId: string;
  postedBy: string;
}): JournalEntry {
  const {
    creditNoteNumber,
    creditNoteId,
    invoiceNumber,
    date,
    amountHt,
    tvaAmount,
    amountTtc,
    customerName = 'Client',
    customerId,
    reason,
    orgId,
    postedBy
  } = params;

  const fiscalPeriodId = date.slice(0, 7);
  const lines: JournalLine[] = [];

  // 1. DEBIT: Sales / Rebates (71110000)
  lines.push({
    id: `jl-dr-cn-sales-${creditNoteId}`,
    accountId: 'acc-71110000',
    accountCode: '71110000',
    accountName: 'Ventes de marchandises au Maroc (Avoir / Annulation CA)',
    debit: Number(amountHt.toFixed(2)),
    credit: 0,
    description: `Avoir N°${creditNoteNumber} ${invoiceNumber ? `sur Facture ${invoiceNumber}` : ''} - ${reason || 'Avoir accordé'}`,
    partnerId: customerId,
    partnerType: 'customer',
    partnerName: customerName
  });

  // 2. DEBIT: VAT Output Reversal (44550000)
  if (tvaAmount > 0) {
    lines.push({
      id: `jl-dr-cn-tva-${creditNoteId}`,
      accountId: 'acc-44550000',
      accountCode: '44550000',
      accountName: 'État - TVA Facturée (Régularisation / Débit TVA Avoir)',
      debit: Number(tvaAmount.toFixed(2)),
      credit: 0,
      description: `Régularisation TVA Avoir N°${creditNoteNumber}`
    });
  }

  // 3. CREDIT: Customer Receivables (34210000)
  lines.push({
    id: `jl-cr-cn-cust-${creditNoteId}`,
    accountId: 'acc-34210000',
    accountCode: '34210000',
    accountName: 'Clients (Diminution Créance)',
    debit: 0,
    credit: Number(amountTtc.toFixed(2)),
    description: `Crédit Client ${customerName} - Avoir ${creditNoteNumber}`,
    partnerId: customerId,
    partnerType: 'customer',
    partnerName: customerName
  });

  const balanceCheck = validateJournalEntryBalance(lines);
  if (!balanceCheck.isBalanced) {
    throw new Error(`CRITICAL: Unbalanced credit note entry ${creditNoteNumber}. ${balanceCheck.errorMessage}`);
  }

  return {
    id: `je-cn-${creditNoteId}`,
    entryNumber: creditNoteNumber,
    journalId: 'journal-VE',
    journalCode: 'VE',
    fiscalPeriodId,
    date,
    referenceType: 'credit_note',
    referenceId: creditNoteId,
    referenceNumber: creditNoteNumber,
    description: `Avoir Client N°${creditNoteNumber} - ${customerName}`,
    lines,
    totalDebit: balanceCheck.totalDebit,
    totalCredit: balanceCheck.totalCredit,
    status: 'posted',
    isBalanced: true,
    postedAt: new Date().toISOString(),
    postedBy,
    orgId
  };
}

// ============================================================================
// 6. FINANCIAL STATEMENTS & ACCOUNTING REPORTS GENERATOR (PCGM)
// ============================================================================

export interface GeneralLedgerAccount {
  accountCode: string;
  accountName: string;
  accountClass: number;
  accountType: string;
  totalDebit: number;
  totalCredit: number;
  netDebitBalance: number;
  netCreditBalance: number;
  closingBalance: number;
  entries: {
    entryId: string;
    entryNumber: string;
    date: string;
    journalCode: string;
    description: string;
    partnerName?: string;
    debit: number;
    credit: number;
    runningBalance: number;
  }[];
}

export function generateGeneralLedger(
  arg1: JournalEntry[] | Account[],
  arg2?: Account[] | JournalEntry[],
  filterPeriodId?: string
): GeneralLedgerAccount[] {
  let entries: JournalEntry[] = [];
  let accounts: Account[] = [];

  if (Array.isArray(arg1) && arg1.length > 0 && 'lines' in arg1[0]) {
    entries = arg1 as JournalEntry[];
    accounts = (arg2 as Account[]) || (STANDARD_PCGM_ACCOUNTS as unknown as Account[]);
  } else if (Array.isArray(arg1) && arg1.length > 0 && 'code' in arg1[0]) {
    accounts = arg1 as Account[];
    entries = (arg2 as JournalEntry[]) || [];
  } else if (Array.isArray(arg2) && arg2.length > 0 && 'lines' in arg2[0]) {
    entries = arg2 as JournalEntry[];
    accounts = (arg1 as Account[]) || (STANDARD_PCGM_ACCOUNTS as unknown as Account[]);
  } else {
    accounts = (arg1 as Account[]) || (STANDARD_PCGM_ACCOUNTS as unknown as Account[]);
    entries = (arg2 as JournalEntry[]) || [];
  }

  const activeEntries = filterPeriodId
    ? entries.filter(e => e.fiscalPeriodId === filterPeriodId || e.date.startsWith(filterPeriodId))
    : entries;

  return accounts
    .map(acc => {
      let runningBalance = 0;
      let totalDebit = 0;
      let totalCredit = 0;
      const accountLines: any[] = [];

      // Sort chronological
      const sortedEntries = [...activeEntries].sort((a, b) => a.date.localeCompare(b.date));

      sortedEntries.forEach(entry => {
        entry.lines?.forEach(line => {
          if (line.accountCode === acc.code) {
            totalDebit += line.debit;
            totalCredit += line.credit;

            // In PCGM: Classes 2, 3, 5, 6 are Asset/Expense (Debit positive)
            // Classes 1, 4, 7 are Liability/Equity/Revenue (Credit positive)
            const isDebitNormal = [2, 3, 5, 6].includes(acc.accountClass || (acc.class as number) || 3);
            if (isDebitNormal) {
              runningBalance += line.debit - line.credit;
            } else {
              runningBalance += line.credit - line.debit;
            }

            accountLines.push({
              entryId: entry.id,
              entryNumber: entry.entryNumber,
              date: entry.date,
              journalCode: entry.journalCode,
              description: line.description || entry.description,
              partnerName: line.partnerName,
              debit: line.debit,
              credit: line.credit,
              runningBalance: Number(runningBalance.toFixed(2))
            });
          }
        });
      });

      totalDebit = Number(totalDebit.toFixed(2));
      totalCredit = Number(totalCredit.toFixed(2));

      const netDebitBalance = totalDebit > totalCredit ? Number((totalDebit - totalCredit).toFixed(2)) : 0;
      const netCreditBalance = totalCredit > totalDebit ? Number((totalCredit - totalDebit).toFixed(2)) : 0;
      const closingBalance = Number(runningBalance.toFixed(2));

      return {
        accountCode: acc.code,
        accountName: acc.name,
        accountClass: acc.accountClass || (acc.class as number) || 0,
        accountType: acc.type,
        totalDebit,
        totalCredit,
        netDebitBalance,
        netCreditBalance,
        closingBalance,
        entries: accountLines
      };
    })
    .filter(rep => rep.entries.length > 0 || rep.totalDebit > 0 || rep.totalCredit > 0);
}

export const generateGrandLivreReport = generateGeneralLedger;

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountClass: number;
  totalDebit: number;
  totalCredit: number;
  debitBalance: number;
  creditBalance: number;
  totalDebitMvt?: number;
  totalCreditMvt?: number;
  soldeDebiteur?: number;
  soldeCrediteur?: number;
}

export interface TrialBalanceReport {
  rows: TrialBalanceRow[];
  items: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  totalDebitBalance: number;
  totalCreditBalance: number;
  totalDebitMouvements: number;
  totalCreditMouvements: number;
  totalSoldesDebiteurs: number;
  totalSoldesCrediteurs: number;
  difference: number;
  isBalanced: boolean;
}

export function generateTrialBalance(
  arg1: JournalEntry[] | Account[],
  arg2?: Account[] | JournalEntry[],
  filterPeriodId?: string
): TrialBalanceReport {
  const gl = generateGeneralLedger(arg1 as any, arg2 as any, filterPeriodId);

  const rows: TrialBalanceRow[] = gl.map(g => ({
    accountCode: g.accountCode,
    accountName: g.accountName,
    accountClass: g.accountClass,
    totalDebit: g.totalDebit,
    totalCredit: g.totalCredit,
    debitBalance: g.netDebitBalance,
    creditBalance: g.netCreditBalance,
    totalDebitMvt: g.totalDebit,
    totalCreditMvt: g.totalCredit,
    soldeDebiteur: g.netDebitBalance,
    soldeCrediteur: g.netCreditBalance
  }));

  const totalDebit = Number(rows.reduce((s, i) => s + i.totalDebit, 0).toFixed(2));
  const totalCredit = Number(rows.reduce((s, i) => s + i.totalCredit, 0).toFixed(2));
  const totalDebitBalance = Number(rows.reduce((s, i) => s + i.debitBalance, 0).toFixed(2));
  const totalCreditBalance = Number(rows.reduce((s, i) => s + i.creditBalance, 0).toFixed(2));
  const difference = Number(Math.abs(totalDebitBalance - totalCreditBalance).toFixed(2));

  const isBalanced =
    Math.abs(totalDebit - totalCredit) < 0.05 &&
    Math.abs(totalDebitBalance - totalCreditBalance) < 0.05;

  return {
    rows,
    items: rows,
    totalDebit,
    totalCredit,
    totalDebitBalance,
    totalCreditBalance,
    totalDebitMouvements: totalDebit,
    totalCreditMouvements: totalCredit,
    totalSoldesDebiteurs: totalDebitBalance,
    totalSoldesCrediteurs: totalCreditBalance,
    difference,
    isBalanced
  };
}

export const generateBalanceGeneraleReport = generateTrialBalance;

export interface IncomeStatementCpcReport {
  operatingRevenues: number;
  operatingExpenses: number;
  operatingResult: number;
  financialRevenues: number;
  financialExpenses: number;
  financialResult: number;
  nonCurrentRevenues: number;
  nonCurrentExpenses: number;
  nonCurrentResult: number;
  netResult: number;
  produitsExploitation: { accountCode: string; accountName: string; amount: number }[];
  totalProduitsExploitation: number;
  chargesExploitation: { accountCode: string; accountName: string; amount: number }[];
  totalChargesExploitation: number;
  resultatExploitation: number;
  resultatNet: number;
}

export function generateIncomeStatementCpc(
  arg1: JournalEntry[] | Account[],
  arg2?: Account[] | JournalEntry[],
  filterPeriodId?: string
): IncomeStatementCpcReport {
  const gl = generateGeneralLedger(arg1 as any, arg2 as any, filterPeriodId);

  // Operating Revenues (71xx)
  const operatingRevItems = gl
    .filter(g => g.accountCode.startsWith('71') || g.accountClass === 7)
    .map(g => ({
      accountCode: g.accountCode,
      accountName: g.accountName,
      amount: g.netCreditBalance || (g.totalCredit - g.totalDebit)
    }));
  const operatingRevenues = Number(
    operatingRevItems.reduce((s, p) => s + p.amount, 0).toFixed(2)
  );

  // Operating Expenses (61xx)
  const operatingExpItems = gl
    .filter(g => g.accountCode.startsWith('61') || g.accountClass === 6)
    .map(g => ({
      accountCode: g.accountCode,
      accountName: g.accountName,
      amount: g.netDebitBalance || (g.totalDebit - g.totalCredit)
    }));
  const operatingExpenses = Number(
    operatingExpItems.reduce((s, c) => s + c.amount, 0).toFixed(2)
  );

  const operatingResult = Number((operatingRevenues - operatingExpenses).toFixed(2));

  // Financial (73xx and 63xx)
  const finRevItems = gl.filter(g => g.accountCode.startsWith('73'));
  const financialRevenues = Number(
    finRevItems.reduce((s, p) => s + (p.netCreditBalance || (p.totalCredit - p.totalDebit)), 0).toFixed(2)
  );

  const finExpItems = gl.filter(g => g.accountCode.startsWith('63'));
  const financialExpenses = Number(
    finExpItems.reduce((s, c) => s + (c.netDebitBalance || (c.totalDebit - c.totalCredit)), 0).toFixed(2)
  );

  const financialResult = Number((financialRevenues - financialExpenses).toFixed(2));

  // Non current (75xx and 65xx)
  const ncRevItems = gl.filter(g => g.accountCode.startsWith('75'));
  const nonCurrentRevenues = Number(
    ncRevItems.reduce((s, p) => s + (p.netCreditBalance || (p.totalCredit - p.totalDebit)), 0).toFixed(2)
  );

  const ncExpItems = gl.filter(g => g.accountCode.startsWith('65'));
  const nonCurrentExpenses = Number(
    ncExpItems.reduce((s, c) => s + (c.netDebitBalance || (c.totalDebit - c.totalCredit)), 0).toFixed(2)
  );

  const nonCurrentResult = Number((nonCurrentRevenues - nonCurrentExpenses).toFixed(2));

  const netResult = Number((operatingResult + financialResult + nonCurrentResult).toFixed(2));

  return {
    operatingRevenues,
    operatingExpenses,
    operatingResult,
    financialRevenues,
    financialExpenses,
    financialResult,
    nonCurrentRevenues,
    nonCurrentExpenses,
    nonCurrentResult,
    netResult,
    produitsExploitation: operatingRevItems,
    totalProduitsExploitation: operatingRevenues,
    chargesExploitation: operatingExpItems,
    totalChargesExploitation: operatingExpenses,
    resultatExploitation: operatingResult,
    resultatNet: netResult
  };
}

export const generateCpcReport = generateIncomeStatementCpc;

export interface VatDeclarationReport {
  vatCollected: number;
  vatDeductibleExpenses: number;
  vatDeductibleAssets: number;
  netVatPayable: number;
  creditVatCarriedForward: number;
  periodCode?: string;
  totalVentesTtc?: number;
  totalVentesHt?: number;
  tvaFacturee?: number;
  totalAchatsChargesHt?: number;
  tvaRecuperableCharges?: number;
  tvaDeductibleCharges?: number;
  tvaRecuperableImmobilisations?: number;
  totalTvaDeductible?: number;
  soldeTva?: number;
  tvaDue?: number;
  creditTvaReporte?: number;
}

export function generateVatDeclarationReport(
  entries: JournalEntry[],
  periodCode?: string
): VatDeclarationReport {
  const periodEntries = periodCode
    ? entries.filter(e => e.fiscalPeriodId === periodCode || e.date.startsWith(periodCode))
    : entries;

  let totalVentesHt = 0;
  let tvaFacturee = 0;
  let totalAchatsChargesHt = 0;
  let tvaRecuperableCharges = 0;
  let tvaRecuperableImmobilisations = 0;

  periodEntries.forEach(entry => {
    entry.lines?.forEach(line => {
      if (line.accountCode === '71110000' || line.accountCode === '71240000' || line.accountCode.startsWith('71')) {
        totalVentesHt += line.credit - line.debit;
      }
      if (line.accountCode === '44550000' || line.accountCode.startsWith('4455')) {
        tvaFacturee += line.credit - line.debit;
      }
      if (line.accountCode === '61110000' || line.accountCode.startsWith('611') || line.accountCode.startsWith('612') || line.accountCode.startsWith('613') || line.accountCode.startsWith('614')) {
        totalAchatsChargesHt += line.debit - line.credit;
      }
      if (line.accountCode === '34551000' || line.accountCode === '34552000' || line.accountCode.startsWith('3455')) {
        tvaRecuperableCharges += line.debit - line.credit;
      }
      if (line.accountCode.startsWith('34551') || line.accountCode === '34551000') {
        tvaRecuperableImmobilisations += line.debit - line.credit;
      }
    });
  });

  totalVentesHt = Number(totalVentesHt.toFixed(2));
  tvaFacturee = Number(tvaFacturee.toFixed(2));
  totalAchatsChargesHt = Number(totalAchatsChargesHt.toFixed(2));
  tvaRecuperableCharges = Number(tvaRecuperableCharges.toFixed(2));
  tvaRecuperableImmobilisations = Number(tvaRecuperableImmobilisations.toFixed(2));

  const totalVentesTtc = Number((totalVentesHt + tvaFacturee).toFixed(2));
  const totalTvaDeductible = Number((tvaRecuperableCharges + tvaRecuperableImmobilisations).toFixed(2));
  const soldeTva = Number((tvaFacturee - tvaRecuperableCharges).toFixed(2));

  const vatCollected = tvaFacturee;
  const vatDeductibleExpenses = tvaRecuperableCharges;
  const netVatPayable = soldeTva;
  const creditVatCarriedForward = soldeTva < 0 ? Math.abs(soldeTva) : 0;

  return {
    vatCollected,
    vatDeductibleExpenses,
    vatDeductibleAssets: tvaRecuperableImmobilisations,
    netVatPayable,
    creditVatCarriedForward,
    periodCode: periodCode || 'Global',
    totalVentesTtc,
    totalVentesHt,
    tvaFacturee,
    totalAchatsChargesHt,
    tvaRecuperableCharges,
    tvaDeductibleCharges: tvaRecuperableCharges,
    tvaRecuperableImmobilisations,
    totalTvaDeductible,
    soldeTva,
    tvaDue: soldeTva > 0 ? soldeTva : 0,
    creditTvaReporte: creditVatCarriedForward
  };
}

export const generateTvaDeclarationReport = generateVatDeclarationReport;
