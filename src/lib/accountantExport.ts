import { BusinessDocument, Expense, BusinessProfile, JournalEntry, Account } from '../types';
import { PCGM_ACCOUNTS, formatMad } from './moroccanTax';

export function generateJournalEntriesCsv(
  entries: JournalEntry[],
  accounts: Account[],
  profileName: string,
  softwareFormat: 'sage' | 'divalto' | 'ciel' | 'standard' = 'standard'
): string {
  const accountMap = new Map<string, string>();
  accounts.forEach(a => accountMap.set(a.code, a.name));

  if (softwareFormat === 'sage') {
    // Sage PNM format: Journal;Date;N_Piece;N_Compte;Libelle_Compte;Libelle_Ecriture;Debit;Credit
    const headers = ["Journal", "Date", "N_Piece", "N_Compte", "Libelle_Compte", "Libelle_Ecriture", "Debit", "Credit"];
    const rows: string[][] = [headers];

    entries.forEach(entry => {
      entry.lines.forEach(line => {
        const d = entry.date.replace(/-/g, ''); // YYYYMMDD
        rows.push([
          entry.journalCode,
          d,
          entry.entryNumber,
          line.accountCode,
          accountMap.get(line.accountCode) || line.accountCode,
          line.description || entry.description,
          line.debit > 0 ? line.debit.toFixed(2) : '0.00',
          line.credit > 0 ? line.credit.toFixed(2) : '0.00'
        ]);
      });
    });

    return rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(";")).join("\n");
  }

  // Standard PCGM CSV
  const headers = [
    "Date",
    "Journal",
    "N_Ecriture",
    "N_Piece_Ref",
    "N_Compte_PCGM",
    "Intitule_Compte",
    "Libelle_Ecriture",
    "Nom_Tiers",
    "Debit_MAD",
    "Credit_MAD",
    "Statut"
  ];

  const rows: string[][] = [headers];

  entries.forEach(entry => {
    entry.lines.forEach(line => {
      rows.push([
        entry.date,
        entry.journalCode,
        entry.entryNumber,
        entry.reference || entry.entryNumber,
        line.accountCode,
        accountMap.get(line.accountCode) || line.accountCode,
        line.description || entry.description,
        line.partnerName || "",
        line.debit > 0 ? line.debit.toFixed(2) : '0.00',
        line.credit > 0 ? line.credit.toFixed(2) : '0.00',
        entry.status
      ]);
    });
  });

  return rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function generatePcgmJournalCsv(
  documents: BusinessDocument[],
  expenses: Expense[],
  profileName: string
): string {
  const headers = [
    "Date",
    "Journal",
    "N_Compte",
    "Libelle_Compte",
    "Piece_Ref",
    "Nom_Tiers",
    "ICE_Tiers",
    "Libelle_Ecriture",
    "Debit_MAD",
    "Credit_MAD"
  ];

  const rows: string[][] = [headers];

  // Process Invoices (Journal Ventes - VE)
  documents
    .filter(doc => doc.type === 'facture')
    .forEach(doc => {
      // 1. Debit Client
      rows.push([
        doc.date,
        "VE",
        PCGM_ACCOUNTS.CLIENTS,
        "Clients Ventes",
        doc.number,
        doc.customerName,
        doc.customerIce || "",
        `Vente Facture N°${doc.number}`,
        doc.totalTtc.toFixed(2),
        "0.00"
      ]);

      // 2. Credit Ventes (HT)
      rows.push([
        doc.date,
        "VE",
        PCGM_ACCOUNTS.VENTES_MARCHANDISES,
        "Ventes de Marchandises au Maroc",
        doc.number,
        doc.customerName,
        doc.customerIce || "",
        `CA Facture N°${doc.number}`,
        "0.00",
        doc.subtotalHt.toFixed(2)
      ]);

      // 3. Credit TVA Facturée
      if (doc.totalTva > 0) {
        rows.push([
          doc.date,
          "VE",
          PCGM_ACCOUNTS.TVA_FACTUREE,
          "TVA Facturée sur Ventes",
          doc.number,
          doc.customerName,
          doc.customerIce || "",
          `TVA Facture N°${doc.number}`,
          "0.00",
          doc.totalTva.toFixed(2)
        ]);
      }
    });

  // Process Expenses (Journal Achats/Charges - AC)
  expenses.forEach(exp => {
    // 1. Debit Charge
    rows.push([
      exp.date,
      "AC",
      PCGM_ACCOUNTS.ACHATS_REVENTE,
      `Charge: ${exp.category.toUpperCase()}`,
      exp.id,
      exp.vendorName || exp.supplierName || "Divers",
      exp.vendorIce || exp.supplierIce || "",
      exp.title,
      exp.amountHt.toFixed(2),
      "0.00"
    ]);

    // 2. Debit TVA Récupérable
    if (exp.tvaAmount > 0) {
      rows.push([
        exp.date,
        "AC",
        PCGM_ACCOUNTS.TVA_RECUPERABLE,
        "TVA Récupérable sur Charges",
        exp.id,
        exp.vendorName || exp.supplierName || "Divers",
        exp.vendorIce || exp.supplierIce || "",
        `TVA ${exp.title}`,
        exp.tvaAmount.toFixed(2),
        "0.00"
      ]);
    }

    // 3. Credit Caisse/Banque
    const paymentAccount = exp.paymentMethod === 'cash' ? PCGM_ACCOUNTS.CAISSE : PCGM_ACCOUNTS.BANQUE;
    rows.push([
      exp.date,
      "AC",
      paymentAccount,
      exp.paymentMethod === 'cash' ? "Caisse Principale" : "Banque Attijariwafa",
      exp.id,
      exp.vendorName || exp.supplierName || "Divers",
      exp.vendorIce || exp.supplierIce || "",
      `Règlement ${exp.title}`,
      "0.00",
      exp.amountTtc.toFixed(2)
    ]);
  });

  return rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function downloadCsvFile(content: string, filename: string) {
  const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportPcgmCsv(documents: BusinessDocument[], expenses: Expense[], profileName: string) {
  const content = generatePcgmJournalCsv(documents, expenses, profileName);
  downloadCsvFile(content, `Journal_Comptable_PCGM_${profileName.replace(/\s+/g, '_')}_2026.csv`);
}

export function exportJournalEntriesCsvFile(
  entries: JournalEntry[],
  accounts: Account[],
  profileName: string,
  softwareFormat: 'sage' | 'divalto' | 'ciel' | 'standard' = 'standard'
) {
  const content = generateJournalEntriesCsv(entries, accounts, profileName, softwareFormat);
  const ext = softwareFormat === 'sage' ? 'pnm' : 'csv';
  downloadCsvFile(content, `Ecritures_Comptables_${softwareFormat.toUpperCase()}_${profileName.replace(/\s+/g, '_')}_2026.${ext}`);
}

