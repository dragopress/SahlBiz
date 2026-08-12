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
    openWhatsAppModal,
    documents,
    isLoadingInitialData,
    isSaving
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'kreddy' | 'b2b'>('all');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [paymentModalCustomer, setPaymentModalCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');

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

  const handleRecordKreddyPayment = () => {
    if (!paymentModalCustomer) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    adjustKreddyBalance(paymentModalCustomer.id, -amount);
    setPaymentModalCustomer(null);
    setPaymentAmount('');
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

                      <td className="p-3.5 text-right font-mono text-slate-600 font-medium">
                        {formatMad(cust.creditLimit)}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className={`font-black font-mono text-sm ${cust.kreddyBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {formatMad(cust.kreddyBalance)}
                        </div>

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
      {historyCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded w-full max-w-2xl p-6 shadow-xl text-slate-900 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold">{historyCustomer.name}</h3>
                <p className="text-xs text-slate-500">Historique des opérations & factures</p>
              </div>
              <button onClick={() => setHistoryCustomer(null)} className="text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {documents.filter(d => d.customerId === historyCustomer.id).length === 0 ? (
                <p className="text-slate-500 py-4 text-center">Aucune facture enregistrée pour ce client.</p>
              ) : (
                documents.filter(d => d.customerId === historyCustomer.id).map(doc => (
                  <div key={doc.id} className="p-3 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{doc.number} ({doc.type.toUpperCase()})</div>
                      <div className="text-[11px] text-slate-500">{doc.date} &bull; Status: {doc.status}</div>
                    </div>
                    <div className="text-right font-mono font-bold text-slate-900">
                      {formatMad(doc.totalTtc)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
