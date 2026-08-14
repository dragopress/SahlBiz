import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { exportJournalEntriesCsvFile, exportPcgmCsv } from '../../lib/accountantExport';
import {
  generateGeneralLedger,
  generateTrialBalance,
  generateIncomeStatementCpc,
  generateVatDeclarationReport,
  validateJournalEntryBalance,
  PCGM_MOROCCAN_STANDARD_ACCOUNTS
} from '../../domain/accountingEngine';
import { Account, JournalEntry, JournalLine, PCGMClass } from '../../types';
import {
  Calculator,
  Download,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Table,
  Plus,
  Search,
  Filter,
  BookOpen,
  Scale,
  TrendingUp,
  Receipt,
  Layers,
  Lock,
  Calendar,
  ChevronRight,
  ChevronDown,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Printer
} from 'lucide-react';

type AccountantTab = 'journals' | 'ledger' | 'balance' | 'cpc' | 'vat' | 'chart' | 'periods';

export const AccountantModule: React.FC = () => {
  const {
    journalEntries,
    accounts,
    journals,
    fiscalPeriods,
    profile,
    addJournalEntry,
    createAccount,
    closeFiscalPeriod,
    documents,
    expenses
  } = useStore();

  const [activeTab, setActiveTab] = useState<AccountantTab>('journals');
  const [selectedSoftware, setSelectedSoftware] = useState<'sage' | 'divalto' | 'ciel' | 'standard'>('sage');
  const [selectedJournalFilter, setSelectedJournalFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Manual Journal Entry Modal State
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [modalJournalCode, setModalJournalCode] = useState('OD');
  const [modalDate, setModalDate] = useState(new Date().toISOString().split('T')[0]);
  const [modalReference, setModalReference] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalLines, setModalLines] = useState<JournalLine[]>([
    {
      id: 'l-1',
      accountCode: '61110000',
      accountName: 'Achats de marchandises',
      debit: 0,
      credit: 0,
      description: ''
    },
    {
      id: 'l-2',
      accountCode: '44110000',
      accountName: 'Fournisseurs',
      debit: 0,
      credit: 0,
      description: ''
    }
  ]);
  const [modalError, setModalError] = useState<string | null>(null);

  // Add Custom Account Modal State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [newAccCode, setNewAccCode] = useState('');
  const [newAccName, setNewAccName] = useState('');
  const [newAccClass, setNewAccClass] = useState<PCGMClass>(PCGMClass.COMPTES_DE_CHARGES);
  const [newAccNormalBalance, setNewAccNormalBalance] = useState<'debit' | 'credit'>('debit');

  // Filtered Journal Entries
  const filteredEntries = useMemo(() => {
    return journalEntries.filter(entry => {
      const matchJournal = selectedJournalFilter === 'all' || entry.journalCode === selectedJournalFilter;
      const searchLower = searchTerm.toLowerCase();
      const matchSearch =
        entry.entryNumber.toLowerCase().includes(searchLower) ||
        entry.description.toLowerCase().includes(searchLower) ||
        (entry.reference && entry.reference.toLowerCase().includes(searchLower)) ||
        entry.lines.some(l => l.accountCode.includes(searchLower) || l.accountName?.toLowerCase().includes(searchLower) || l.partnerName?.toLowerCase().includes(searchLower));
      return matchJournal && matchSearch;
    });
  }, [journalEntries, selectedJournalFilter, searchTerm]);

  // General Ledger
  const ledgerReport = useMemo(() => {
    return generateGeneralLedger(journalEntries, accounts);
  }, [journalEntries, accounts]);

  // Trial Balance (Balance Générale)
  const trialBalanceReport = useMemo(() => {
    return generateTrialBalance(journalEntries, accounts);
  }, [journalEntries, accounts]);

  // Income Statement (CPC)
  const cpcReport = useMemo(() => {
    return generateIncomeStatementCpc(journalEntries, accounts);
  }, [journalEntries, accounts]);

  // VAT Declaration (Déclaration TVA)
  const vatReport = useMemo(() => {
    return generateVatDeclarationReport(journalEntries);
  }, [journalEntries]);

  // Live balance for manual entry modal
  const liveEntryValidation = useMemo(() => {
    return validateJournalEntryBalance(modalLines);
  }, [modalLines]);

  const handleAddLine = () => {
    const nextId = `l-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setModalLines(prev => [
      ...prev,
      {
        id: nextId,
        accountCode: '51410000',
        accountName: 'Banques',
        debit: 0,
        credit: 0,
        description: ''
      }
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (modalLines.length <= 2) return;
    setModalLines(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateLine = (idx: number, field: keyof JournalLine, value: any) => {
    setModalLines(prev => {
      const updated = [...prev];
      const current = { ...updated[idx] };
      if (field === 'accountCode') {
        current.accountCode = value;
        const found = accounts.find(a => a.code === value);
        if (found) current.accountName = found.name;
      } else if (field === 'debit' || field === 'credit') {
        current[field] = Math.max(0, Number(value) || 0);
      } else {
        (current as any)[field] = value;
      }
      updated[idx] = current;
      return updated;
    });
  };

  const handleSaveJournalEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!modalDescription.trim()) {
      setModalError('Veuillez saisir un libellé pour cette écriture.');
      return;
    }

    if (!liveEntryValidation.isBalanced) {
      setModalError(liveEntryValidation.errorMessage || "L'écriture n'est pas équilibrée.");
      return;
    }

    try {
      await addJournalEntry({
        journalCode: modalJournalCode,
        date: modalDate,
        description: modalDescription,
        reference: modalReference || undefined,
        lines: modalLines,
        status: 'posted'
      });

      setIsEntryModalOpen(false);
      setModalDescription('');
      setModalReference('');
      setModalLines([
        { id: 'l-1', accountCode: '61110000', accountName: 'Achats de marchandises', debit: 0, credit: 0, description: '' },
        { id: 'l-2', accountCode: '44110000', accountName: 'Fournisseurs', debit: 0, credit: 0, description: '' }
      ]);
    } catch (err: any) {
      setModalError(err.message || "Erreur lors de l'enregistrement de l'écriture.");
    }
  };

  const handleSaveCustomAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccCode.trim() || !newAccName.trim()) return;

    await createAccount({
      code: newAccCode.trim(),
      name: newAccName.trim(),
      class: newAccClass,
      normalBalance: newAccNormalBalance,
      isReconcilable: ['34210000', '44110000'].some(c => newAccCode.startsWith(c.slice(0, 4))),
      isActive: true
    });

    setIsAccountModalOpen(false);
    setNewAccCode('');
    setNewAccName('');
  };

  const handleDownloadExport = () => {
    exportJournalEntriesCsvFile(journalEntries, accounts, profile.name, selectedSoftware);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-slate-100">
      
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              PCGM Marocain Conforme Art. 145 CGI
            </span>
            <span className="text-slate-500 text-xs">• Exercice Fiscal {selectedYear}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 mt-1">
            <Calculator className="w-6 h-6 text-emerald-400" />
            <span>Module Comptabilité Générale & Expert-Comptable</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Moteur à partie double temps-réel, plan comptable général marocain, balance à 6 colonnes, CPC et exportations multi-logiciels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsEntryModalOpen(true)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition-all shadow-md"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Saisie Écriture OD</span>
          </button>

          <button
            onClick={handleDownloadExport}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-950/40"
          >
            <Download className="w-4 h-4" />
            <span>Exporter {selectedSoftware.toUpperCase()} / CSV</span>
          </button>
        </div>
      </div>

      {/* Accounting Integrity Indicator Card */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        trialBalanceReport.isBalanced
          ? 'bg-emerald-950/20 border-emerald-500/30'
          : 'bg-rose-950/20 border-rose-500/30'
      }`}>
        <div className="flex items-center gap-3">
          {trialBalanceReport.isBalanced ? (
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-rose-400" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">
                {trialBalanceReport.isBalanced
                  ? 'Équilibre Comptable Vérifié (Partie Double Intègre)'
                  : 'Déséquilibre Détecté dans le Journal Général'}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                trialBalanceReport.isBalanced ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {journalEntries.length} Écritures Validées
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Total Débits: <span className="text-white font-mono font-bold">{trialBalanceReport.totalDebit.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD</span> | Total Crédits: <span className="text-white font-mono font-bold">{trialBalanceReport.totalCredit.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD</span>
              {trialBalanceReport.difference !== 0 && (
                <span className="text-rose-400 font-bold ml-2">Écart: {trialBalanceReport.difference.toFixed(2)} MAD</span>
              )}
            </p>
          </div>
        </div>

        {/* Software target picker */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 shrink-0">
          <span className="text-[11px] text-slate-400 font-semibold px-2">Cible Export:</span>
          {(['sage', 'divalto', 'ciel', 'standard'] as const).map(sw => (
            <button
              key={sw}
              onClick={() => setSelectedSoftware(sw)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                selectedSoftware === sw
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sw}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        {[
          { id: 'journals', label: 'Journal Général', icon: BookOpen, count: journalEntries.length },
          { id: 'balance', label: 'Balance Générale', icon: Scale },
          { id: 'ledger', label: 'Grand Livre', icon: Table },
          { id: 'cpc', label: 'Compte CPC', icon: TrendingUp },
          { id: 'vat', label: 'Déclaration TVA', icon: Receipt },
          { id: 'chart', label: 'Plan Comptable', icon: Layers, count: accounts.length },
          { id: 'periods', label: 'Exercices Fiscaux', icon: Calendar }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AccountantTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: JOURNAL GÉNÉRAL */}
      {activeTab === 'journals' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Rechercher pièce, compte, tiers, libellé..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Journal Filter */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setSelectedJournalFilter('all')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                    selectedJournalFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tous
                </button>
                {journals.map(j => (
                  <button
                    key={j.code}
                    onClick={() => setSelectedJournalFilter(j.code)}
                    className={`px-2 py-1 text-xs font-bold rounded-lg ${
                      selectedJournalFilter === j.code ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title={j.name}
                  >
                    {j.code}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Affichage de <span className="text-white font-bold">{filteredEntries.length}</span> écriture(s)
            </div>
          </div>

          {/* Entries Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Journal</th>
                    <th className="p-3">N° Écriture / Pièce</th>
                    <th className="p-3">Compte</th>
                    <th className="p-3">Intitulé / Libellé</th>
                    <th className="p-3 text-right">Débit (MAD)</th>
                    <th className="p-3 text-right">Crédit (MAD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                        Aucune écriture comptable trouvée pour ce filtre.
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map(entry => (
                      <React.Fragment key={entry.id}>
                        {/* Entry Header row */}
                        <tr className="bg-slate-950/40 border-t border-slate-800/80">
                          <td className="p-2.5 font-bold text-slate-400">{entry.date}</td>
                          <td className="p-2.5">
                            <span className="bg-slate-800 text-emerald-400 px-2 py-0.5 rounded font-bold text-[10px]">
                              {entry.journalCode}
                            </span>
                          </td>
                          <td className="p-2.5 text-white font-bold" colSpan={2}>
                            {entry.entryNumber} {entry.reference && <span className="text-slate-400 font-normal">({entry.reference})</span>}
                          </td>
                          <td className="p-2.5 text-slate-300 font-sans italic font-medium">
                            {entry.description}
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-300">
                            {entry.totalDebit.toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-300">
                            {entry.totalCredit.toFixed(2)}
                          </td>
                        </tr>

                        {/* Entry Lines */}
                        {entry.lines.map((line, lIdx) => (
                          <tr key={line.id || lIdx} className="hover:bg-slate-800/30 text-[11px]">
                            <td className="p-2"></td>
                            <td className="p-2"></td>
                            <td className="p-2 text-slate-500">{line.partnerName || ''}</td>
                            <td className="p-2 font-bold text-amber-400">{line.accountCode}</td>
                            <td className="p-2 text-slate-300 font-sans">
                              {line.accountName || line.description}
                            </td>
                            <td className="p-2 text-right text-emerald-400 font-mono">
                              {line.debit > 0 ? line.debit.toFixed(2) : '-'}
                            </td>
                            <td className="p-2 text-right text-blue-400 font-mono">
                              {line.credit > 0 ? line.credit.toFixed(2) : '-'}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BALANCE GÉNÉRALE (TRIAL BALANCE) */}
      {activeTab === 'balance' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Balance Générale des Comptes (6 Colonnes PCGM)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Vérification de l'équilibre arithmétique de la comptabilité</p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3" rowSpan={2}>N° Compte</th>
                    <th className="p-3" rowSpan={2}>Intitulé du Compte</th>
                    <th className="p-3 text-center border-l border-slate-800" colSpan={2}>Total Mouvements (MAD)</th>
                    <th className="p-3 text-center border-l border-slate-800" colSpan={2}>Soldes Finaux (MAD)</th>
                  </tr>
                  <tr className="border-t border-slate-800/80">
                    <th className="p-2 text-right border-l border-slate-800 text-emerald-400">Débit</th>
                    <th className="p-2 text-right text-blue-400">Crédit</th>
                    <th className="p-2 text-right border-l border-slate-800 text-emerald-400">Débiteur</th>
                    <th className="p-2 text-right text-blue-400">Créditeur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {trialBalanceReport.rows.map(row => (
                    <tr key={row.accountCode} className="hover:bg-slate-800/30">
                      <td className="p-2.5 font-bold text-amber-400">{row.accountCode}</td>
                      <td className="p-2.5 font-sans text-slate-300">{row.accountName}</td>
                      <td className="p-2.5 text-right border-l border-slate-800 text-slate-300">
                        {row.totalDebit > 0 ? row.totalDebit.toFixed(2) : '-'}
                      </td>
                      <td className="p-2.5 text-right text-slate-300">
                        {row.totalCredit > 0 ? row.totalCredit.toFixed(2) : '-'}
                      </td>
                      <td className="p-2.5 text-right border-l border-slate-800 font-bold text-emerald-400">
                        {row.debitBalance > 0 ? row.debitBalance.toFixed(2) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-bold text-blue-400">
                        {row.creditBalance > 0 ? row.creditBalance.toFixed(2) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-950 font-bold text-xs border-t-2 border-slate-700">
                  <tr>
                    <td className="p-3 text-white" colSpan={2}>TOTAUX GÉNÉRAUX</td>
                    <td className="p-3 text-right border-l border-slate-800 text-emerald-400">
                      {trialBalanceReport.totalDebit.toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-blue-400">
                      {trialBalanceReport.totalCredit.toFixed(2)}
                    </td>
                    <td className="p-3 text-right border-l border-slate-800 text-emerald-400">
                      {trialBalanceReport.totalDebitBalance.toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-blue-400">
                      {trialBalanceReport.totalCreditBalance.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GRAND LIVRE (GENERAL LEDGER) */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <h3 className="text-sm font-bold text-white">Grand Livre des Comptes PCGM</h3>
            <p className="text-xs text-slate-400 mt-0.5">Détail chronologique des mouvements et solde progressif par compte</p>
          </div>

          <div className="space-y-4">
            {ledgerReport.map(accLedger => (
              <div key={accLedger.accountCode} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-mono font-bold text-sm">{accLedger.accountCode}</span>
                    <span className="text-white font-bold text-sm">{accLedger.accountName}</span>
                  </div>
                  <div className="text-xs font-mono">
                    Solde Final:{' '}
                    <span className={`font-bold ${accLedger.closingBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {accLedger.closingBalance.toFixed(2)} MAD
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950/40 text-slate-500 text-[10px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Journal</th>
                        <th className="p-2.5">Pièce</th>
                        <th className="p-2.5">Libellé</th>
                        <th className="p-2.5 text-right">Débit</th>
                        <th className="p-2.5 text-right">Crédit</th>
                        <th className="p-2.5 text-right">Solde Cumulé</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {accLedger.entries.map((entry, eIdx) => (
                        <tr key={eIdx} className="hover:bg-slate-800/30">
                          <td className="p-2 text-slate-400">{entry.date}</td>
                          <td className="p-2 text-slate-300 font-bold">{entry.journalCode}</td>
                          <td className="p-2 text-slate-300">{entry.entryNumber}</td>
                          <td className="p-2 font-sans text-slate-200">{entry.description}</td>
                          <td className="p-2 text-right text-emerald-400 font-bold">
                            {entry.debit > 0 ? entry.debit.toFixed(2) : '-'}
                          </td>
                          <td className="p-2 text-right text-blue-400 font-bold">
                            {entry.credit > 0 ? entry.credit.toFixed(2) : '-'}
                          </td>
                          <td className="p-2 text-right text-white font-bold">
                            {entry.runningBalance.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: COMPTE DE PRODUITS ET CHARGES (CPC) */}
      {activeTab === 'cpc' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <h3 className="text-sm font-bold text-white">Compte de Produits et Charges (CPC Marocain)</h3>
            <p className="text-xs text-slate-400 mt-0.5">Synthèse des résultats d'exploitation, financiers et non-courants</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Exploitation */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">I. Exploitation</h4>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-emerald-400">
                  <span>Produits d'exploitation (Classe 7)</span>
                  <span className="font-bold">{cpcReport.operatingRevenues.toFixed(2)} MAD</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>Charges d'exploitation (Classe 6)</span>
                  <span className="font-bold">{cpcReport.operatingExpenses.toFixed(2)} MAD</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm text-white">
                  <span>Résultat d'Exploitation (I)</span>
                  <span className={cpcReport.operatingResult >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {cpcReport.operatingResult.toFixed(2)} MAD
                  </span>
                </div>
              </div>
            </div>

            {/* Financier */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">II. Financier</h4>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-emerald-400">
                  <span>Produits financiers</span>
                  <span className="font-bold">{cpcReport.financialRevenues.toFixed(2)} MAD</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>Charges financières</span>
                  <span className="font-bold">{cpcReport.financialExpenses.toFixed(2)} MAD</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm text-white">
                  <span>Résultat Financier (II)</span>
                  <span className={cpcReport.financialResult >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {cpcReport.financialResult.toFixed(2)} MAD
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Résultat Net Final */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 uppercase font-bold">Résultat Net de l'Exercice (Bénéfice / Perte)</span>
              <div className="text-2xl font-black text-white mt-1">
                {cpcReport.netResult.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-sm font-normal text-slate-400">MAD</span>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-xl text-xs font-bold ${
              cpcReport.netResult >= 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              {cpcReport.netResult >= 0 ? 'Bénéfice Net' : 'Perte Nette'}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DÉCLARATION TVA */}
      {activeTab === 'vat' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <h3 className="text-sm font-bold text-white">Déclaration de TVA (État Récapitulatif)</h3>
            <p className="text-xs text-slate-400 mt-0.5">Calcul de la TVA due selon le régime des débits / encaissements marocain</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
              <span className="text-xs text-slate-400 font-semibold">TVA Facturée (Collectée - 4455)</span>
              <div className="text-xl font-bold text-amber-400 font-mono">
                {vatReport.vatCollected.toFixed(2)} MAD
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
              <span className="text-xs text-slate-400 font-semibold">TVA Récupérable (Charges - 34552)</span>
              <div className="text-xl font-bold text-emerald-400 font-mono">
                {vatReport.vatDeductibleExpenses.toFixed(2)} MAD
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
              <span className="text-xs text-slate-400 font-semibold">TVA Nette Due / (Crédit de TVA)</span>
              <div className={`text-xl font-bold font-mono ${vatReport.netVatPayable >= 0 ? 'text-white' : 'text-emerald-400'}`}>
                {vatReport.netVatPayable.toFixed(2)} MAD
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: PLAN COMPTABLE (CHART OF ACCOUNTS) */}
      {activeTab === 'chart' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Plan Comptable Général Marocain (PCGM)</h3>
              <p className="text-xs text-slate-400 mt-0.5">{accounts.length} comptes actifs configurés</p>
            </div>
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Compte</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Numéro</th>
                  <th className="p-3">Intitulé du Compte</th>
                  <th className="p-3">Classe</th>
                  <th className="p-3">Sens Normal</th>
                  <th className="p-3">Lettrable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {accounts.map(acc => (
                  <tr key={acc.id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-bold text-amber-400">{acc.code}</td>
                    <td className="p-3 font-sans text-white font-medium">{acc.name}</td>
                    <td className="p-3 text-slate-400">Classe {acc.class}</td>
                    <td className="p-3 uppercase">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        acc.normalBalance === 'debit' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {acc.normalBalance}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">
                      {acc.isReconcilable ? 'Oui (Tiers)' : 'Non'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: EXERCICES FISCAUX */}
      {activeTab === 'periods' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <h3 className="text-sm font-bold text-white">Clôture et Périodes Fiscales</h3>
            <p className="text-xs text-slate-400 mt-0.5">Verrouillage des périodes comptables pour empêcher toute altération rétroactive</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fiscalPeriods.map(period => (
              <div key={period.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{period.name} ({period.year})</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    period.status === 'open' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {period.status === 'open' ? 'Période Ouverte' : 'Verrouillée / Clôturée'}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Du {period.startDate} au {period.endDate}
                </div>
                {period.status === 'open' && (
                  <button
                    onClick={() => closeFiscalPeriod(period.id)}
                    className="flex items-center gap-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-400 px-3 py-1.5 rounded-xl border border-slate-700 transition-all"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Clôturer la Période</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: SAISIE D'ÉCRITURE MANUELLE (OD / AUTRE) */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-400" />
                  <span>Saisie d'une Nouvelle Écriture Comptable (Partie Double)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Conforme au principe fondamental: Total Débits = Total Crédits</p>
              </div>
              <button
                onClick={() => setIsEntryModalOpen(false)}
                className="text-slate-500 hover:text-white font-bold text-xl"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveJournalEntry} className="space-y-4">
              {/* Top fields */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Journal</label>
                  <select
                    value={modalJournalCode}
                    onChange={e => setModalJournalCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {journals.map(j => (
                      <option key={j.code} value={j.code}>
                        {j.code} - {j.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    value={modalDate}
                    onChange={e => setModalDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Pièce Réf.</label>
                  <input
                    type="text"
                    placeholder="Ex: FACT-2026-0042"
                    value={modalReference}
                    onChange={e => setModalReference(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Libellé Principal</label>
                  <input
                    type="text"
                    placeholder="Ex: Régularisation stock / Écriture d'inventaire"
                    value={modalDescription}
                    onChange={e => setModalDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Lines editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">Lignes d'écritures (Débit / Crédit)</span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter une ligne</span>
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 overflow-x-auto">
                  {modalLines.map((line, idx) => (
                    <div key={line.id} className="grid grid-cols-12 gap-2 items-center min-w-[600px]">
                      {/* Account selector */}
                      <div className="col-span-4">
                        <select
                          value={line.accountCode}
                          onChange={e => handleUpdateLine(idx, 'accountCode', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 focus:outline-none font-mono"
                        >
                          {accounts.map(a => (
                            <option key={a.id} value={a.code}>
                              {a.code} - {a.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Line description */}
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="Libellé ligne (optionnel)"
                          value={line.description || ''}
                          onChange={e => handleUpdateLine(idx, 'description', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        />
                      </div>

                      {/* Debit */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Débit (MAD)"
                          value={line.debit || ''}
                          onChange={e => handleUpdateLine(idx, 'debit', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono text-right focus:outline-none"
                        />
                      </div>

                      {/* Credit */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Crédit (MAD)"
                          value={line.credit || ''}
                          onChange={e => handleUpdateLine(idx, 'credit', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-blue-400 font-mono text-right focus:outline-none"
                        />
                      </div>

                      {/* Delete */}
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={modalLines.length <= 2}
                          className="text-slate-500 hover:text-rose-400 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Debits / Credits & Balance Indicator */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                <div className="space-x-4">
                  <span>Total Débit: <strong className="text-emerald-400">{liveEntryValidation.totalDebit.toFixed(2)} MAD</strong></span>
                  <span>Total Crédit: <strong className="text-blue-400">{liveEntryValidation.totalCredit.toFixed(2)} MAD</strong></span>
                  <span>Écart: <strong className={liveEntryValidation.isBalanced ? 'text-emerald-400' : 'text-rose-400'}>{liveEntryValidation.difference.toFixed(2)} MAD</strong></span>
                </div>

                <div className="flex items-center gap-1.5 font-sans font-bold">
                  {liveEntryValidation.isBalanced ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Équilibré
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> Déséquilibré
                    </span>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEntryModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!liveEntryValidation.isBalanced}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Enregistrer et Valider l'Écriture</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AJOUT COMPTE PERSONNALISÉ */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Nouveau Compte PCGM</h3>
              <button onClick={() => setIsAccountModalOpen(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveCustomAccount} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Numéro de Compte (8 chiffres)</label>
                <input
                  type="text"
                  placeholder="Ex: 34210001"
                  value={newAccCode}
                  onChange={e => setNewAccCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Intitulé du Compte</label>
                <input
                  type="text"
                  placeholder="Ex: Client ABC SARL"
                  value={newAccName}
                  onChange={e => setNewAccName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Classe</label>
                  <select
                    value={newAccClass}
                    onChange={e => setNewAccClass(Number(e.target.value) as PCGMClass)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value={1}>Classe 1 - Financement</option>
                    <option value={2}>Classe 2 - Immobilisations</option>
                    <option value={3}>Classe 3 - Actif Circulant</option>
                    <option value={4}>Classe 4 - Passif Circulant</option>
                    <option value={5}>Classe 5 - Trésorerie</option>
                    <option value={6}>Classe 6 - Charges</option>
                    <option value={7}>Classe 7 - Produits</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Sens Normal</label>
                  <select
                    value={newAccNormalBalance}
                    onChange={e => setNewAccNormalBalance(e.target.value as 'debit' | 'credit')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="debit">Débiteur</option>
                    <option value="credit">Créditeur</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl"
                >
                  Créer le Compte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
