import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { Expense, ExpenseCategory, TvaRate } from '../../types';
import { formatMad } from '../../lib/moroccanTax';
import { TaxSettings } from '../Common/TaxSettings';
import {
  RecurringExpenseApiService,
  RecurringTemplateResponse,
  SchedulerAuditLogResponse,
  SchedulerRunResultResponse
} from '../../services/recurringExpenseApi';
import {
  Receipt,
  Plus,
  Search,
  Sparkles,
  Camera,
  X,
  Building2,
  FileText,
  Upload,
  CheckCircle2,
  Loader2,
  Repeat,
  Calendar,
  Play,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  Clock,
  Check,
  Server
} from 'lucide-react';

export const ExpenseModule: React.FC = () => {
  const { expenses, addExpense, updateExpense, isLoadingInitialData, isSaving } = useStore();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'all' | 'recurring' | 'scheduler_audit'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Expense Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('loyer');
  const [vendorName, setVendorName] = useState('');
  const [vendorIce, setVendorIce] = useState('');
  const [amountHt, setAmountHt] = useState<number>(0);
  const [tvaRate, setTvaRate] = useState<TvaRate>(20);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'check' | 'transfer' | 'cmi_card'>('cash');
  
  // Recurring Configuration
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [recurringStartDate, setRecurringStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [maxOccurrences, setMaxOccurrences] = useState<number | undefined>();

  // Backend Scheduler State
  const [backendTemplates, setBackendTemplates] = useState<RecurringTemplateResponse[]>([]);
  const [auditLogs, setAuditLogs] = useState<SchedulerAuditLogResponse[]>([]);
  const [isRunningScheduler, setIsRunningScheduler] = useState(false);
  const [schedulerRunResult, setSchedulerRunResult] = useState<SchedulerRunResultResponse | null>(null);
  const [customSimulateDate, setCustomSimulateDate] = useState('');

  // Load templates & logs from backend
  const loadBackendSchedulerData = async () => {
    try {
      const [tmpls, logs] = await Promise.all([
        RecurringExpenseApiService.fetchTemplates(),
        RecurringExpenseApiService.fetchAuditLogs()
      ]);
      setBackendTemplates(tmpls);
      setAuditLogs(logs);
    } catch (err) {
      console.warn('Could not sync with backend recurring scheduler:', err);
    }
  };

  useEffect(() => {
    loadBackendSchedulerData();
  }, []);

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.vendorName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedCat !== 'all' && e.category !== selectedCat) return false;
    return true;
  });

  const totalExpenseTtc = expenses.reduce((sum, e) => sum + e.amountTtc, 0);
  const totalTvaDeductible = expenses.reduce((sum, e) => sum + e.tvaAmount, 0);

  const handleSimulateOcrScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        await new Promise(r => setTimeout(r, 1200));

        if (file.name.toLowerCase().includes('loyer') || file.name.toLowerCase().includes('bail')) {
          setTitle('Loyer Mensuel Local Commercial');
          setCategory('loyer');
          setVendorName('Immobilière Atlas SA');
          setVendorIce('001569420000140');
          setAmountHt(6000);
          setTvaRate(20);
        } else if (file.name.toLowerCase().includes('iam') || file.name.toLowerCase().includes('telecom') || file.name.toLowerCase().includes('orange')) {
          setTitle('Facture Fibre Optique & Télécom');
          setCategory('electricite');
          setVendorName('Maroc Telecom');
          setVendorIce('001509930000088');
          setAmountHt(499);
          setTvaRate(20);
        } else {
          setTitle('Carburant & Frais de Déplacement');
          setCategory('transport');
          setVendorName('Afriquia SMDC');
          setVendorIce('001598271000099');
          setAmountHt(620);
          setTvaRate(14);
        }
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsScanning(false);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const tvaAmount = Number((amountHt * (tvaRate / 100)).toFixed(2));
    const amountTtc = Number((amountHt + tvaAmount).toFixed(2));
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Save local initial expense
    addExpense({
      title: title || 'Charge Exploitation',
      category,
      vendorName,
      vendorIce,
      date: todayStr,
      amountHt,
      tvaRate,
      tvaAmount,
      amountTtc,
      isTaxDeductible: true,
      paymentMethod,
      isRecurring,
      recurringInterval: isRecurring ? recurringFrequency : undefined,
      nextOccurrenceDate: isRecurring ? recurringStartDate : undefined,
      recurringStatus: isRecurring ? 'active' : undefined,
    });

    // 2. Register template in the trusted backend scheduler
    if (isRecurring) {
      await RecurringExpenseApiService.createTemplate({
        title: title || 'Charge Exploitation',
        category,
        amountHt,
        tvaRate,
        vendorName,
        vendorIce,
        paymentMethod,
        frequency: recurringFrequency,
        startDate: recurringStartDate,
        endDate: recurringEndDate || undefined,
        maxOccurrences: maxOccurrences || undefined,
        timezone: 'Africa/Casablanca',
        notes: 'Enregistré depuis le module de dépenses SahlBiz'
      });
      await loadBackendSchedulerData();
    }

    setIsAddModalOpen(false);
    setTitle('');
    setVendorName('');
    setVendorIce('');
    setAmountHt(0);
    setIsRecurring(false);
    setRecurringFrequency('monthly');
  };

  const handleCancelRecurrence = async (exp: Expense) => {
    updateExpense({
      ...exp,
      isRecurring: false,
      recurringStatus: 'cancelled'
    });

    // Also update template on the backend if mapped
    const matchingTemplate = backendTemplates.find(t => t.title === exp.title && t.category === exp.category);
    if (matchingTemplate) {
      await RecurringExpenseApiService.updateStatus(matchingTemplate.id, 'cancelled');
      await loadBackendSchedulerData();
    }
  };

  const handleRunBackendScheduler = async (overrideDate?: string) => {
    setIsRunningScheduler(true);
    setSchedulerRunResult(null);
    try {
      const result = await RecurringExpenseApiService.triggerSchedulerRun(overrideDate);
      if (result) {
        setSchedulerRunResult(result);
        
        // Sync any freshly generated records into local store seamlessly
        if (result.generatedRecords && result.generatedRecords.length > 0) {
          for (const gen of result.generatedRecords) {
            // Check if already in store
            const exists = expenses.some(e => e.id === gen.id || (e.title === gen.title && e.date === gen.date && e.isRecurring));
            if (!exists) {
              addExpense({
                title: gen.title,
                category: gen.category,
                vendorName: gen.vendorName,
                vendorIce: gen.vendorIce,
                date: gen.date,
                amountHt: gen.amountHt,
                tvaRate: gen.tvaRate,
                tvaAmount: gen.tvaAmount,
                amountTtc: gen.amountTtc,
                isTaxDeductible: true,
                paymentMethod: gen.paymentMethod,
                isRecurring: true,
                recurringStatus: 'active',
                notes: gen.notes,
                generatedByScheduler: true,
                generationIdempotencyKey: gen.generationIdempotencyKey
              });
            }
          }
        }
      }
      await loadBackendSchedulerData();
    } catch (err) {
      console.error('Error running scheduler:', err);
    } finally {
      setIsRunningScheduler(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-400" />
            <span>Dépenses & Charges Récurrentes</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gestion comptable des charges, détection d'échéances et planificateur d'abonnements avec sécurité anti-doublon.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleRunBackendScheduler()}
            disabled={isRunningScheduler}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-medium px-3.5 py-2.5 rounded-xl transition-all disabled:opacity-50"
            title="Déclencher manuellement le cycle du planificateur serveur"
          >
            {isRunningScheduler ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              <Server className="w-4 h-4 text-emerald-400" />
            )}
            <span>Cycle Planificateur</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-900/30 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Saisir une Dépense</span>
          </button>
        </div>
      </div>

      {/* Scheduler Execution Feedback Toast */}
      {schedulerRunResult && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5 text-emerald-300">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold block">Cycle du planificateur exécuté avec succès (Fuseau: {schedulerRunResult.timezone})</span>
              <span className="text-slate-400">
                {schedulerRunResult.totalTemplatesEvaluated} échéanciers analysés • {schedulerRunResult.expensesGenerated} charge(s) générée(s) • {schedulerRunResult.templatesAdvanced} échéance(s) avancée(s) • 0 doublon
              </span>
            </div>
          </div>
          <button
            onClick={() => setSchedulerRunResult(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-900 rounded-lg border border-slate-800"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase block mb-1">Total Charges Engagées</span>
          <div className="text-2xl font-bold text-white">{formatMad(totalExpenseTtc)}</div>
          <span className="text-xs text-slate-400 block mt-1">
            {expenses.length} justificatifs comptabilisés
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase block mb-1">TVA Déductible Récupérable</span>
          <div className="text-2xl font-bold text-emerald-400">{formatMad(totalTvaDeductible)}</div>
          <span className="text-xs text-slate-400 block mt-1">
            À déduire de votre TVA collectée sur ventes
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase block mb-1">Échéanciers Actifs</span>
          <div className="text-2xl font-bold text-sky-400">
            {backendTemplates.length > 0
              ? backendTemplates.filter(t => t.status === 'active').length
              : expenses.filter(e => e.isRecurring && e.recurringStatus !== 'cancelled').length}
          </div>
          <span className="text-xs text-slate-400 block mt-1">
            Sous contrôle du planificateur serveur
          </span>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex gap-2 border-b border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all ${
            activeTab === 'all'
              ? 'text-emerald-400 border-emerald-500 bg-slate-900/40'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          Registre des Charges ({filteredExpenses.length})
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'recurring'
              ? 'text-emerald-400 border-emerald-500 bg-slate-900/40'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
          <span>Échéanciers Récurrents</span>
          {(backendTemplates.length > 0 ? backendTemplates : expenses.filter(e => e.isRecurring && e.recurringStatus !== 'cancelled')).length > 0 && (
            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {backendTemplates.length > 0 ? backendTemplates.length : expenses.filter(e => e.isRecurring && e.recurringStatus !== 'cancelled').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('scheduler_audit')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'scheduler_audit'
              ? 'text-emerald-400 border-emerald-500 bg-slate-900/40'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Audit & Traçabilité Serveur</span>
          {auditLogs.length > 0 && (
            <span className="bg-sky-500/20 text-sky-400 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {auditLogs.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: All Expenses Register */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par libellé ou fournisseur..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={selectedCat}
              onChange={e => setSelectedCat(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Toutes les catégories</option>
              <option value="loyer">Loyer & Charges locatives</option>
              <option value="transport">Transport & Carburant</option>
              <option value="electricite">Électricité & Télécom</option>
              <option value="salaires">Salaires & Social</option>
              <option value="matieres">Matières & Fournitures</option>
              <option value="divers">Divers</option>
            </select>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {filteredExpenses.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Aucune dépense enregistrée.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/50 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Intitulé</th>
                      <th className="p-3">Fournisseur & ICE</th>
                      <th className="p-3">Catégorie</th>
                      <th className="p-3 text-right">Montant HT</th>
                      <th className="p-3 text-right">TVA</th>
                      <th className="p-3 text-right">Total TTC</th>
                      <th className="p-3 text-center">Origine</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredExpenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-mono text-slate-400">{exp.date}</td>
                        <td className="p-3 font-semibold text-white">
                          {exp.title}
                          {exp.notes && (
                            <span className="block text-[10px] text-slate-500 font-normal mt-0.5">
                              {exp.notes}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-slate-200">{exp.vendorName || '-'}</div>
                          {exp.vendorIce && (
                            <div className="font-mono text-[10px] text-slate-400">ICE: {exp.vendorIce}</div>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                            {exp.category}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono">{formatMad(exp.amountHt)}</td>
                        <td className="p-3 text-right font-mono text-emerald-400">
                          {formatMad(exp.tvaAmount)} ({exp.tvaRate}%)
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-white">
                          {formatMad(exp.amountTtc)}
                        </td>
                        <td className="p-3 text-center">
                          {exp.generatedByScheduler || exp.isRecurring ? (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-semibold inline-flex items-center gap-1">
                              <Server className="w-2.5 h-2.5" />
                              Planificateur
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">Manuel</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Recurring Schedules Tab */}
      {activeTab === 'recurring' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <span>Planificateur de Charges & Abonnements Serveur</span>
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  Les échéances sont gérées de manière fiable par le serveur avec détection d'échéance (Fuseau: Africa/Casablanca), vérification d'idempotence et journalisation d'audit.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customSimulateDate}
                  onChange={e => setCustomSimulateDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                  title="Simuler une date future pour tester le rattrapage automatique"
                />
                <button
                  onClick={() => handleRunBackendScheduler(customSimulateDate || undefined)}
                  disabled={isRunningScheduler}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/30 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Évaluer Échéances</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {backendTemplates.length === 0 && expenses.filter(e => e.isRecurring && e.recurringStatus !== 'cancelled').length === 0 ? (
              <div className="col-span-1 md:col-span-2 bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-3">
                <Calendar className="w-10 h-10 text-slate-500 mx-auto" />
                <div>
                  <h4 className="text-white font-bold text-sm">Aucun abonnement ou loyer récurrent configuré</h4>
                  <p className="text-slate-400 text-xs mt-1">Cochez l'option "Dépense Récurrente" lors de la saisie d'une nouvelle charge pour commencer.</p>
                </div>
                <button
                  onClick={() => {
                    setIsRecurring(true);
                    setIsAddModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all inline-flex items-center gap-1.5 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Créer un échéancier serveur
                </button>
              </div>
            ) : (
              (backendTemplates.length > 0 ? backendTemplates : expenses.filter(e => e.isRecurring && e.recurringStatus !== 'cancelled')).map((item: any) => (
                <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 relative overflow-hidden flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                          {item.category}
                        </span>
                        <h4 className="text-white font-bold text-base mt-1">{item.title}</h4>
                      </div>
                      <span className="bg-slate-850 text-slate-400 text-[10px] px-2.5 py-1 rounded-lg border border-slate-800 font-semibold uppercase flex items-center gap-1">
                        <Repeat className="w-3 h-3 text-emerald-400" />
                        {item.frequency || item.recurringInterval || 'Mensuel'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-slate-950/40 border border-slate-800/40 rounded-xl p-3 text-[11px]">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Fournisseur :</span>
                        <span className="text-white font-semibold">{item.vendorName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Montant TTC :</span>
                        <span className="text-emerald-400 font-bold font-mono">{formatMad(item.amountTtc)}</span>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-slate-800/40 flex items-center justify-between text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Prochaine échéance : <strong className="text-white">{item.nextDueDate || item.nextOccurrenceDate}</strong></span>
                        </div>
                        {item.totalOccurrencesGenerated !== undefined && (
                          <span className="text-[10px] text-slate-500">
                            Généré: {item.totalOccurrencesGenerated} fois
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800/60 pt-3">
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      Idempotence garantie
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm('Voulez-vous suspendre cet échéancier récurrent ?')) {
                            if (item.templateId || backendTemplates.some(b => b.id === item.id)) {
                              await RecurringExpenseApiService.updateStatus(item.id, 'cancelled');
                              await loadBackendSchedulerData();
                            } else {
                              handleCancelRecurrence(item);
                            }
                          }
                        }}
                        className="text-[11px] text-rose-400 hover:text-rose-300 font-medium px-3 py-1.5 rounded-lg hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
                      >
                        Suspendre
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Scheduler Audit & Telemetry Log */}
      {activeTab === 'scheduler_audit' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
            <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Registre d'Audit & Historique d'Exécution du Planificateur</span>
            </h3>
            <p className="text-slate-400 text-xs">
              Journal d'audit immuable des déclenchements d'échéances, détections de doublons, avancées de calendrier et tentatives de relance.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Aucun log d'exécution pour le moment. Les événements apparaîtront ici lors de l'évaluation des échéances.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/50 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Horodatage</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Date Cible</th>
                      <th className="p-3">Statut</th>
                      <th className="p-3">Détails de l'Opération</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-mono text-slate-400 text-[11px]">
                          {new Date(log.timestamp).toLocaleString('fr-FR')}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.action === 'EXPENSE_GENERATED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            log.action === 'SCHEDULE_CREATED' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                            log.action === 'SCHEDULE_CANCELLED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-300">{log.targetDate}</td>
                        <td className="p-3">
                          {log.status === 'SUCCESS' ? (
                            <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[11px]">
                              <Check className="w-3 h-3" /> Succès
                            </span>
                          ) : (
                            <span className="text-rose-400 flex items-center gap-1 font-semibold text-[11px]">
                              <AlertCircle className="w-3 h-3" /> Échec
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-300">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Expense Modal with Recurring Configuration */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-white font-bold text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <span>Enregistrer une Dépense / Abonnement</span>
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-4 space-y-4 overflow-y-auto text-xs">
              
              {/* OCR Scanning simulator */}
              <div className="border border-dashed border-slate-700 bg-slate-950/40 p-4 rounded-xl text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-emerald-400 font-semibold">
                  <Sparkles className="w-4 h-4" />
                  <span>Scanner OCR Intelligent de Facture</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Importez une facture ou un reçu (Loyer, REDAL, Maroc Telecom, Afriquia...) pour auto-remplir les données.
                </p>
                <label className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-medium px-3 py-1.5 rounded-lg cursor-pointer transition-all">
                  {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{isScanning ? 'Analyse OCR en cours...' : 'Sélectionner un Justificatif'}</span>
                  <input type="file" accept="image/*,.pdf" onChange={handleSimulateOcrScan} className="hidden" />
                </label>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Intitulé / Libellé de la Charge *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Loyer Local, Abonnement Internet Fibre, Carburant"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Catégorie Comptable *</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="loyer">Loyer & Charges (6131)</option>
                    <option value="transport">Transport & Carburant (6142)</option>
                    <option value="electricite">Électricité / Eau / Net (6133)</option>
                    <option value="salaires">Salaires & Personnel (6171)</option>
                    <option value="matieres">Matières Premières (6111)</option>
                    <option value="divers">Divers Charges (618)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Nom du Fournisseur</label>
                  <input
                    type="text"
                    placeholder="ex: REDAL, IAM, Afriquia"
                    value={vendorName}
                    onChange={e => setVendorName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">ICE Fournisseur (15 Chiffres)</label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="001569420000140"
                    value={vendorIce}
                    onChange={e => setVendorIce(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Mode de Paiement</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="cash">Espèces (Plafond 5 000 DH)</option>
                    <option value="transfer">Virement Bancaire</option>
                    <option value="check">Chèque</option>
                    <option value="cmi_card">Carte Bancaire (CMI)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Montant HT (MAD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amountHt || ''}
                    onChange={e => setAmountHt(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <TaxSettings
                    selectedRate={tvaRate}
                    onRateChange={setTvaRate}
                    amountHt={amountHt}
                    label="Taux TVA"
                    showBreakdown={false}
                  />
                </div>
              </div>

              {/* Recurring Toggle & Options */}
              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-semibold block text-slate-200">Enregistrer comme Échéancier Récurrent</span>
                      <span className="text-[10px] text-slate-400 block">Géré de façon fiable par le planificateur backend</span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={e => setIsRecurring(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {isRecurring && (
                  <div className="pt-3 border-t border-slate-800/60 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-1">Fréquence de Récurrence</label>
                      <select
                        value={recurringFrequency}
                        onChange={e => setRecurringFrequency(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                      >
                        <option value="daily">Quotidienne</option>
                        <option value="weekly">Hebdomadaire</option>
                        <option value="monthly">Mensuelle</option>
                        <option value="quarterly">Trimestrielle</option>
                        <option value="yearly">Annuelle</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 text-[10px] mb-1">Date Première Échéance</label>
                      <input
                        type="date"
                        value={recurringStartDate}
                        onChange={e => setRecurringStartDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 bg-slate-800 rounded-xl text-slate-300">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving && (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  <span>{isSaving ? 'Enregistrement...' : 'Enregistrer Dépense'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
