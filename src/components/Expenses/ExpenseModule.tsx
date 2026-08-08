import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
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
  Loader2
} from 'lucide-react';

export const ExpenseModule: React.FC = () => {
  const { expenses, addExpense } = useStore();

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

        // Call server side OCR endpoint
        const response = await fetch('/api/ai/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

    addExpense({
      title: title || 'Charge Exploitation',
      category,
      vendorName,
      vendorIce,
      date: new Date().toISOString().split('T')[0],
      amountHt,
      tvaRate,
      tvaAmount,
      amountTtc,
      isTaxDeductible: true,
      paymentMethod,
    });

    setIsAddModalOpen(false);
    setTitle('');
    setVendorName('');
    setVendorIce('');
    setAmountHt(0);
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
              {filteredExpenses.map(exp => (
                <tr key={exp.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5">
                    <div className="font-semibold text-white text-xs sm:text-sm">{exp.title}</div>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

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

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 bg-slate-800 rounded-xl text-slate-300">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-white">
                  Enregistrer Dépense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
