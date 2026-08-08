import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { BusinessDocument, DocumentType, PaymentStatus, PaymentMethod, TvaRate } from '../../types';
import { formatMad, calculateTva, calculateDroitDeTimbre, detectCashLegalThreshold } from '../../lib/moroccanTax';
import { DocumentPDFView } from './DocumentPDFView';
import { TaxSettings } from '../Common/TaxSettings';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Hourglass,
  MessageSquare,
  Printer,
  ArrowRightLeft,
  X,
  Building2,
  Trash2,
  DollarSign,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export const InvoiceModule: React.FC = () => {
  const {
    documents,
    customers,
    products,
    addDocument,
    convertDevisToInvoice,
    recordDocumentPayment,
    openWhatsAppModal,
    selectedDocumentForView,
    setSelectedDocumentForView
  } = useStore();

  const todayStr = new Date().toISOString().split('T')[0];

  const [activeTab, setActiveTab] = useState<'all' | 'facture' | 'devis' | 'bl'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'partial' | 'overdue'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Helper function to check if a document is overdue
  const isDocOverdue = (doc: BusinessDocument) => {
    return doc.status !== 'paid' && doc.dueDate < todayStr && doc.remainingAmount > 0;
  };

  // Status statistics for summary badges
  const paidDocs = documents.filter(d => d.status === 'paid');
  const partialDocs = documents.filter(d => d.status === 'partial');
  const overdueDocs = documents.filter(d => isDocOverdue(d));
  const unpaidDocs = documents.filter(d => d.status === 'unpaid' && !isDocOverdue(d));

  const totalPaidSum = paidDocs.reduce((sum, d) => sum + d.totalTtc, 0);
  const totalPendingSum = [...partialDocs, ...unpaidDocs, ...overdueDocs].reduce((sum, d) => sum + d.remainingAmount, 0);
  const totalOverdueSum = overdueDocs.reduce((sum, d) => sum + d.remainingAmount, 0);

  // Filter logic
  const filteredDocs = documents.filter(doc => {
    if (activeTab !== 'all' && doc.type !== activeTab) return false;

    if (statusFilter === 'paid' && doc.status !== 'paid') return false;
    if (statusFilter === 'partial' && doc.status !== 'partial') return false;
    if (statusFilter === 'unpaid' && (doc.status !== 'unpaid' || isDocOverdue(doc))) return false;
    if (statusFilter === 'overdue' && !isDocOverdue(doc)) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        doc.number.toLowerCase().includes(term) ||
        doc.customerName.toLowerCase().includes(term) ||
        (doc.customerIce && doc.customerIce.includes(term))
      );
    }
    return true;
  });

  // New Document Creation Wizard Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [docType, setDocType] = useState<DocumentType>('facture');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [docNotes, setDocNotes] = useState('');

  // Items in new document
  const [items, setItems] = useState<{ productId: string; productName: string; quantity: number; unitPriceHt: number; tvaRate: TvaRate }[]>([]);

  // Payment Modal
  const [paymentDoc, setPaymentDoc] = useState<BusinessDocument | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');

  const docSubtotalHt = items.reduce((sum, item) => sum + (item.unitPriceHt * item.quantity), 0);
  const docTotalTva = items.reduce((sum, item) => sum + calculateTva(item.unitPriceHt * item.quantity, item.tvaRate).tvaAmount, 0);
  const docTotalTtcBeforeStamp = Number((docSubtotalHt + docTotalTva).toFixed(2));
  const cashCheck = detectCashLegalThreshold(docTotalTtcBeforeStamp, paymentMethod);

  const handleAddItemToDoc = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    setItems(prev => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.name,
        quantity: 1,
        unitPriceHt: prod.sellingPrice,
        tvaRate: prod.tvaRate,
      }
    ]);
  };

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || items.length === 0) return;

    const cust = customers.find(c => c.id === selectedCustomerId);
    if (!cust) return;

    let subtotalHt = 0;
    let totalTva = 0;

    const docItems = items.map((item, idx) => {
      const { tvaAmount, amountTtc } = calculateTva(item.unitPriceHt * item.quantity, item.tvaRate);
      subtotalHt += item.unitPriceHt * item.quantity;
      totalTva += tvaAmount;

      return {
        id: `item-${Date.now()}-${idx}`,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPriceHt: item.unitPriceHt,
        tvaRate: item.tvaRate,
        totalHt: Number((item.unitPriceHt * item.quantity).toFixed(2)),
        totalTva: tvaAmount,
        totalTtc: amountTtc,
      };
    });

    const totalTtc = Number((subtotalHt + totalTva).toFixed(2));
    const cashAnalysis = detectCashLegalThreshold(totalTtc, paymentMethod);
    const droitDeTimbre = cashAnalysis.droitDeTimbre;
    const finalTtc = cashAnalysis.amountTtcWithStampDuty;

    addDocument({
      type: docType,
      customerId: cust.id,
      customerName: cust.name,
      customerIce: cust.ice,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      items: docItems,
      subtotalHt: Number(subtotalHt.toFixed(2)),
      totalTva: Number(totalTva.toFixed(2)),
      droitDeTimbre,
      totalTtc: finalTtc,
      paidAmount: docType === 'facture' && paymentMethod !== 'kreddy' ? finalTtc : 0,
      remainingAmount: docType === 'facture' && paymentMethod !== 'kreddy' ? 0 : finalTtc,
      status: docType === 'facture' && paymentMethod !== 'kreddy' ? 'paid' : 'unpaid',
      paymentMethod,
      notes: docNotes,
    });

    setIsCreateModalOpen(false);
    setItems([]);
  };

  const handleRecordPaymentSubmit = () => {
    if (!paymentDoc) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) return;

    recordDocumentPayment(paymentDoc.id, amt, 'cash');
    setPaymentDoc(null);
    setPayAmount('');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-400" />
            <span>Devis, Factures & Bons de Livraison (BL)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Création de documents conformes avec ICE 15 chiffres, TVA (20%/14%/10%/7%) et conversion 1-clic.
          </p>
        </div>

        <button
          onClick={() => {
            setIsCreateModalOpen(true);
            if (customers.length > 0) setSelectedCustomerId(customers[0].id);
          }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-900/30 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Créer un Document</span>
        </button>
      </div>

      {/* Status Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Paid KPI */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Factures Payées</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {formatMad(totalPaidSum)}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">
              {paidDocs.length} document(s) réglé(s)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
            {paidDocs.length}
          </div>
        </div>

        {/* Pending / Partial KPI */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>En Attente / Acomptes</span>
            </div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">
              {formatMad(totalPendingSum)}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">
              {unpaidDocs.length + partialDocs.length} document(s) en cours
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
            {unpaidDocs.length + partialDocs.length}
          </div>
        </div>

        {/* Overdue KPI */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>En Retard (Overdue)</span>
            </div>
            <div className="text-xl font-bold font-mono text-red-400 mt-1">
              {formatMad(totalOverdueSum)}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">
              {overdueDocs.length} facture(s) échue(s)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-bold">
            {overdueDocs.length}
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tous ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab('facture')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === 'facture' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Factures ({documents.filter(d => d.type === 'facture').length})
          </button>
          <button
            onClick={() => setActiveTab('devis')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === 'devis' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Devis ({documents.filter(d => d.type === 'devis').length})
          </button>
          <button
            onClick={() => setActiveTab('bl')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === 'bl' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Bons de Livraison ({documents.filter(d => d.type === 'bl').length})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="N° Facture, Client, ICE..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Tous Statuts</option>
            <option value="paid">Payées (Paid)</option>
            <option value="partial">Acomptes (Partial)</option>
            <option value="unpaid">Non Payées (Pending)</option>
            <option value="overdue">En Retard (Overdue)</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5">N° Piece & Type</th>
                <th className="p-3.5">Client & ICE</th>
                <th className="p-3.5">Date & Echéance</th>
                <th className="p-3.5 text-right">Montant TTC</th>
                <th className="p-3.5 text-center">Statut (Badge)</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                    Aucun document trouvé pour ces critères.
                  </td>
                </tr>
              ) : (
                filteredDocs.map(doc => {
                  const overdue = isDocOverdue(doc);

                  return (
                  <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-white text-xs font-mono">{doc.number}</div>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        doc.type === 'facture' ? 'bg-emerald-500/20 text-emerald-400' :
                        doc.type === 'devis' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {doc.type.toUpperCase()}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-white">{doc.customerName}</div>
                      {doc.customerIce && (
                        <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> ICE: {doc.customerIce}
                        </div>
                      )}
                    </td>

                    <td className="p-3.5 text-slate-400">
                      <div>{doc.date}</div>
                      <div className={`text-[10px] font-mono ${overdue ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                        Échéance: {doc.dueDate}
                      </div>
                    </td>

                    <td className="p-3.5 text-right font-mono font-bold text-white text-sm">
                      {formatMad(doc.totalTtc)}
                      {doc.remainingAmount > 0 && (
                        <div className="text-[10px] text-red-400 font-normal">
                          Reste: {formatMad(doc.remainingAmount)}
                        </div>
                      )}
                    </td>

                    <td className="p-3.5 text-center">
                      {doc.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Payée (Paid)</span>
                        </span>
                      ) : overdue ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse shadow-xs">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                          <span>En Retard (Overdue)</span>
                        </span>
                      ) : doc.status === 'partial' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Acompte (Partial)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-xs">
                          <Hourglass className="w-3.5 h-3.5 text-rose-400" />
                          <span>Non Payée (Pending)</span>
                        </span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Open Official PDF */}
                        <button
                          onClick={() => setSelectedDocumentForView(doc)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                          title="Imprimer / PDF Officiel"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Convert Devis -> Facture */}
                        {doc.type === 'devis' && (
                          <button
                            onClick={() => convertDevisToInvoice(doc.id)}
                            className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-medium flex items-center gap-1"
                            title="Convertir en Facture"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>Facturer</span>
                          </button>
                        )}

                        {/* Record Payment */}
                        {doc.remainingAmount > 0 && (
                          <button
                            onClick={() => setPaymentDoc(doc)}
                            className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400"
                            title="Régler"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* WhatsApp Send */}
                        <button
                          onClick={() => openWhatsAppModal(
                            '+212661000000',
                            doc.customerName,
                            `Salam ${doc.customerName}, voici votre ${doc.type.toUpperCase()} N°${doc.number} d'un montant de ${doc.totalTtc} MAD. Merci pour votre confiance !`
                          )}
                          className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400"
                          title="Envoyer WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
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

      {/* PDF View Modal */}
      {selectedDocumentForView && (
        <DocumentPDFView
          document={selectedDocumentForView}
          onClose={() => setSelectedDocumentForView(null)}
        />
      )}

      {/* Record Payment Modal */}
      {paymentDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-emerald-400">Encaisser Règlement Facture</h3>
              <button onClick={() => setPaymentDoc(null)}><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-slate-300">
              Règlement pour Facture <b className="font-mono">{paymentDoc.number}</b> ({paymentDoc.customerName}).
              <br />Reste dû: <b className="text-red-400 font-mono">{formatMad(paymentDoc.remainingAmount)}</b>
            </p>
            <input
              type="number"
              placeholder="Montant en MAD"
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setPaymentDoc(null)} className="px-3 py-1.5 bg-slate-800 rounded-xl text-xs">Annuler</button>
              <button onClick={handleRecordPaymentSubmit} className="px-3 py-1.5 bg-emerald-600 rounded-xl text-xs font-bold">Valider</button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Document Wizard Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span>Nouveau Document Commercial (Maroc)</span>
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Type de Document</label>
                  <select
                    value={docType}
                    onChange={e => setDocType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="facture">Facture Officielle</option>
                    <option value="devis">Devis / Offre Prix</option>
                    <option value="bl">Bon de Livraison (BL)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Client Destinataire *</label>
                  <select
                    value={selectedCustomerId}
                    onChange={e => setSelectedCustomerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.ice ? `(ICE: ${c.ice})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Add Item Row Selector */}
              <div>
                <label className="block text-slate-300 mb-1">Sélectionner Produit du Stock</label>
                <div className="flex gap-2">
                  <select
                    id="product-select-dropdown"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {p.sellingPrice} MAD HT (TVA {p.tvaRate}%)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('product-select-dropdown') as HTMLSelectElement;
                      if (el) handleAddItemToDoc(el.value);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl text-white font-bold shrink-0"
                  >
                    + Ajouter
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 p-2">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="p-2">Produit</th>
                      <th className="p-2 text-center">Qté</th>
                      <th className="p-2 text-right">P.U HT</th>
                      <th className="p-2 text-center">TVA %</th>
                      <th className="p-2 text-right">Total HT</th>
                      <th className="p-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx} className="border-t border-slate-800">
                        <td className="p-2 text-white font-medium">{it.productName}</td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min={1}
                            value={it.quantity}
                            onChange={e => {
                              const qty = parseInt(e.target.value) || 1;
                              setItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: qty } : item));
                            }}
                            className="w-12 bg-slate-900 border border-slate-700 rounded text-center text-white font-mono"
                          />
                        </td>
                        <td className="p-2 text-right font-mono">{it.unitPriceHt.toFixed(2)}</td>
                        <td className="p-2 text-center">
                          <select
                            value={it.tvaRate}
                            onChange={e => {
                              const rate = parseInt(e.target.value) as TvaRate;
                              setItems(prev => prev.map((item, i) => i === idx ? { ...item, tvaRate: rate } : item));
                            }}
                            className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-white font-mono text-[11px]"
                          >
                            <option value={20}>20%</option>
                            <option value={14}>14%</option>
                            <option value={10}>10%</option>
                            <option value={7}>7%</option>
                            <option value={0}>0%</option>
                          </select>
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-white">{ (it.unitPriceHt * it.quantity).toFixed(2) }</td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Document Totals Breakdown & Stamp Duty */}
              {items.length > 0 && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Sous-total HT:</span>
                    <span className="font-mono text-white font-bold">{formatMad(docSubtotalHt)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>TVA Globale:</span>
                    <span className="font-mono text-emerald-400 font-bold">+{formatMad(docTotalTva)}</span>
                  </div>
                  {paymentMethod === 'cash' && (
                    <div className="flex justify-between text-amber-400 font-medium">
                      <span>Droit de Timbre (0,25% Espèces):</span>
                      <span className="font-mono font-bold">+{formatMad(cashCheck.droitDeTimbre)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-white font-black text-sm pt-1 border-t border-slate-800">
                    <span>Total TTC à Payer:</span>
                    <span className="font-mono text-emerald-400">{formatMad(cashCheck.amountTtcWithStampDuty)}</span>
                  </div>
                </div>
              )}

              {/* Legal Threshold Cash Alert Banner */}
              {paymentMethod === 'cash' && items.length > 0 && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    cashCheck.isOverThreshold
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  }`}
                >
                  {cashCheck.isOverThreshold ? (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold">
                      {cashCheck.isOverThreshold
                        ? "Avertissement Légal : Plafond Espèces Dépassé (CGI Art. 193/198 Maroc)"
                        : "Information Droit de Timbre Espèces (0,25%)"}
                    </div>
                    <div className="text-[11px] mt-0.5 opacity-90">
                      {cashCheck.warningMessage}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Mode de Règlement</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium"
                  >
                    <option value="cash">Espèces (Droit de timbre 0.25% - Plafond 10.000 MAD)</option>
                    <option value="cmi_card">Carte CMI</option>
                    <option value="check">Chèque Bancaire</option>
                    <option value="transfer">Virement Bancaire</option>
                    <option value="kreddy">Mettre sur Carnet Kreddy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Notes / Conditions</label>
                  <input
                    type="text"
                    placeholder="ex: Livraison sous 24h"
                    value={docNotes}
                    onChange={e => setDocNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={items.length === 0}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium"
                >
                  Valider & Générer Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
