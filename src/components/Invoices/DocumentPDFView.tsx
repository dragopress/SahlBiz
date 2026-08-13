import React from 'react';
import { useStore } from '../../context/StoreContext';
import { BusinessDocument } from '../../types';
import { formatMad } from '../../lib/moroccanTax';
import { Printer, Download, X, Building2, CheckCircle2 } from 'lucide-react';

interface DocumentPDFViewProps {
  document: BusinessDocument;
  onClose: () => void;
}

export const DocumentPDFView: React.FC<DocumentPDFViewProps> = ({ document: doc, onClose }) => {
  const { profile } = useStore();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Modal Action Header (Hidden in Print) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">Aperçu Document Officiel Marocain</span>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
              {doc.number}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer / Télécharger PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable PDF Area */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-6 text-xs text-slate-800 bg-white" id="printable-invoice">
          
          {/* Top Header: Seller Info vs Document Title */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-6">
            <div className="space-y-1 max-w-md">
              <h1 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight">{profile.name}</h1>
              <p className="text-slate-600 leading-snug">{profile.address}, {profile.city}</p>
              <p className="text-slate-600">Tél: {profile.phone} | Email: {profile.email}</p>
              
              {/* Mandatory Moroccan Fiscal Footer Badges */}
              <div className="pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-slate-700 font-semibold">
                <span>ICE: {profile.ice}</span>
                <span>I.F: {profile.if}</span>
                <span>R.C: {profile.rc} ({profile.rcCity})</span>
                <span>Patente: {profile.patente}</span>
                <span>CNSS: {profile.cnss}</span>
              </div>
            </div>

            <div className="text-left sm:text-right space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-200 w-full sm:w-auto">
              <div className="text-lg font-black uppercase text-slate-900 tracking-wider">
                {doc.type === 'facture' ? 'FACTURE' : 
                 doc.type === 'devis' ? 'DEVIS / OFFRE' : 
                 doc.type === 'bl' ? 'BON DE LIVRAISON' : 
                 doc.type === 'credit_note' ? "FACTURE D'AVOIR" : 'NOTE DE DÉBIT'}
              </div>
              <div className="font-mono font-bold text-emerald-700 text-sm">{doc.number}</div>
              <div className="text-[11px] text-slate-600">Date d'émission: <b>{doc.date}</b></div>
              <div className="text-[11px] text-slate-600">Échéance: <b>{doc.dueDate}</b></div>
            </div>
          </div>

          {/* Client Info Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Destinataire / Client:</div>
              <div className="font-bold text-slate-900 text-sm">{doc.customerName}</div>
              {doc.customerIce && (
                <div className="font-mono text-emerald-700 font-semibold mt-1">
                  ICE Client: {doc.customerIce}
                </div>
              )}
              {doc.notes && (
                <div className="text-[11px] text-slate-600 mt-1 italic">
                  Note: {doc.notes}
                </div>
              )}
            </div>

            <div className="sm:text-right">
              <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Mode de Règlement:</div>
              <div className="font-semibold text-slate-900 capitalize">
                {doc.paymentMethod === 'cash' ? 'Espèces' :
                 doc.paymentMethod === 'check' ? 'Chèque Bancaire' :
                 doc.paymentMethod === 'cmi_card' ? 'Carte CMI' :
                 doc.paymentMethod === 'kreddy' ? 'Crédit (Kreddy)' : 'Virement Bancaire'}
              </div>
              <div className="mt-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  doc.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                  doc.status === 'cancelled' ? 'bg-slate-200 text-slate-700' :
                  doc.status === 'partially_paid' || doc.status === 'partial' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                }`}>
                  Statut: {
                    doc.status === 'paid' ? 'PAYÉE' : 
                    doc.status === 'cancelled' ? 'ANNULÉE' :
                    doc.status === 'partially_paid' || doc.status === 'partial' ? 'PARTIELLEMENT PAYÉE' : 'ÉMISE / NON PAYÉE'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Cancellation Reason if applicable */}
          {doc.status === 'cancelled' && doc.cancellationReason && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-medium">
              Motif d'annulation: <b>{doc.cancellationReason}</b>
            </div>
          )}

          {/* Line Items Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Désignation Produit / Service</th>
                  <th className="p-3 text-center">Qté</th>
                  <th className="p-3 text-right">P.U. HT (MAD)</th>
                  <th className="p-3 text-center">TVA %</th>
                  <th className="p-3 text-right">Total HT (MAD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {doc.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 font-sans font-medium text-slate-900">{item.productName}</td>
                    <td className="p-3 text-center font-bold">{item.quantity}</td>
                    <td className="p-3 text-right">{item.unitPriceHt.toFixed(2)}</td>
                    <td className="p-3 text-center">{item.tvaRate}%</td>
                    <td className="p-3 text-right font-bold">{item.totalHt.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Totals & Moroccan Fiscal Calculation Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start pt-2">
            
            {/* Bank RIB for Virement */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span>Coordonnées Bancaires pour Virement:</span>
              </div>
              <div className="text-[11px] text-slate-700 font-medium">Banque: <b>{profile.bankName}</b></div>
              <div className="font-mono text-[11px] font-bold text-slate-900 bg-white p-2 rounded border border-slate-200">
                RIB: {profile.bankRib}
              </div>
            </div>

            {/* Totals Summary */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-slate-700">
                <span>Total Hors Taxe (HT):</span>
                <span className="font-bold">{formatMad(doc.subtotalHt)}</span>
              </div>

              <div className="flex justify-between text-slate-700">
                <span>Total TVA (20%/14%/10%/7%):</span>
                <span className="font-bold">{formatMad(doc.totalTva)}</span>
              </div>

              {doc.droitDeTimbre > 0 && (
                <div className="flex justify-between text-slate-700 text-[11px]">
                  <span>Droit de Timbre (0.25% Espèces):</span>
                  <span>{formatMad(doc.droitDeTimbre)}</span>
                </div>
              )}

              <div className="border-t border-slate-300 pt-2 flex justify-between font-extrabold text-sm text-slate-900">
                <span>NET À PAYER (TTC):</span>
                <span className="text-emerald-700">{formatMad(doc.totalTtc)}</span>
              </div>
            </div>

          </div>

          {/* Payment Allocations Section */}
          {doc.paymentAllocations && doc.paymentAllocations.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Historique des Règlements Allocations</h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[9px] border-b border-slate-200">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Mode</th>
                      <th className="p-2">Référence</th>
                      <th className="p-2">Notes</th>
                      <th className="p-2 text-right">Montant (MAD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                    {doc.paymentAllocations.map((alloc) => (
                      <tr key={alloc.id} className="bg-white">
                        <td className="p-2 font-sans">{alloc.date}</td>
                        <td className="p-2 capitalize font-sans">{alloc.paymentMethod === 'cash' ? 'Espèces' : alloc.paymentMethod}</td>
                        <td className="p-2">{alloc.reference || '-'}</td>
                        <td className="p-2 font-sans">{alloc.notes || '-'}</td>
                        <td className="p-2 text-right font-bold text-emerald-800">{formatMad(alloc.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit History (Small for Internal Reference) */}
          {doc.auditHistory && doc.auditHistory.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-1.5 print:hidden">
              <h3 className="font-bold text-slate-500 text-[10px] uppercase tracking-wide">Journal d'Audit Immuable de la Pièce</h3>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 text-[10px] font-mono text-slate-600">
                {doc.auditHistory.map((audit) => (
                  <div key={audit.id} className="flex justify-between items-start border-b border-slate-200/60 pb-1 last:border-0 last:pb-0">
                    <span className="shrink-0 text-slate-400 mr-2">{audit.timestamp.replace('T', ' ').substring(0, 16)}</span>
                    <span className="font-bold text-slate-700 uppercase shrink-0 mr-2">{audit.action}</span>
                    <span className="grow text-slate-500 mr-2">({audit.userName}): {audit.notes}</span>
                    <span className="shrink-0 bg-slate-200/70 text-slate-700 px-1.5 rounded text-[9px] font-bold">
                      {audit.fromStatus || 'N/A'} ➜ {audit.toStatus}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer legal mention */}
          <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-500 italic">
            En votre aimable règlement. Merci pour votre confiance ! - Généré par SahlBiz Maroc OS.
          </div>

        </div>

      </div>
    </div>
  );
};
