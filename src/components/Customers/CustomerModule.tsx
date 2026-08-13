import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Customer } from '../../types';
import { formatMad } from '../../lib/moroccanTax';
import { useIceValidation } from '../../hooks/useIceValidation';
import {
  Users,
  Plus,
  Search,
  MessageSquare,
  CreditCard,
  Building2,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  History,
  TrendingDown,
  ShieldCheck
} from 'lucide-react';

export const CustomerModule: React.FC = () => {
  const {
    customers,
    addCustomer,
    updateCustomer,
    adjustKreddyBalance,
    creditLedgerEntries,
    addCreditLedgerEntry,
    openWhatsAppModal,
    documents,
    isLoadingInitialData,
    isSaving,
    profile
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'kreddy' | 'b2b'>('all');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [paymentModalCustomer, setPaymentModalCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [historyTab, setHistoryTab] = useState<'ledger' | 'documents' | 'actions'>('ledger');
  const [adjustmentType, setAdjustmentType] = useState<'plus' | 'minus'>('plus');
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>('');
  const [adjustmentNotes, setAdjustmentNotes] = useState<string>('');

  // ICE Validation Hook for Customer Form
  const iceValidation = useIceValidation('');

  // New Customer Form State
  const [newCust, setNewCust] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: 'Casablanca',
    pricingTier: 'standard' as 'standard' | 'wholesale' | 'vip',
    creditLimit: 2000,
    notes: '',
  });

  // Filter logic
  const filteredCustomers = customers.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.ice && c.ice.includes(searchTerm));

    if (!matchesSearch) return false;
    if (filterType === 'kreddy') return c.kreddyBalance > 0;
    if (filterType === 'b2b') return !!c.ice && c.ice.length > 0;
    return true;
  });

  const totalKreddyOwed = customers.reduce((sum, c) => sum + c.kreddyBalance, 0);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (iceValidation.ice.trim() && !iceValidation.isValid) {
      return;
    }

    addCustomer({
      ...newCust,
      ice: iceValidation.formattedIce,
    });

    setIsAddModalOpen(false);
    iceValidation.setIce('');
    setNewCust({
      name: '',
      phone: '',
      email: '',
      address: '',
      city: 'Casablanca',
      pricingTier: 'standard',
      creditLimit: 2000,
      notes: '',
    });
  };

  // Overdue Balance helper
  const getOverdueBalance = (customerId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const overdueInvoices = documents.filter(d => 
      d.customerId === customerId &&
      d.type === 'facture' &&
      d.paymentMethod === 'kreddy' &&
      d.status !== 'paid' &&
      d.status !== 'cancelled' &&
      d.dueDate && d.dueDate < today
    );
    return overdueInvoices.reduce((sum, d) => sum + (d.remainingAmount || 0), 0);
  };

  const handleManualCreditAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyCustomer) return;
    const amount = parseFloat(adjustmentAmount);
    if (isNaN(amount) || amount <= 0) return;

    const changeType = adjustmentType === 'plus' ? 'adjustment_plus' : 'adjustment_minus';
    const finalAmountChange = adjustmentType === 'plus' ? amount : -amount;

    await adjustKreddyBalance(
      historyCustomer.id,
      finalAmountChange,
      adjustmentNotes || 'Ajustement manuel de crédit',
      'manual',
      undefined,
      changeType as any
    );

    setAdjustmentAmount('');
    setAdjustmentNotes('');
  };

  const handleRecordKreddyPayment = () => {
    if (!paymentModalCustomer) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    adjustKreddyBalance(
      paymentModalCustomer.id, 
      -amount, 
      paymentNotes || 'Règlement Kreddy', 
      'payment'
    );
    setPaymentModalCustomer(null);
    setPaymentAmount('');
    setPaymentNotes('');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-slate-900">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <span>Clients & Carnet de Crédit (Kreddy)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Suivi des créances clients, limites de crédit et relances WhatsApp en Darija.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded transition-all shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Client</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 p-5 rounded shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Total Crédit Clients (Kreddy)</span>
          <div className="text-2xl font-black text-rose-600">{formatMad(totalKreddyOwed)}</div>
          <span className="text-xs text-slate-500 block mt-1">
            {customers.filter(c => c.kreddyBalance > 0).length} clients en créance
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Total Clients Enregistrés</span>
          <div className="text-2xl font-black text-slate-900">{customers.length}</div>
          <span className="text-xs text-slate-500 block mt-1">
            {customers.filter(c => c.ice).length} Clients Entreprises B2B (avec ICE)
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Relance Massique WhatsApp</span>
          <button
            onClick={() => {
              const debtors = customers.filter(c => c.kreddyBalance > 0);
              if (debtors.length > 0) {
                const first = debtors[0];
                openWhatsAppModal(
                  first.phone,
                  first.name,
                  `Salam ${first.name}, rappele SahlBiz: bqat ${first.kreddyBalance} MAD f l'kreddy. Tqder tkhallesha f l'mahal. Shukran!`
                );
              }
            }}
            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Relancer premier débiteur</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher nom, téléphone, ICE..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
              filterType === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            Tous ({customers.length})
          </button>
          <button
            onClick={() => setFilterType('kreddy')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
              filterType === 'kreddy' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            En Kreddy ({customers.filter(c => c.kreddyBalance > 0).length})
          </button>
          <button
            onClick={() => setFilterType('b2b')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
              filterType === 'b2b' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            B2B / ICE ({customers.filter(c => !!c.ice).length})
          </button>
        </div>
      </div>

      {/* Customer List Table */}
      <div className="bg-white border border-slate-200 rounded shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Client & ICE</th>
                <th className="p-3.5">Téléphone & Ville</th>
                <th className="p-3.5">Tarif</th>
                <th className="p-3.5 text-right">Limite Crédit</th>
                <th className="p-3.5 text-right">Solde Kreddy (MAD)</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingInitialData ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="p-3.5">
                      <div className="h-4 bg-slate-200 rounded w-2/3 mb-1.5"></div>
                      <div className="h-3 bg-slate-100 rounded w-1/3"></div>
                    </td>
                    <td className="p-3.5">
                      <div className="h-4 bg-slate-200 rounded w-1/2 mb-1.5"></div>
                      <div className="h-3 bg-slate-100 rounded w-1/4"></div>
                    </td>
                    <td className="p-3.5">
                      <div className="h-4 bg-slate-200 rounded w-16"></div>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="h-4 bg-slate-200 rounded w-20 ml-auto"></div>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="h-4 bg-slate-200 rounded w-24 ml-auto"></div>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="h-8 bg-slate-200 rounded w-20 mx-auto"></div>
                    </td>
                  </tr>
                ))
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                    Aucun client trouvé.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(cust => {
                  const creditRatio = Math.min(100, (cust.kreddyBalance / (cust.creditLimit || 1)) * 100);

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">{cust.name}</div>
                        {cust.ice ? (
                          <div className="text-[11px] text-indigo-600 font-mono flex items-center gap-1 mt-0.5 font-medium">
                            <Building2 className="w-3 h-3" /> ICE: {cust.ice}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400">Client Particulier</div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <Phone className="w-3 h-3 text-slate-400" /> {cust.phone}
                        </div>
                        {cust.address && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 truncate max-w-[180px]">
                            <MapPin className="w-3 h-3 text-slate-400" /> {cust.address}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          cust.pricingTier === 'wholesale' ? 'bg-purple-100 text-purple-800' :
                          cust.pricingTier === 'vip' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {cust.pricingTier === 'wholesale' ? 'Gros' : cust.pricingTier === 'vip' ? 'VIP' : 'Détail'}
                        </span>
                      </td>

                      <td className="p-3.5 text-right font-mono text-xs text-slate-600 font-medium">
                        <div>{formatMad(cust.creditLimit)}</div>
                        <div className="text-[10px] text-emerald-600 font-bold">
                          Disp: {formatMad(Math.max(0, Number((cust.creditLimit - cust.kreddyBalance).toFixed(2))))}
                        </div>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className={`font-black font-mono text-sm ${cust.kreddyBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {formatMad(cust.kreddyBalance)}
                        </div>

                        {getOverdueBalance(cust.id) > 0 && (
                          <div className="text-[10px] text-rose-600 font-bold font-mono">
                            Échu: {formatMad(getOverdueBalance(cust.id))}
                          </div>
                        )}

                        {cust.kreddyBalance > 0 && (
                          <div className="w-24 ml-auto bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full ${creditRatio > 80 ? 'bg-rose-600' : 'bg-amber-500'}`}
                              style={{ width: `${creditRatio}%` }}
                            />
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* WhatsApp Reminder button */}
                          <button
                            onClick={() => openWhatsAppModal(
                              cust.phone,
                              cust.name,
                              `Salam ${cust.name}, f reminder sghir men SahlBiz: bqat ${cust.kreddyBalance} MAD f l'kreddy. Tqder tkhallesha f l'mahal wla virement. Shukran!`
                            )}
                            title="Envoyer Rappel WhatsApp"
                            className="p-1.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Encaisser Kreddy payment */}
                          {cust.kreddyBalance > 0 && (
                            <button
                              onClick={() => setPaymentModalCustomer(cust)}
                              title="Encaisser un Règlement Kreddy"
                              className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-colors flex items-center gap-1"
                            >
                              <TrendingDown className="w-3 h-3" />
                              <span>Encaisser</span>
                            </button>
                          )}

                          {/* Client History */}
                          <button
                            onClick={() => setHistoryCustomer(cust)}
                            title="Historique des Factures"
                            className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded w-full max-w-lg p-6 shadow-xl text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Nouveau Client SahlBiz</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nom Complet / Raison Sociale *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Youssef El Amrani ou Café Atlas SARL"
                  value={newCust.name}
                  onChange={e => setNewCust({ ...newCust, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Téléphone (WhatsApp) *</label>
                  <input
                    type="text"
                    required
                    placeholder="+212 6..."
                    value={newCust.phone}
                    onChange={e => setNewCust({ ...newCust, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-bold">ICE (15 Chiffres B2B)</label>
                    {!iceValidation.isEmpty && (
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        {iceValidation.digitCount}/15
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="ex: 001892341000085"
                      value={iceValidation.ice}
                      onChange={e => iceValidation.setIce(e.target.value)}
                      className={`w-full bg-slate-50 border rounded px-3 py-2 font-mono text-slate-900 focus:outline-none transition-colors ${
                        iceValidation.isEmpty
                          ? 'border-slate-200 focus:border-indigo-600'
                          : iceValidation.isValid
                          ? 'border-emerald-500 bg-emerald-50/30 text-emerald-950 font-bold'
                          : 'border-rose-400 bg-rose-50/30'
                      }`}
                    />
                    {iceValidation.isValid && !iceValidation.isEmpty && (
                      <ShieldCheck className="w-4 h-4 text-emerald-600 absolute right-3 top-2.5" />
                    )}
                  </div>

                  {/* Real-time Progress bar & Feedback */}
                  {!iceValidation.isEmpty && (
                    <div className="mt-1.5 space-y-1">
                      <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            iceValidation.isValid ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${iceValidation.progressPercentage}%` }}
                        />
                      </div>
                      {iceValidation.error && (
                        <p className="text-rose-600 text-[10px] flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{iceValidation.error}</span>
                        </p>
                      )}
                      {iceValidation.successMessage && (
                        <p className="text-emerald-700 text-[10px] flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-600" />
                          <span>{iceValidation.successMessage}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tarif Client</label>
                  <select
                    value={newCust.pricingTier}
                    onChange={e => setNewCust({ ...newCust, pricingTier: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-600"
                  >
                    <option value="standard">Standard (Détail)</option>
                    <option value="wholesale">Gros (Wholesale)</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Plafond Crédit (MAD)</label>
                  <input
                    type="number"
                    value={newCust.creditLimit}
                    onChange={e => setNewCust({ ...newCust, creditLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Adresse Complexe</label>
                <input
                  type="text"
                  placeholder="ex: Bd Zerktouni N 142, Casablanca"
                  value={newCust.address}
                  onChange={e => setNewCust({ ...newCust, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving && (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  <span>{isSaving ? 'Enregistrement...' : 'Enregistrer Client'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Kreddy Payment Modal */}
      {paymentModalCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded w-full max-w-md p-6 shadow-xl text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2 text-indigo-600">
                <CreditCard className="w-5 h-5" />
                <span>Encaisser un Règlement Kreddy</span>
              </h3>
              <button
                onClick={() => setPaymentModalCustomer(null)}
                className="text-slate-400 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs space-y-1">
              <div className="text-slate-600">Client: <span className="text-slate-900 font-bold">{paymentModalCustomer.name}</span></div>
              <div className="text-slate-600">Solde Kreddy Actuel: <span className="text-rose-600 font-black font-mono">{formatMad(paymentModalCustomer.kreddyBalance)}</span></div>
            </div>

            <div>
              <label className="block text-slate-700 text-xs font-bold mb-1">Montant Encaissé (MAD)</label>
              <input
                type="number"
                placeholder={`Max: ${paymentModalCustomer.kreddyBalance}`}
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 text-xs font-bold mb-1">Notes / Référence (Optionnel)</label>
              <input
                type="text"
                placeholder="ex: Espèces, Virement N°123, Chèque"
                value={paymentNotes}
                onChange={e => setPaymentNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setPaymentModalCustomer(null)}
                className="px-4 py-2 rounded bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Annuler
              </button>
              <button
                onClick={handleRecordKreddyPayment}
                className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                Valider l'Encaissement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client History Modal */}
      {historyCustomer && (() => {
        const entries = creditLedgerEntries.filter(e => e.customerId === historyCustomer.id);
        const openingBalance = entries.filter(e => e.type === 'opening_balance').reduce((sum, e) => sum + e.amount, 0);
        const creditSales = entries.filter(e => e.type === 'credit_sale').reduce((sum, e) => sum + e.amount, 0);
        const payments = entries.filter(e => e.type === 'payment').reduce((sum, e) => sum + e.amount, 0);
        const returns = entries.filter(e => e.type === 'return').reduce((sum, e) => sum + e.amount, 0);
        const adjustmentsPlus = entries.filter(e => e.type === 'adjustment_plus').reduce((sum, e) => sum + e.amount, 0);
        const adjustmentsMinus = entries.filter(e => e.type === 'adjustment_minus').reduce((sum, e) => sum + e.amount, 0);
        const endingBalance = Number((openingBalance + creditSales - payments - returns + adjustmentsPlus - adjustmentsMinus).toFixed(2));

        const sortedEntries = [...entries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        let running = 0;
        const entriesWithRunning = sortedEntries.map(e => {
          const isAdd = e.type === 'opening_balance' || e.type === 'credit_sale' || e.type === 'adjustment_plus';
          const delta = isAdd ? e.amount : -e.amount;
          running = Number((running + delta).toFixed(2));
          return { ...e, runningBalance: running };
        }).reverse();

        const overdueBalanceVal = getOverdueBalance(historyCustomer.id);
        const availableCreditVal = Math.max(0, Number((historyCustomer.creditLimit - historyCustomer.kreddyBalance).toFixed(2)));

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded w-full max-w-3xl p-6 shadow-xl text-slate-900 space-y-4 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{historyCustomer.name}</h3>
                  <p className="text-xs text-slate-500">
                    Grand Livre de Crédit &bull; {historyCustomer.phone} {historyCustomer.ice ? `&bull; ICE: ${historyCustomer.ice}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setHistoryCustomer(null);
                    setHistoryTab('ledger');
                  }}
                  className="text-slate-400 hover:text-slate-900 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sub-Navigation Tabs */}
              <div className="flex items-center gap-1 border-b border-slate-100 pb-2">
                <button
                  onClick={() => setHistoryTab('ledger')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                    historyTab === 'ledger' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Grand Livre & Relevé
                </button>
                <button
                  onClick={() => setHistoryTab('documents')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                    historyTab === 'documents' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Factures & Pièces ({documents.filter(d => d.customerId === historyCustomer.id).length})
                </button>
                <button
                  onClick={() => setHistoryTab('actions')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                    historyTab === 'actions' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Rappels & Ajustements Manuels
                </button>
              </div>

              {/* TAB 1: Ledger & Statement */}
              {historyTab === 'ledger' && (
                <div className="space-y-4 text-xs">
                  {/* Credit Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded border border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Limite de Crédit</span>
                      <span className="text-sm font-black font-mono text-slate-800">{formatMad(historyCustomer.creditLimit)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Crédit Disponible</span>
                      <span className="text-sm font-black font-mono text-emerald-600">{formatMad(availableCreditVal)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Crédit Utilisé</span>
                      <span className="text-sm font-black font-mono text-rose-600">{formatMad(historyCustomer.kreddyBalance)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Crédit Échu (Overdue)</span>
                      <span className={`text-sm font-black font-mono ${overdueBalanceVal > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                        {formatMad(overdueBalanceVal)}
                      </span>
                    </div>
                  </div>

                  {/* Statement of Account Summary Block */}
                  <div className="border border-slate-200 rounded p-4 bg-white shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-bold text-slate-800 text-xs">Tableau Récapitulatif du Compte</span>
                      <button
                        onClick={() => {
                          const printWindow = window.open('', '_blank');
                          if (printWindow) {
                            const html = `
                              <html>
                                <head>
                                  <title>Relevé de Compte - ${historyCustomer.name}</title>
                                  <style>
                                    body { font-family: system-ui, sans-serif; padding: 40px; color: #1e293b; }
                                    .header { display: flex; justify-content: space-between; border-b: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
                                    .company { font-weight: bold; }
                                    .title { font-size: 24px; font-weight: 800; text-transform: uppercase; color: #4f46e5; }
                                    .client-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; margin-bottom: 25px; }
                                    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
                                    .summary-card { border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; background: #fff; text-align: center; }
                                    .summary-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; }
                                    .summary-val { font-size: 16px; font-weight: bold; margin-top: 4px; }
                                    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                                    th { background: #f1f5f9; font-weight: bold; padding: 10px; border-bottom: 2px solid #cbd5e1; text-align: left; font-size: 12px; }
                                    td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
                                    .text-right { text-align: right; }
                                    .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
                                  </style>
                                </head>
                                <body>
                                  <div class="header">
                                    <div>
                                      <div class="company">${profile?.name || 'SahlBiz SaaS Merchant'}</div>
                                      <div>ICE: ${profile?.ice || 'N/A'}</div>
                                      <div>Email: ${profile?.email || ''} &bull; Tél: ${profile?.phone || ''}</div>
                                    </div>
                                    <div class="text-right">
                                      <div class="title">Relevé de Compte Client</div>
                                      <div>Date d'édition: ${new Date().toLocaleDateString('fr-FR')}</div>
                                    </div>
                                  </div>

                                  <div class="client-card">
                                    <strong>Destinataire (Client):</strong>
                                    <div>${historyCustomer.name}</div>
                                    ${historyCustomer.ice ? `<div>ICE: ${historyCustomer.ice}</div>` : ''}
                                    <div>Tél: ${historyCustomer.phone}</div>
                                    ${historyCustomer.address ? `<div>Adresse: ${historyCustomer.address}</div>` : ''}
                                  </div>

                                  <div class="summary-grid">
                                    <div class="summary-card">
                                      <div class="summary-label">Report Solde d'Ouverture</div>
                                      <div class="summary-val">${formatMad(openingBalance)}</div>
                                    </div>
                                    <div class="summary-card">
                                      <div class="summary-label">Total Ventes Crédit</div>
                                      <div class="summary-val">${formatMad(creditSales)}</div>
                                    </div>
                                    <div class="summary-card">
                                      <div class="summary-label">Total Règlements Encaissés</div>
                                      <div class="summary-val">${formatMad(payments)}</div>
                                    </div>
                                    <div class="summary-card font-black">
                                      <div class="summary-label">Solde de Clôture Dû</div>
                                      <div class="summary-val" style="color: #e11d48;">${formatMad(endingBalance)}</div>
                                    </div>
                                  </div>

                                  <h3>Détail des Écritures du Grand Livre (Mouvements)</h3>
                                  <table>
                                    <thead>
                                      <tr>
                                        <th>Date & Heure</th>
                                        <th>Type</th>
                                        <th>Référence</th>
                                        <th>Notes / Motif</th>
                                        <th class="text-right">Débit (+)</th>
                                        <th class="text-right">Crédit (-)</th>
                                        <th class="text-right">Solde Cumulé</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      ${entriesWithRunning.map(e => {
                                        const isDebit = e.type === 'opening_balance' || e.type === 'credit_sale' || e.type === 'adjustment_plus';
                                        return `
                                          <tr>
                                            <td>${new Date(e.createdAt).toLocaleString('fr-FR')}</td>
                                            <td><strong>${e.type.toUpperCase()}</strong></td>
                                            <td>${e.referenceType ? `${e.referenceType.toUpperCase()} (${e.referenceId || ''})` : 'Direct'}</td>
                                            <td>${e.notes || ''}</td>
                                            <td class="text-right">${isDebit ? formatMad(e.amount) : '-'}</td>
                                            <td class="text-right">${!isDebit ? formatMad(e.amount) : '-'}</td>
                                            <td class="text-right"><strong>${formatMad(e.runningBalance)}</strong></td>
                                          </tr>
                                        `;
                                      }).join('')}
                                    </tbody>
                                  </table>

                                  <div class="footer">
                                    SahlBiz Cloud Merchant ERP - Relevé certifié et non éditable &bull; Merci de régler vos soldes échus sous quinzaine.
                                  </div>
                                  <script>window.print();</script>
                                </body>
                              </html>
                            `;
                            printWindow.document.write(html);
                            printWindow.document.close();
                          }
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide rounded bg-slate-900 hover:bg-black text-white transition-all flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4" />
                        </svg>
                        <span>Imprimer le Relevé (PDF)</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                      <div className="bg-slate-50 p-2 rounded">
                        <span className="text-[10px] text-slate-500 block">Solde d'Ouverture</span>
                        <span className="font-bold font-mono text-slate-800">{formatMad(openingBalance)}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded">
                        <span className="text-[10px] text-slate-500 block">Ventes Crédit (+)</span>
                        <span className="font-bold font-mono text-slate-800">{formatMad(creditSales)}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded">
                        <span className="text-[10px] text-slate-500 block">Règlements (-)</span>
                        <span className="font-bold font-mono text-emerald-700">{formatMad(payments)}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded">
                        <span className="text-[10px] text-slate-500 block">Retours (-)</span>
                        <span className="font-bold font-mono text-amber-700">{formatMad(returns)}</span>
                      </div>
                      <div className="bg-indigo-50 p-2 rounded border border-indigo-100">
                        <span className="text-[10px] text-indigo-600 block font-bold">Solde Final dû</span>
                        <span className="font-black font-mono text-rose-600">{formatMad(endingBalance)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Transaction list of ledger entries */}
                  <div className="border border-slate-200 rounded overflow-hidden">
                    <div className="bg-slate-50 p-2.5 font-bold text-slate-700 border-b border-slate-200">
                      Écritures chronologiques du Grand Livre
                    </div>
                    <div className="max-h-[30vh] overflow-y-auto divide-y divide-slate-100">
                      {entriesWithRunning.length === 0 ? (
                        <p className="text-slate-500 py-6 text-center">Aucune écriture enregistrée dans le grand livre.</p>
                      ) : (
                        entriesWithRunning.map(e => {
                          const isDebit = e.type === 'opening_balance' || e.type === 'credit_sale' || e.type === 'adjustment_plus';
                          return (
                            <div key={e.id} className="p-3 hover:bg-slate-50/50 transition-colors flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${
                                    e.type === 'credit_sale' ? 'bg-amber-100 text-amber-800' :
                                    e.type === 'payment' ? 'bg-emerald-100 text-emerald-800' :
                                    e.type === 'opening_balance' ? 'bg-blue-100 text-blue-800' :
                                    e.type === 'return' ? 'bg-purple-100 text-purple-800' :
                                    'bg-slate-100 text-slate-800'
                                  }`}>
                                    {e.type}
                                  </span>
                                  {e.referenceType && (
                                    <span className="text-[10px] font-mono text-slate-400">
                                      [{e.referenceType.toUpperCase()}: {e.referenceId}]
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-500 text-[10px]">
                                  {new Date(e.createdAt).toLocaleString('fr-FR')} &bull; Par {e.createdBy}
                                </div>
                                {e.notes && <div className="text-slate-700 text-xs mt-0.5 font-medium">{e.notes}</div>}
                              </div>

                              <div className="text-right font-mono space-y-0.5 shrink-0">
                                <div className={`font-bold text-xs ${isDebit ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {isDebit ? '+' : '-'}{formatMad(e.amount)}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  Cumulé: {formatMad(e.runningBalance)}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Documents */}
              {historyTab === 'documents' && (
                <div className="space-y-2 text-xs">
                  {documents.filter(d => d.customerId === historyCustomer.id).length === 0 ? (
                    <p className="text-slate-500 py-8 text-center">Aucune facture ou document enregistré pour ce client.</p>
                  ) : (
                    documents.filter(d => d.customerId === historyCustomer.id).map(doc => (
                      <div key={doc.id} className="p-3 bg-slate-50 rounded border border-slate-200 flex items-center justify-between hover:bg-slate-100 transition-colors">
                        <div>
                          <div className="font-bold text-slate-900 text-xs sm:text-sm">
                            {doc.number} <span className="text-[10px] text-slate-500 uppercase tracking-wide bg-slate-200/60 px-1 py-0.5 rounded font-normal">{doc.type}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5">
                            <span>Émission: {doc.date}</span>
                            {doc.dueDate && (
                              <span className={doc.status !== 'paid' && new Date(doc.dueDate) < new Date() ? 'text-rose-600 font-bold' : ''}>
                                Échéance: {doc.dueDate}
                              </span>
                            )}
                            <span>Moyen: {doc.paymentMethod?.toUpperCase()}</span>
                          </div>
                        </div>

                        <div className="text-right font-mono space-y-0.5">
                          <div className="font-black text-xs text-slate-900">{formatMad(doc.totalTtc)}</div>
                          <div className={`text-[10px] font-bold uppercase tracking-wider ${
                            doc.status === 'paid' ? 'text-emerald-700' :
                            doc.status === 'partially_paid' ? 'text-amber-700' :
                            doc.status === 'cancelled' ? 'text-slate-400' : 'text-rose-700'
                          }`}>
                            {doc.status}
                          </div>
                          {doc.remainingAmount > 0 && (
                            <div className="text-[10px] text-slate-500">Reste: {formatMad(doc.remainingAmount)}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: Rappels & Ajustements */}
              {historyTab === 'actions' && (
                <div className="space-y-6 text-xs">
                  {/* WhatsApp Relances Section */}
                  <div className="bg-emerald-50/50 p-4 rounded border border-emerald-100 space-y-3">
                    <h4 className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      <span>Modèles de relances WhatsApp (Darija / Fr)</span>
                    </h4>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Envoyez une relance personnalisée instantanément sur WhatsApp. Les messages s'ouvriront directement sur le mobile ou l'application web du client.
                    </p>

                    <div className="space-y-2">
                      <div className="bg-white p-2.5 rounded border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-800">1. Rappel Amical de Routine (Darija)</div>
                          <div className="text-[11px] text-slate-500 italic">"Salam ${historyCustomer.name}, ntfekkro m3ak l'kreddy..."</div>
                        </div>
                        <button
                          onClick={() => openWhatsAppModal(
                            historyCustomer.phone,
                            historyCustomer.name,
                            `Salam ${historyCustomer.name}, ntfekkro m3ak l'kreddy bqa fih ${formatMad(historyCustomer.kreddyBalance)} f SahlBiz. Tqder tji l'mahal wla virement f d tasi'lat. Shukran bzff!`
                          )}
                          className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold tracking-wide text-[11px] uppercase transition-all shrink-0"
                        >
                          Envoyer Rappel
                        </button>
                      </div>

                      <div className="bg-white p-2.5 rounded border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="space-y-1">
                          <div className="font-bold text-rose-800">2. Relance Urgente Dette Échue (Darija)</div>
                          <div className="text-[11px] text-slate-500 italic">"Salam ${historyCustomer.name}, dak l'kreddy fih mblagh échu..."</div>
                        </div>
                        <button
                          onClick={() => openWhatsAppModal(
                            historyCustomer.phone,
                            historyCustomer.name,
                            `Salam ${historyCustomer.name}, bghina nfekkrok anna l'kreddy fih mblagh échu b ${formatMad(overdueBalanceVal)} (f majmou3 ${formatMad(historyCustomer.kreddyBalance)}). N'rejou d'khallas l'mablagh f l'mahal wla virement f d tasi'lat. Shukran bzff!`
                          )}
                          className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold tracking-wide text-[11px] uppercase transition-all shrink-0"
                        >
                          Envoyer d'urgence
                        </button>
                      </div>

                      <div className="bg-white p-2.5 rounded border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-800">3. Relevé de Compte Officiel (Français)</div>
                          <div className="text-[11px] text-slate-500 italic">"Bonjour ${historyCustomer.name}, veuillez trouver ci-joint votre relevé..."</div>
                        </div>
                        <button
                          onClick={() => openWhatsAppModal(
                            historyCustomer.phone,
                            historyCustomer.name,
                            `Bonjour ${historyCustomer.name}, l'équipe SahlBiz vous envoie votre relevé de compte mis à jour. Votre solde débiteur total est de ${formatMad(historyCustomer.kreddyBalance)} (dont ${formatMad(overdueBalanceVal)} échus). Merci pour votre règlement.`
                          )}
                          className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold tracking-wide text-[11px] uppercase transition-all shrink-0"
                        >
                          Envoyer Relevé
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Manuel adjustments form */}
                  <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-950">Ajustement Manuel d'Écritures (Gouvernance)</h4>
                    <p className="text-[11px] text-slate-500">
                      Utilisez ce formulaire pour ajuster manuellement le solde kreddy du client. Toutes les actions sont signées de votre e-mail et enregistrées de façon immutable dans le grand livre.
                    </p>

                    <form onSubmit={handleManualCreditAdjustment} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Opération</label>
                        <select
                          value={adjustmentType}
                          onChange={e => setAdjustmentType(e.target.value as any)}
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-bold"
                        >
                          <option value="plus font-bold">Ajouter Crédit (+)</option>
                          <option value="minus font-bold">Déduire Crédit (-)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Montant (MAD)</label>
                        <input
                          type="number"
                          required
                          step="0.01"
                          placeholder="ex: 150"
                          value={adjustmentAmount}
                          onChange={e => setAdjustmentAmount(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
                        />
                      </div>

                      <div className="sm:col-span-2 flex gap-2">
                        <div className="flex-1">
                          <label className="block text-slate-700 font-bold mb-1">Notes / Raison</label>
                          <input
                            type="text"
                            required
                            placeholder="ex: Correction d'erreur d'encaissement"
                            value={adjustmentNotes}
                            onChange={e => setAdjustmentNotes(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                          />
                        </div>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded bg-slate-900 hover:bg-black text-white font-bold uppercase tracking-wider text-[11px] shadow-xs cursor-pointer shrink-0 h-8 font-sans"
                        >
                          Ajuster
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

    </div>
  );
};
