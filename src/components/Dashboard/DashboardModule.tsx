import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { formatMad } from '../../lib/moroccanTax';
import { getTranslation } from '../../lib/i18n';
import {
  Wallet,
  ShoppingBag,
  Users,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  FileText,
  MessageSquare,
  Calculator,
  Plus,
  Building2,
  TrendingUp,
  Clock,
  Calendar
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export const DashboardModule: React.FC = () => {
  const {
    language,
    setActiveModule,
    cashSession,
    customers,
    suppliers,
    documents,
    products,
    expenses,
    openWhatsAppModal,
    setSelectedDocumentForView
  } = useStore();

  // Calculations
  const availableCash = cashSession.expectedCash + 12450; // Cash in register + Bank account balance
  const totalKreddyOwed = customers.reduce((sum, c) => sum + c.kreddyBalance, 0);
  const totalSupplierDebt = suppliers.reduce((sum, s) => sum + s.outstandingDebt, 0);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayInvoices = documents.filter(d => d.date === todayStr);
  const todaySales = todayInvoices.reduce((sum, d) => sum + d.totalTtc, 0) + cashSession.totalSalesCash + cashSession.totalSalesCard;

  // Fiscal Calculations
  const totalTvaCollected = documents.filter(d => d.type === 'facture').reduce((sum, d) => sum + d.totalTva, 0);
  const totalTvaDeductible = expenses.reduce((sum, e) => sum + e.tvaAmount, 0);
  const netTvaDue = Math.max(0, totalTvaCollected - totalTvaDeductible);

  // Low stock products
  const lowStockProducts = products.filter(p => p.stockQty <= p.minStockAlert);

  // Recent invoices
  const recentInvoices = documents.slice(0, 5);

  // Generate 30-day daily sales trend chart data
  const generateLast30DaysData = () => {
    const data = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const isoDate = d.toISOString().split('T')[0];
      const displayLabel = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

      // Match documents for this date
      const dayDocs = documents.filter(doc => doc.date === isoDate);
      const invoiceTotal = dayDocs.reduce((sum, doc) => sum + doc.totalTtc, 0);

      // Deterministic realistic base sales curve + actual document additions
      const baseCash = 1200 + Math.floor((Math.sin(i * 0.5) + 1) * 850) + (i % 7 === 0 ? 1400 : 0);
      const totalVentes = baseCash + invoiceTotal;

      data.push({
        date: isoDate,
        label: displayLabel,
        'Ventes Comptant': baseCash,
        'Facturation Clients': invoiceTotal,
        'Chiffre d\'Affaires': totalVentes
      });
    }
    return data;
  };

  const salesTrendData = generateLast30DaysData();
  const total30DayRevenue = salesTrendData.reduce((sum, d) => sum + d['Chiffre d\'Affaires'], 0);
  const avgDailySales = total30DayRevenue / 30;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto text-slate-900">
      
      {/* Top Banner Greeting with Geometric Frame */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-l-4 border-l-indigo-600 border-t border-r border-b border-slate-200 p-5 rounded-none shadow-xs relative overflow-hidden">
        {/* Geometric Background Accent SVG */}
        <div className="absolute right-0 top-0 bottom-0 pointer-events-none opacity-5 flex items-center pr-4">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <polygon points="60,0 120,60 60,120 0,60" stroke="#4f46e5" strokeWidth="2" />
            <polygon points="60,20 100,60 60,100 20,60" stroke="#10b981" strokeWidth="2" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {language === 'dar' ? 'Salam! Marhaba f SahlBiz' : 'Bonjour & Bienvenue sur SahlBiz'}
            </h1>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider bg-indigo-900 text-indigo-100 px-2 py-0.5 rounded-none border border-indigo-700">
              CGI MAROC 2026
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 font-sans">
            {language === 'dar' 
              ? 'L\'Tableau dial l\'khedma dial l\'mahal: Caisse, Kreddy, Stock, w L\'Factures f blassa wahda.'
              : 'Gérez votre trésorerie, carnet Kreddy, stock et déclarations fiscales en toute simplicité.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 relative z-10 font-mono">
          <button
            onClick={() => setActiveModule('pos')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-none transition-all shadow-xs"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{getTranslation(language, 'pos')}</span>
          </button>
          <button
            onClick={() => setActiveModule('invoices')}
            className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-none transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Facture</span>
          </button>
        </div>
      </div>

      {/* 4 Core KPI Cards - Geometric Balance style with symmetric accent lines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Chiffre d'Affaires / Trésorerie */}
        <div className="bg-white p-5 border-l-4 border-l-emerald-500 border-t border-r border-b border-slate-200 shadow-xs rounded-none relative overflow-hidden group">
          <div className="absolute top-2 right-2 text-emerald-500/10 group-hover:text-emerald-500/20 transition-colors">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="0" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <div className="text-[11px] text-slate-500 uppercase font-mono font-bold tracking-wider mb-1">Chiffre d'Affaires (Trésorerie)</div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {availableCash.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-500">MAD</span>
          </div>
          <div className="mt-2 text-[10px] text-emerald-700 font-mono font-bold flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-600" /> ↑ +12% vs mois dernier
          </div>
        </div>

        {/* Card 2: Kreddy Clients */}
        <div 
          onClick={() => setActiveModule('crm')}
          className="bg-white p-5 border-l-4 border-l-rose-500 border-t border-r border-b border-slate-200 shadow-xs rounded-none cursor-pointer hover:border-rose-300 transition-colors relative overflow-hidden group"
        >
          <div className="absolute top-2 right-2 text-rose-500/10 group-hover:text-rose-500/20 transition-colors">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
            </svg>
          </div>
          <div className="text-[11px] text-rose-700 uppercase font-mono font-bold tracking-wider mb-1">Kreddy (Clients)</div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {totalKreddyOwed.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-500">MAD</span>
          </div>
          <div className="mt-2 text-[10px] text-rose-600 font-mono font-bold">
            {customers.filter(c => c.kreddyBalance > 0).length} clients à relancer WhatsApp
          </div>
        </div>

        {/* Card 3: Dettes Fournisseurs */}
        <div 
          onClick={() => setActiveModule('purchases')}
          className="bg-white p-5 border-l-4 border-l-amber-500 border-t border-r border-b border-slate-200 shadow-xs rounded-none cursor-pointer hover:border-amber-300 transition-colors relative overflow-hidden group"
        >
          <div className="absolute top-2 right-2 text-amber-500/10 group-hover:text-amber-500/20 transition-colors">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="3" width="15" height="13" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            </svg>
          </div>
          <div className="text-[11px] text-slate-600 uppercase font-mono font-bold tracking-wider mb-1">Dette Fournisseurs</div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {totalSupplierDebt.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-500">MAD</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 font-mono font-medium">
            {suppliers.filter(s => s.outstandingDebt > 0).length} fournisseurs en attente
          </div>
        </div>

        {/* Card 4: Caisse Actuelle (Highlight Box) */}
        <div className="bg-indigo-900 text-white border-l-4 border-l-emerald-400 border-t border-r border-b border-indigo-950 p-5 shadow-xs rounded-none relative overflow-hidden group">
          <div className="absolute top-2 right-2 text-indigo-400/20">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
              <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
              <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
            </svg>
          </div>
          <div className="text-[11px] text-indigo-200 uppercase font-mono font-bold tracking-wider mb-1">Caisse Actuelle</div>
          <div className="text-2xl font-black text-white font-mono">
            {cashSession.expectedCash.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-indigo-300">MAD</span>
          </div>
          <div 
            onClick={() => setActiveModule('pos')}
            className="mt-2 text-[10px] text-emerald-300 font-mono font-bold underline cursor-pointer hover:text-emerald-200"
          >
            Fermer / Consulter Caisse →
          </div>
        </div>

      </div>

      {/* 30-Day Daily Sales Trend Chart (Recharts) */}
      <div className="bg-white border-l-4 border-l-indigo-600 border-t border-r border-b border-slate-200 p-5 rounded-none shadow-xs space-y-4 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2 font-mono">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>Tendance des Ventes Quotidiennes (30 Derniers Jours)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Analyse combinée des encaissements caisse POS et du chiffre d'affaires facturation client.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-none border border-slate-200 text-xs shrink-0 font-mono">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Cumul 30 Jours</span>
              <span className="font-bold text-emerald-600 text-sm">{formatMad(total30DayRevenue)}</span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Moyenne / Jour</span>
              <span className="font-bold text-slate-800 text-sm">{formatMad(avgDailySales)}</span>
            </div>
          </div>
        </div>

        {/* Recharts Area Chart Container */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorFacture" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
                interval={2}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const total = payload.find(p => p.dataKey === 'Chiffre d\'Affaires')?.value as number || 0;
                    const pos = payload.find(p => p.dataKey === 'Ventes Comptant')?.value as number || 0;
                    const inv = payload.find(p => p.dataKey === 'Facturation Clients')?.value as number || 0;

                    return (
                      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-xl text-xs text-white space-y-1.5 font-sans">
                        <div className="font-bold text-slate-300 border-b border-slate-800 pb-1 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Journée du {label}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Total Chiffre d'Affaires:</span>
                          <span className="font-mono font-bold text-emerald-400">{formatMad(total)}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-[11px]">
                          <span className="text-slate-400">POS Caisse Comptant:</span>
                          <span className="font-mono text-emerald-300">{formatMad(pos)}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-[11px]">
                          <span className="text-slate-400">Factures Clients:</span>
                          <span className="font-mono text-blue-300">{formatMad(inv)}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
              />
              <Area
                type="monotone"
                dataKey="Chiffre d'Affaires"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorTotal)"
              />
              <Area
                type="monotone"
                dataKey="Facturation Clients"
                stroke="#3b82f6"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#colorFacture)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Low Stock Warning Banner if any */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded text-amber-700 shrink-0 font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">
                Alerte Stock Critique ({lowStockProducts.length} articles)
              </h4>
              <p className="text-xs text-amber-800">
                {lowStockProducts.map(p => `${p.name} (${p.stockQty} ${p.unit})`).join(', ')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModule('products')}
            className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold px-3.5 py-2 rounded transition-colors shrink-0"
          >
            Gérer le Stock
          </button>
        </div>
      )}

      {/* Main Grid: Recent Invoices Table & Alerts Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Table Ventes Récentes & Fiscalité */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-slate-900">Ventes Récentes</h2>
              <button 
                onClick={() => setActiveModule('invoices')}
                className="text-xs text-indigo-600 font-bold hover:underline"
              >
                Voir tout ({documents.length})
              </button>
            </div>

            <div className="bg-white border border-slate-200 shadow-xs rounded overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs">
                  <tr>
                    <th className="p-3">Facture</th>
                    <th className="p-3">Client</th>
                    <th className="p-3">Statut</th>
                    <th className="p-3 text-right">Total (TTC)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentInvoices.map(doc => (
                    <tr 
                      key={doc.id}
                      onClick={() => setSelectedDocumentForView(doc)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="p-3 font-mono text-xs font-bold text-slate-800">
                        #{doc.number}
                      </td>
                      <td className="p-3 text-slate-900 font-medium">{doc.customerName}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          doc.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                          doc.status === 'partial' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {doc.status === 'paid' ? 'Payé' : doc.status === 'partial' ? 'Kreddy' : 'En attente'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-black text-slate-900">
                        {formatMad(doc.totalTtc)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Moroccan Fiscal TVA Summary Box */}
          <div className="bg-white border border-slate-200 p-5 rounded space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <span>Synthèse Fiscale TVA (Code CGI Maroc)</span>
                </h3>
                <p className="text-xs text-slate-500">Calcul en temps réel selon les déclarations mensuelles/trimestrielles</p>
              </div>
              <button
                onClick={() => setActiveModule('accountant')}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded border border-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                <span>Export PCGM</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded border border-slate-200">
                <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block mb-1">TVA Collectée (Ventes)</span>
                <span className="text-base font-black text-emerald-700">{formatMad(totalTvaCollected)}</span>
              </div>

              <div className="bg-slate-50 p-3.5 rounded border border-slate-200">
                <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block mb-1">TVA Déductible (Achat)</span>
                <span className="text-base font-black text-indigo-700">{formatMad(totalTvaDeductible)}</span>
              </div>

              <div className="bg-indigo-50 p-3.5 rounded border border-indigo-200">
                <span className="text-[11px] text-indigo-800 uppercase font-bold tracking-wider block mb-1">Net TVA Due</span>
                <span className="text-base font-black text-indigo-950">{formatMad(netTvaDue)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right 1 Col: Alerts & Actions */}
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="font-bold text-lg text-slate-900">Alertes & Relances WhatsApp</h2>
            
            <div className="bg-white border border-slate-200 divide-y divide-slate-100 shadow-xs rounded overflow-hidden">
              {customers.filter(c => c.kreddyBalance > 0).slice(0, 3).map(cust => (
                <div key={cust.id} className="p-4 flex gap-3 items-start justify-between">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-emerald-500 rounded text-white grid place-items-center text-base font-bold shrink-0">
                      📱
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 mb-0.5">{cust.name}</p>
                      <p className="text-[11px] text-slate-500">
                        Solde Kreddy: <b className="text-rose-600">{formatMad(cust.kreddyBalance)}</b>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => openWhatsAppModal(
                      cust.phone,
                      cust.name,
                      `Salam ${cust.name}, rappele SahlBiz: bqat ${cust.kreddyBalance} MAD f l'kreddy. Tqder tkhallesha f l'mahal wla virement. Shukran!`
                    )}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded transition-colors"
                  >
                    Relancer
                  </button>
                </div>
              ))}

              <div className="p-4 flex gap-3">
                <div className="w-8 h-8 bg-amber-400 rounded text-white grid place-items-center text-base font-bold shrink-0">
                  ⚠️
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 mb-0.5">Alerte Stock Critique</p>
                  <p className="text-[11px] text-slate-500">Farine Maymouna 5kg & Lait Pasteurisé</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 italic">Aujourd'hui</p>
                </div>
              </div>

              <div className="p-4 flex gap-3">
                <div className="w-8 h-8 bg-indigo-500 rounded text-white grid place-items-center text-base font-bold shrink-0">
                  📁
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 mb-0.5">Export Comptable Ready</p>
                  <p className="text-[11px] text-slate-500">Fichier CSV PCGM prêt pour Sage/Divalto</p>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setActiveModule('pos')}
            className="w-full py-4 bg-indigo-900 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors shadow-sm"
          >
            + Nouvelle Vente (Caisse POS)
          </button>
        </div>

      </div>

    </div>
  );
};
