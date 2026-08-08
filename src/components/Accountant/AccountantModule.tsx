import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { exportPcgmCsv } from '../../lib/accountantExport';
import { formatMad } from '../../lib/moroccanTax';
import {
  Calculator,
  Download,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  Table
} from 'lucide-react';

export const AccountantModule: React.FC = () => {
  const { documents, expenses, profile } = useStore();

  const [selectedSoftware, setSelectedSoftware] = useState<'sage' | 'divalto' | 'ciel' | 'standard'>('sage');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-08');

  // Preview entries for display
  const salesInvoices = documents.filter(d => d.type === 'facture');

  const handleDownloadCsv = () => {
    exportPcgmCsv(documents, expenses, profile.name);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Calculator className="w-6 h-6 text-emerald-400" />
            <span>Portail Expert-Comptable (PCGM Maroc)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Exportations automatiques des journaux des Ventes (VE) et Achats (AC) selon le Plan Comptable Général Marocain.
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-900/30 shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Exporter CSV PCGM</span>
        </button>
      </div>

      {/* Software Compatibility Badges */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase block mb-1">Format Logiciel Comptable Target</span>
          <div className="flex items-center gap-2">
            {['sage', 'divalto', 'ciel', 'standard'].map(sw => (
              <button
                key={sw}
                onClick={() => setSelectedSoftware(sw as any)}
                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors ${
                  selectedSoftware === sw
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {sw}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400">
          <span className="text-emerald-400 font-bold">100% Compatible:</span> Plan comptable des entreprises marocaines (Code CGI Art 145)
        </div>
      </div>

      {/* Journal Entry Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Table className="w-4 h-4 text-emerald-400" />
            <span>Aperçu Écritures Comptables (Journal VE - Ventes)</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">{salesInvoices.length} Écritures générées</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="bg-slate-950/80 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">N° Piece</th>
                <th className="p-2.5">Compte PCGM</th>
                <th className="p-2.5">Intitulé Compte</th>
                <th className="p-2.5 text-right">Débit (MAD)</th>
                <th className="p-2.5 text-right">Crédit (MAD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {salesInvoices.slice(0, 8).map((doc, idx) => (
                <React.Fragment key={idx}>
                  {/* Line 1: Client Debit 34210000 */}
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-2.5 text-slate-400">{doc.date}</td>
                    <td className="p-2.5 text-white font-bold">{doc.number}</td>
                    <td className="p-2.5 text-emerald-400 font-bold">34210000</td>
                    <td className="p-2.5 text-slate-300">Client: {doc.customerName}</td>
                    <td className="p-2.5 text-right font-bold text-white">{doc.totalTtc.toFixed(2)}</td>
                    <td className="p-2.5 text-right text-slate-600">0.00</td>
                  </tr>
                  {/* Line 2: Ventes Credit 71110000 */}
                  <tr className="hover:bg-slate-800/40 text-[11px] text-slate-400">
                    <td className="p-2.5"></td>
                    <td className="p-2.5"></td>
                    <td className="p-2.5 text-blue-400">71110000</td>
                    <td className="p-2.5">Ventes de marchandises au Maroc</td>
                    <td className="p-2.5 text-right text-slate-600">0.00</td>
                    <td className="p-2.5 text-right text-white">{doc.subtotalHt.toFixed(2)}</td>
                  </tr>
                  {/* Line 3: TVA Credit 44550000 */}
                  <tr className="hover:bg-slate-800/40 text-[11px] text-slate-400 border-b border-slate-800/80">
                    <td className="p-2.5"></td>
                    <td className="p-2.5"></td>
                    <td className="p-2.5 text-amber-400">44550000</td>
                    <td className="p-2.5">État - TVA Facturée (20%)</td>
                    <td className="p-2.5 text-right text-slate-600">0.00</td>
                    <td className="p-2.5 text-right text-white">{doc.totalTva.toFixed(2)}</td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
