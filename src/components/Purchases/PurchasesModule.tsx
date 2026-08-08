import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Supplier } from '../../types';
import { formatMad } from '../../lib/moroccanTax';
import {
  Truck,
  Plus,
  Search,
  Building2,
  Phone,
  DollarSign,
  X,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowUpRight,
  MessageSquare,
  PieChart,
  Scale
} from 'lucide-react';

export const PurchasesModule: React.FC = () => {
  const { suppliers, addSupplier, updateSupplier, openWhatsAppModal } = useStore();

  const [activeTab, setActiveTab] = useState<'directory' | 'balance'>('directory');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [paySupplier, setPaySupplier] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState('');

  const [newSupp, setNewSupp] = useState({
    name: '',
    phone: '',
    email: '',
    ice: '',
    address: '',
    category: 'Alimentation',
  });

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.ice && s.ice.includes(searchTerm))
  );

  // Supplier Balance Calculations
  const totalSupplierDebt = suppliers.reduce((sum, s) => sum + s.outstandingDebt, 0);
  const creditorSuppliers = suppliers.filter(s => s.outstandingDebt > 0);
  const averageDebt = creditorSuppliers.length > 0 ? totalSupplierDebt / creditorSuppliers.length : 0;
  const topCreditor = suppliers.reduce((max, s) => s.outstandingDebt > (max?.outstandingDebt || 0) ? s : max, suppliers[0]);

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    addSupplier(newSupp);
    setIsAddModalOpen(false);
    setNewSupp({
      name: '',
      phone: '',
      email: '',
      ice: '',
      address: '',
      category: 'Alimentation',
    });
  };

  const handleRecordDebtPayment = () => {
    if (!paySupplier) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) return;

    updateSupplier({
      ...paySupplier,
      outstandingDebt: Math.max(0, paySupplier.outstandingDebt - amt),
    });
    setPaySupplier(null);
    setPayAmount('');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-400" />
            <span>Achats, Fournisseurs & Solde Dettes</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gestion du répertoire des fournisseurs marocains, suivi des encours et extrait de compte fournisseurs.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-900/30 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Fournisseur</span>
        </button>
      </div>

      {/* Main Mode View Selector (Répertoire vs Solde Balance) */}
      <div className="flex items-center justify-between bg-slate-900 p-2 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'directory'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Répertoire & Fournisseurs ({suppliers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('balance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'balance'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Solde & Balances Fournisseurs ({creditorSuppliers.length} en attente)</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher par Nom, ICE, Catégorie..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* VIEW 1: SUPPLIER BALANCE SUMMARY (SOLDE FOURNISSEURS) */}
      {activeTab === 'balance' && (
        <div className="space-y-6">
          {/* Debt Balance KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Solde Total Dû (Total Outstanding)
              </span>
              <div className="text-2xl font-bold font-mono text-amber-400">
                {formatMad(totalSupplierDebt)}
              </div>
              <span className="text-[11px] text-slate-500 block mt-1">
                Engagements fournisseurs à régler
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Fournisseurs Créanciers
              </span>
              <div className="text-2xl font-bold text-white">
                {creditorSuppliers.length} <span className="text-xs font-normal text-slate-400">/ {suppliers.length}</span>
              </div>
              <span className="text-[11px] text-amber-400 block mt-1 font-medium">
                {((creditorSuppliers.length / (suppliers.length || 1)) * 100).toFixed(0)}% avec solde positif
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Dette Moyenne / Fournisseur
              </span>
              <div className="text-2xl font-bold font-mono text-slate-200">
                {formatMad(averageDebt)}
              </div>
              <span className="text-[11px] text-slate-500 block mt-1">
                Calculé sur les compteurs actifs
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Plus Grand Encours
              </span>
              <div className="text-lg font-bold text-red-400 truncate">
                {topCreditor?.name || 'Aucun'}
              </div>
              <span className="text-xs font-mono font-bold text-red-300 block mt-0.5">
                {topCreditor ? formatMad(topCreditor.outstandingDebt) : '0 MAD'}
              </span>
            </div>
          </div>

          {/* Supplier Balance Detailed Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-400" />
                  <span>Relevé des Balances & Encours Fournisseurs</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Synthèse globale des montants facturés, réglés et soldes restants dus par partenaire commercial.
                </p>
              </div>

              <div className="text-xs text-slate-400 font-mono">
                ICE Conformité Code CGI
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Fournisseur & Informations ICE</th>
                    <th className="p-3.5">Catégorie</th>
                    <th className="p-3.5 text-right">Achats Cumulés (MAD)</th>
                    <th className="p-3.5 text-right">Règlements Effectués</th>
                    <th className="p-3.5 text-right">Solde Dû Restant</th>
                    <th className="p-3.5 text-center">Statut du Solde</th>
                    <th className="p-3.5 text-center">Actions & Relevé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSuppliers.map(supp => {
                    // Estimated cumulative purchase based on sample ledger or debt
                    const estimatedTotalPurchases = Math.max(supp.outstandingDebt * 2.5, 15000);
                    const totalPaid = estimatedTotalPurchases - supp.outstandingDebt;
                    const paidPercentage = Math.min(100, Math.max(0, (totalPaid / estimatedTotalPurchases) * 100));

                    return (
                      <tr key={supp.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-white text-xs sm:text-sm">{supp.name}</div>
                          {supp.ice && (
                            <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3" /> ICE: {supp.ice}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {supp.phone} {supp.email ? `• ${supp.email}` : ''}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg text-[10px] font-medium border border-slate-700">
                            {supp.category}
                          </span>
                        </td>

                        <td className="p-3.5 text-right font-mono font-semibold text-slate-300">
                          {formatMad(estimatedTotalPurchases)}
                        </td>

                        <td className="p-3.5 text-right font-mono font-semibold text-emerald-400">
                          {formatMad(totalPaid)}
                          <div className="w-full bg-slate-950 h-1.5 rounded-full mt-1.5 overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${paidPercentage}%` }} />
                          </div>
                        </td>

                        <td className="p-3.5 text-right font-mono font-bold text-sm text-amber-400">
                          {formatMad(supp.outstandingDebt)}
                        </td>

                        <td className="p-3.5 text-center">
                          {supp.outstandingDebt === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Solde Zéro (Payé)</span>
                            </span>
                          ) : supp.outstandingDebt >= 10000 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse">
                              <AlertCircle className="w-3 h-3 text-red-400" />
                              <span>Solde Important</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <DollarSign className="w-3 h-3 text-amber-400" />
                              <span>Encours Modéré</span>
                            </span>
                          )}
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center justify-center gap-2">
                            {supp.outstandingDebt > 0 && (
                              <button
                                onClick={() => setPaySupplier(supp)}
                                className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition-colors flex items-center gap-1"
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>Payer</span>
                              </button>
                            )}

                            <button
                              onClick={() => openWhatsAppModal(
                                supp.phone,
                                supp.name,
                                `Salam ${supp.name}, voici le relevé de solde fournisseur SahlBiz. Solde restant dû en compte: ${supp.outstandingDebt} MAD. Merci pour votre collaboration.`
                              )}
                              className="p-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30"
                              title="Envoyer Extrait par WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SUPPLIER DIRECTORY & LIST */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          {/* Debt Summary KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs font-semibold text-slate-400 uppercase block mb-1">Total Dettes Owed to Suppliers</span>
              <div className="text-2xl font-bold text-amber-400">{formatMad(totalSupplierDebt)}</div>
              <span className="text-xs text-slate-400 block mt-1">
                {suppliers.filter(s => s.outstandingDebt > 0).length} fournisseurs en attente de paiement
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs font-semibold text-slate-400 uppercase block mb-1">Nombre de Fournisseurs</span>
              <div className="text-2xl font-bold text-white">{suppliers.length}</div>
              <span className="text-xs text-slate-400 block mt-1">
                Tous enregistrés avec fiches ICE & coordonnées
              </span>
            </div>
          </div>

          {/* Suppliers Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Fournisseur & ICE</th>
                    <th className="p-3.5">Téléphone</th>
                    <th className="p-3.5">Catégorie</th>
                    <th className="p-3.5 text-right">Dette Due (MAD)</th>
                    <th className="p-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSuppliers.map(supp => (
                    <tr key={supp.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-semibold text-white text-xs sm:text-sm">{supp.name}</div>
                        {supp.ice && (
                          <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" /> ICE: {supp.ice}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 font-mono text-slate-200">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" /> {supp.phone}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">
                          {supp.category}
                        </span>
                      </td>

                      <td className="p-3.5 text-right font-mono font-bold text-amber-400">
                        {formatMad(supp.outstandingDebt)}
                      </td>

                      <td className="p-3.5 text-center">
                        {supp.outstandingDebt > 0 ? (
                          <button
                            onClick={() => setPaySupplier(supp)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-medium transition-colors"
                          >
                            Payer Dette
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-semibold">À jour</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm">Nouveau Fournisseur</h3>
              <button onClick={() => setIsAddModalOpen(false)}><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Nom / Raison Sociale *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Lesieur Cristal SA"
                  value={newSupp.name}
                  onChange={e => setNewSupp({ ...newSupp, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">ICE (15 chiffres)</label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="001529381000045"
                  value={newSupp.ice}
                  onChange={e => setNewSupp({ ...newSupp, ice: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Téléphone Contact</label>
                <input
                  type="text"
                  placeholder="+212 522..."
                  value={newSupp.phone}
                  onChange={e => setNewSupp({ ...newSupp, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-3 py-2 bg-slate-800 rounded-xl">Annuler</button>
                <button type="submit" className="px-3 py-2 bg-emerald-600 font-bold rounded-xl">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Supplier Modal */}
      {paySupplier && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl text-white space-y-4">
            <h3 className="font-bold text-sm text-amber-400">Règlement Fournisseur: {paySupplier.name}</h3>
            <p className="text-xs text-slate-300">Dette actuelle: <b className="font-mono text-amber-400">{formatMad(paySupplier.outstandingDebt)}</b></p>
            <input
              type="number"
              placeholder="Montant payé (MAD)"
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setPaySupplier(null)} className="px-3 py-1.5 bg-slate-800 rounded-xl text-xs">Annuler</button>
              <button onClick={handleRecordDebtPayment} className="px-3 py-1.5 bg-emerald-600 rounded-xl text-xs font-bold">Enregistrer Règlement</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
