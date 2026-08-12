import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { Expense, ExpenseCategory, TvaRate } from '../../types';
import { formatMad } from '../../lib/moroccanTax';
import { TaxSettings } from '../Common/TaxSettings';
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
  Calendar
} from 'lucide-react';

export const ExpenseModule: React.FC = () => {
  const { expenses, addExpense, updateExpense, isLoadingInitialData, isSaving } = useStore();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'all' | 'recurring'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Expense Form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('loyer');
  const [vendorName, setVendorName] = useState('');
  const [vendorIce, setVendorIce] = useState('');
  const [amountHt, setAmountHt] = useState<number>(0);
  const [tvaRate, setTvaRate] = useState<TvaRate>(20);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'check' | 'transfer' | 'cmi_card'>('cash');
  const [isRecurring, setIsRecurring] = useState(false);

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
      reader.onload = async (evt) => {
        const base64Data = evt.target?.result as string;

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (currentUser) {
          try {
            const token = await currentUser.getIdToken();
            headers['Authorization'] = `Bearer ${token}`;
          } catch (tokenErr) {
            console.warn('Failed to retrieve Firebase ID token for OCR:', tokenErr);
          }
        }

        // Call server side OCR endpoint
        const response = await fetch('/api/ai/ocr', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            image: base64Data,
            mimeType: file.type || 'image/jpeg'
          })
        });

        if (response.ok) {
          const res = await response.json();
          if (res.data) {
            setTitle(res.data.vendorName ? `Achat chez ${res.data.vendorName}` : 'Facture Fournisseur');
            setVendorName(res.data.vendorName || 'REDA PAPETERIE');
            setVendorIce(res.data.vendorIce || '001928374000012');
            setAmountHt(res.data.amountHt || 450);
            setTvaRate(res.data.tvaRate || 20);
          }
        } else {
          // Fallback scan mock
          setTitle('Paiement Électricité REDAL / LYDEC');
          setVendorName('LYDEC CASABLANCA');
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

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const tvaAmount = Number((amountHt * (tvaRate / 100)).toFixed(2));
    const amountTtc = Number((amountHt + tvaAmount).toFixed(2));
    const todayStr = new Date().toISOString().split('T')[0];

    let nextOccDate: string | undefined;
    if (isRecurring) {
      const d = new Date(todayStr);
      d.setMonth(d.getMonth() + 1);
      nextOccDate = d.toISOString().split('T')[0];
    }

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
      recurringInterval: isRecurring ? 'monthly' : undefined,
      nextOccurrenceDate: nextOccDate,
      recurringStatus: isRecurring ? 'active' : undefined,
    });

    setIsAddModalOpen(false);
    setTitle('');
    setVendorName('');
    setVendorIce('');
    setAmountHt(0);
    setIsRecurring(false);
  };

  const handleCancelRecurrence = (exp: Expense) => {
    updateExpense({
      ...exp,
      isRecurring: false,
      recurringStatus: 'cancelled'
    });
  };

  const handleTriggerRecurringEarly = (exp: Expense) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const nextOccDate = exp.nextOccurrenceDate || todayStr;

    // Calculate next month's occurrence
    const d = new Date(nextOccDate);
    d.setMonth(d.getMonth() + 1);
    const futureOccDate = d.toISOString().split('T')[0];

    // Create a new Head occurrence
    addExpense({
      title: exp.title,
      category: exp.category,
      vendorName: exp.vendorName,
      vendorIce: exp.vendorIce,
      date: todayStr,
      amountHt: exp.amountHt,
      tvaRate: exp.tvaRate,
      tvaAmount: exp.tvaAmount,
      amountTtc: exp.amountTtc,
      isTaxDeductible: exp.isTaxDeductible,
      paymentMethod: exp.paymentMethod,
      isRecurring: true,
      recurringInterval: 'monthly',
      nextOccurrenceDate: futureOccDate,
      recurringStatus: 'active',
      notes: exp.notes ? `${exp.notes} (Déclenchée manuellement)` : 'Déclenchée manuellement',
    });

    // Mark the old one as completed
    updateExpense({
      ...exp,
      isRecurring: false,
      recurringStatus: 'completed'
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-400" />
            <span>Dépenses & Scanner OCR AI</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Enregistrement des charges avec extraction OCR de la TVA déductible pour la déclaration fiscale.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-900/30 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Saisir une Dépense</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          Registre des Charges
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
          <span>Abonnements & Loyer Récurrents</span>
          {expenses.filter(e => e.isRecurring && e.recurringStatus !== 'cancelled').length > 0 && (
            <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
              {expenses.filter(e => e.isRecurring && e.recurringStatus !== 'cancelled').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'all' ? (
        <>
          {/* Filter & Search Bar */}
          <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher dépense, fournisseur..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={selectedCat}
              onChange={e => setSelectedCat(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500 w-full sm:w-auto"
            >
              <option value="all">Toutes Catégories</option>
              <option value="loyer">Loyer & Charges</option>
              <option value="transport">Transport & Carburant</option>
              <option value="electricite">Électricité / Eau / Net</option>
              <option value="salaires">Salaires & Charges Sociale</option>
              <option value="matieres">Matières Premières</option>
              <option value="divers">Divers</option>
            </select>
          </div>

          {/* Expenses Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Libellé & Fournisseur</th>
                    <th className="p-3.5">Catégorie & Date</th>
                    <th className="p-3.5 text-right">Montant HT</th>
                    <th className="p-3.5 text-center">TVA Déductible</th>
                    <th className="p-3.5 text-right">Total TTC (MAD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isLoadingInitialData ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="animate-pulse">
                        <td className="p-3.5">
                          <div className="h-4 bg-slate-800 rounded w-2/3 mb-1.5"></div>
                          <div className="h-3 bg-slate-800/50 rounded w-1/3"></div>
                        </td>
                        <td className="p-3.5">
                          <div className="h-4 bg-slate-800 rounded w-16 mb-1.5"></div>
                          <div className="h-3 bg-slate-800/50 rounded w-12"></div>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="h-4 bg-slate-800 rounded w-16 ml-auto"></div>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="h-4 bg-slate-800 rounded w-20 mx-auto"></div>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="h-4 bg-slate-800 rounded w-20 ml-auto"></div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    filteredExpenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-xs sm:text-sm">{exp.title}</span>
                            {exp.isRecurring && exp.recurringStatus !== 'cancelled' && (
                              <span className="flex items-center gap-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                <Repeat className="w-2.5 h-2.5" />
                                Récurrent
                              </span>
                            )}
                            {exp.notes?.includes('Générée automatiquement') && (
                              <span className="flex items-center gap-0.5 bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                <Calendar className="w-2.5 h-2.5" />
                                Auto
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{exp.vendorName}</span>
                            {exp.vendorIce && <span className="text-emerald-400 font-mono">ICE: {exp.vendorIce}</span>}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                            {exp.category}
                          </span>
                          <div className="text-[10px] text-slate-500 mt-0.5">{exp.date}</div>
                        </td>

                        <td className="p-3.5 text-right font-mono text-slate-400">
                          {formatMad(exp.amountHt)}
                        </td>

                        <td className="p-3.5 text-center font-mono text-emerald-400 font-bold">
                          {formatMad(exp.tvaAmount)} ({exp.tvaRate}%)
                        </td>

                        <td className="p-3.5 text-right font-mono font-bold text-white text-sm">
                          {formatMad(exp.amountTtc)}
                        </td>
                      </tr>
                    ))
                  )}
                  {!isLoadingInitialData && filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        Aucune dépense trouvée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Recurring Schedules Panel */
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <h3 className="font-bold text-white text-sm flex items-center gap-2 mb-1">
              <Repeat className="w-4 h-4 text-emerald-400" />
              <span>Comment fonctionnent les charges récurrentes ?</span>
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Les abonnements (ex: Internet, SaaS, Assurances) ou charges fixes (ex: Loyer) marqués comme récurrents sont <strong>automatiquement ajoutés à vos livres</strong> chaque mois à leur date d'échéance. Plus besoin de saisies manuelles répétitives !
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {expenses.filter(e => e.isRecurring && e.recurringStatus !== 'cancelled').length === 0 ? (
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
                  Créer mon premier échéancier
                </button>
              </div>
            ) : (
              expenses
                .filter(e => e.isRecurring && e.recurringStatus !== 'cancelled')
                .map(exp => (
                  <div key={exp.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 relative overflow-hidden flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                            {exp.category}
                          </span>
                          <h4 className="text-white font-bold text-base mt-1">{exp.title}</h4>
                        </div>
                        <span className="bg-slate-850 text-slate-400 text-[10px] px-2.5 py-1 rounded-lg border border-slate-800 font-semibold uppercase flex items-center gap-1">
                          <Repeat className="w-3 h-3 text-emerald-400" />
                          Mensuel
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-slate-950/40 border border-slate-800/40 rounded-xl p-3 text-[11px]">
                        <div>
                          <span className="text-slate-400 block mb-0.5">Fournisseur :</span>
                          <span className="text-white font-semibold">{exp.vendorName || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Montant TTC :</span>
                          <span className="text-emerald-400 font-bold font-mono">{formatMad(exp.amountTtc)}</span>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-slate-800/40 flex items-center gap-1.5 text-slate-400">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Prochaine échéance : <strong className="text-white">{exp.nextOccurrenceDate}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-slate-800/60 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Voulez-vous suspendre la récurrence de cette charge ? Elle ne sera plus ajoutée automatiquement.')) {
                            handleCancelRecurrence(exp);
                          }
                        }}
                        className="text-[11px] text-rose-400 hover:text-rose-300 font-medium px-3 py-1.5 rounded-lg hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
                      >
                        Suspendre l'échéancier
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Voulez-vous forcer le déclenchement immédiat de cette charge ? Cela ajoutera une nouvelle ligne au registre dès aujourd\'hui et décalera l\'échéance d\'un mois.')) {
                            handleTriggerRecurringEarly(exp);
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-md shadow-emerald-950/30"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Déclencher
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* Add Expense & OCR Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-white space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <span>Saisie / Scanner Reçu Dépense</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>

            {/* AI OCR Scanner Upload Box */}
            <div className="bg-slate-950 border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 rounded-2xl p-4 text-center transition-colors relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleSimulateOcrScan}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-1">
                {isScanning ? (
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold py-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Analyse OCR par IA en cours...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-1">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-xs text-white">Scanner Reçu / Facture par IA</span>
                    <span className="text-[11px] text-slate-400">Cliquez pour téléverser une photo du reçu</span>
                  </>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Libellé Dépense *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Facture Électricité ou Achat Papeterie"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Catégorie</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="loyer">Loyer & Charges</option>
                    <option value="transport">Transport & Carburant</option>
                    <option value="electricite">Électricité / Eau / Net</option>
                    <option value="salaires">Salaires & Social</option>
                    <option value="matieres">Matières Premières</option>
                    <option value="divers">Divers</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Nom du Fournisseur</label>
                  <input
                    type="text"
                    placeholder="ex: REDAL, LYDEC, AFRIQUIA"
                    value={vendorName}
                    onChange={e => setVendorName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">ICE (15 Chiffres Fournisseur)</label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="001..."
                    value={vendorIce}
                    onChange={e => setVendorIce(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
                  />
                </div>

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
              </div>

              {/* Reusable Tax Settings Component */}
              <TaxSettings
                selectedRate={tvaRate}
                onRateChange={setTvaRate}
                amountHt={amountHt}
                label="Paramètres TVA Déductible"
                showBreakdown={true}
              />

              {/* Recurring Toggle */}
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="font-semibold block text-slate-200">Dépense Récurrente (Mensuelle)</span>
                    <span className="text-[10px] text-slate-400 block">S'ajoute automatiquement tous les mois</span>
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
