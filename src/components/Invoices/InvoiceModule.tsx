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
  AlertCircle,
  RefreshCw,
  FileCheck,
  Ban,
  ArrowDownRight,
  ArrowUpRight,
  User,
  History,
  FileSpreadsheet
} from 'lucide-react';

export const InvoiceModule: React.FC = () => {
  const {
    documents,
    customers,
    products,
    addDocument,
    convertDevisToInvoice,
    issueDraftDocument,
    recordDocumentPayment,
    cancelDocument,
    createCreditNote,
    createDebitNote,
    openWhatsAppModal,
    selectedDocumentForView,
    setSelectedDocumentForView,
    isLoadingInitialData,
    isSaving
  } = useStore();

  const todayStr = new Date().toISOString().split('T')[0];

  // Primary navigation: 'documents' or 'statements' (customer ledger statements)
  const [activeModuleTab, setActiveModuleTab] = useState<'documents' | 'statements'>('documents');
  const [selectedStatementCustomerId, setSelectedStatementCustomerId] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'all' | 'facture' | 'devis' | 'bl' | 'credit_note' | 'debit_note'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Helper function to check if a document is overdue
  const isDocOverdue = (doc: BusinessDocument) => {
    return doc.status !== 'paid' && doc.status !== 'cancelled' && doc.dueDate < todayStr && doc.remainingAmount > 0;
  };

  // Status statistics for summary badges
  const paidDocs = documents.filter(d => d.status === 'paid');
  const partialDocs = documents.filter(d => d.status === 'partially_paid' || d.status === 'partial');
  const overdueDocs = documents.filter(d => isDocOverdue(d));
  const unpaidDocs = documents.filter(d => (d.status === 'unpaid' || d.status === 'issued') && !isDocOverdue(d));

  const totalPaidSum = paidDocs.reduce((sum, d) => sum + d.totalTtc, 0);
  const totalPendingSum = [...partialDocs, ...unpaidDocs, ...overdueDocs].reduce((sum, d) => sum + d.remainingAmount, 0);
  const totalOverdueSum = overdueDocs.reduce((sum, d) => sum + d.remainingAmount, 0);

  // Filter logic
  const filteredDocs = documents.filter(doc => {
    if (activeTab !== 'all' && doc.type !== activeTab) return false;

    if (statusFilter !== 'all') {
      if (statusFilter === 'paid' && doc.status !== 'paid') return false;
      if (statusFilter === 'draft' && doc.status !== 'draft') return false;
      if (statusFilter === 'cancelled' && doc.status !== 'cancelled') return false;
      if (statusFilter === 'partially_paid') {
        if (doc.status !== 'partially_paid' && doc.status !== 'partial') return false;
      }
      if (statusFilter === 'issued') {
        if (doc.status !== 'issued' && doc.status !== 'unpaid') return false;
        if (isDocOverdue(doc)) return false; // Overdue overrides standard issued
      }
      if (statusFilter === 'overdue' && !isDocOverdue(doc)) return false;
    }

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
  const [customStatus, setCustomStatus] = useState<PaymentStatus>('draft');

  // Items in new document
  const [items, setItems] = useState<{ productId: string; productName: string; quantity: number; unitPriceHt: number; tvaRate: TvaRate }[]>([]);

  // Payment Allocation Modal
  const [paymentDoc, setPaymentDoc] = useState<BusinessDocument | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payRef, setPayRef] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');

  // Cancellation Modal
  const [cancelDoc, setCancelDoc] = useState<BusinessDocument | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  // Credit Note Modal
  const [creditNoteDoc, setCreditNoteDoc] = useState<BusinessDocument | null>(null);
  const [creditAmount, setCreditAmount] = useState<string>('');
  const [creditReason, setCreditReason] = useState<string>('');

  // Debit Note Modal
  const [debitNoteDoc, setDebitNoteDoc] = useState<BusinessDocument | null>(null);
  const [debitAmount, setDebitAmount] = useState<string>('');
  const [debitReason, setDebitReason] = useState<string>('');

  // Inline audit trail drawer/expand state
  const [expandedAuditDocId, setExpandedAuditDocId] = useState<string | null>(null);

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
      paidAmount: docType === 'facture' && paymentMethod !== 'kreddy' && customStatus === 'paid' ? finalTtc : 0,
      remainingAmount: docType === 'facture' && paymentMethod !== 'kreddy' && customStatus === 'paid' ? 0 : finalTtc,
      status: customStatus,
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

    recordDocumentPayment(paymentDoc.id, amt, payMethod, payRef, payNotes);
    setPaymentDoc(null);
    setPayAmount('');
    setPayRef('');
    setPayNotes('');
  };

  const handleCancelSubmit = () => {
    if (!cancelDoc) return;
    if (!cancelReason.trim()) return;

    cancelDocument(cancelDoc.id, cancelReason);
    setCancelDoc(null);
    setCancelReason('');
  };

  const handleCreditNoteSubmit = () => {
    if (!creditNoteDoc) return;
    const amt = parseFloat(creditAmount);
    if (isNaN(amt) || amt <= 0 || !creditReason.trim()) return;

    createCreditNote(creditNoteDoc.id, amt, creditReason);
    setCreditNoteDoc(null);
    setCreditAmount('');
    setCreditReason('');
  };

  const handleDebitNoteSubmit = () => {
    if (!debitNoteDoc) return;
    const amt = parseFloat(debitAmount);
    if (isNaN(amt) || amt <= 0 || !debitReason.trim()) return;

    createDebitNote(debitNoteDoc.id, amt, debitReason);
    setDebitNoteDoc(null);
    setDebitAmount('');
    setDebitReason('');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Main Navigation Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveModuleTab('documents')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeModuleTab === 'documents'
              ? 'border-emerald-500 text-white bg-slate-900/40 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>Gestion des Documents</span>
        </button>
        <button
          onClick={() => setActiveModuleTab('statements')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeModuleTab === 'statements'
              ? 'border-emerald-500 text-white bg-slate-900/40 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Relevés de Comptes Clients</span>
        </button>
      </div>

      {activeModuleTab === 'documents' ? (
        <>
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <FileCheck className="w-6 h-6 text-emerald-400" />
                <span>Facturation, Avoirs & Débits (SaaS ERP)</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Suivi du cycle de vie formel, règlements par allocations partielles, notes d'avoir/débit et historique d'audit immuable.
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
              <span>Créer une Pièce</span>
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
                  <span>Acomptes / En Cours</span>
                </div>
                <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                  {formatMad(totalPendingSum)}
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">
                  {unpaidDocs.length + partialDocs.length} document(s) actifs
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
                  <span>Retards Échus</span>
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

          {/* Tabs & Search Filter Row */}
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
                BL ({documents.filter(d => d.type === 'bl').length})
              </button>
              <button
                onClick={() => setActiveTab('credit_note')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'credit_note' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Avoirs ({documents.filter(d => d.type === 'credit_note').length})
              </button>
              <button
                onClick={() => setActiveTab('debit_note')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'debit_note' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Débits ({documents.filter(d => d.type === 'debit_note').length})
              </button>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="N° Piece, Client, ICE..."
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
                <option value="draft">Brouillon (DRAFT)</option>
                <option value="issued">Émise (ISSUED)</option>
                <option value="partially_paid">Acompte (PARTIAL)</option>
                <option value="paid">Payée (PAID)</option>
                <option value="overdue">En Retard (OVERDUE)</option>
                <option value="cancelled">Annulée (CANCELLED)</option>
              </select>
            </div>
          </div>

          {/* Documents Main List Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">N° Piece & Type</th>
                    <th className="p-3.5">Client & Identifiants</th>
                    <th className="p-3.5">Date & Échéance</th>
                    <th className="p-3.5 text-right">Montant TTC</th>
                    <th className="p-3.5 text-center">Statut (Badge)</th>
                    <th className="p-3.5 text-center">Actions du Flux</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isLoadingInitialData ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-2/3 mb-1"></div></td>
                        <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-1/2"></div></td>
                        <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-1/3"></div></td>
                        <td className="p-3.5"><div className="h-4 bg-slate-800/80 rounded w-20 ml-auto"></div></td>
                        <td className="p-3.5"><div className="h-6 bg-slate-800 rounded w-24 mx-auto"></div></td>
                        <td className="p-3.5"><div className="h-8 bg-slate-800 rounded w-20 mx-auto"></div></td>
                      </tr>
                    ))
                  ) : filteredDocs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-500 font-medium">
                        <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <span>Aucune pièce commerciale enregistrée.</span>
                      </td>
                    </tr>
                  ) : (
                    filteredDocs.map(doc => {
                      const overdue = isDocOverdue(doc);
                      const isFinalized = doc.status !== 'draft' && doc.status !== 'cancelled';

                      return (
                        <React.Fragment key={doc.id}>
                          <tr className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3.5">
                              <div className="font-bold text-white font-mono">{doc.number}</div>
                              <span className={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded ${
                                doc.type === 'facture' ? 'bg-emerald-500/20 text-emerald-400' :
                                doc.type === 'devis' ? 'bg-blue-500/20 text-blue-400' :
                                doc.type === 'bl' ? 'bg-purple-500/20 text-purple-400' :
                                doc.type === 'credit_note' ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {doc.type === 'credit_note' ? 'AVOIR' : doc.type === 'debit_note' ? 'DÉBIT' : doc.type.toUpperCase()}
                              </span>
                            </td>

                            <td className="p-3.5">
                              <div className="font-semibold text-white">{doc.customerName}</div>
                              {doc.customerIce ? (
                                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                  <Building2 className="w-3 h-3 text-emerald-500" /> ICE: {doc.customerIce}
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-500">Client Comptoir / Sans ICE</div>
                              )}
                            </td>

                            <td className="p-3.5 text-slate-400">
                              <div>{doc.date}</div>
                              <div className={`text-[10px] font-mono mt-0.5 ${overdue ? 'text-red-400 font-extrabold animate-pulse' : 'text-slate-500'}`}>
                                Échéance: {doc.dueDate}
                              </div>
                            </td>

                            <td className="p-3.5 text-right font-mono font-bold text-white text-sm">
                              <div>{formatMad(doc.totalTtc)}</div>
                              {doc.remainingAmount > 0 && (
                                <div className="text-[10px] text-red-400 font-medium">
                                  Reste: {formatMad(doc.remainingAmount)}
                                </div>
                              )}
                            </td>

                            <td className="p-3.5 text-center">
                              {doc.status === 'cancelled' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                  <Ban className="w-3 h-3 text-slate-500" />
                                  <span>Annulée (CANCEL)</span>
                                </span>
                              ) : doc.status === 'draft' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-700/50 text-slate-300 border border-slate-600">
                                  <Hourglass className="w-3 h-3 text-slate-400" />
                                  <span>Brouillon (DRAFT)</span>
                                </span>
                              ) : doc.status === 'paid' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Payée (PAID)</span>
                                </span>
                              ) : overdue ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse">
                                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                                  <span>En Retard (OVERDUE)</span>
                                </span>
                              ) : doc.status === 'partially_paid' || doc.status === 'partial' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Acompte (PARTIAL)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                                  <span>Émise (ISSUED)</span>
                                </span>
                              )}
                            </td>

                            <td className="p-3.5">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Print & View PDF */}
                                <button
                                  onClick={() => setSelectedDocumentForView(doc)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                                  title="Aperçu & Impression PDF"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>

                                {/* Convert Devis to Invoice */}
                                {doc.type === 'devis' && (
                                  <button
                                    onClick={() => convertDevisToInvoice(doc.id)}
                                    className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-medium flex items-center gap-1"
                                    title="Facturer le devis"
                                  >
                                    <ArrowRightLeft className="w-3 h-3" />
                                    <span>Facturer</span>
                                  </button>
                                )}

                                {/* Finalize Draft (DRAFT -> ISSUED) */}
                                {doc.status === 'draft' && (
                                  <button
                                    onClick={() => issueDraftDocument(doc.id)}
                                    className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-medium flex items-center gap-1"
                                    title="Émettre / Finaliser le brouillon"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Émettre</span>
                                  </button>
                                )}

                                {/* Payment Allocation (Partial) */}
                                {isFinalized && doc.remainingAmount > 0 && doc.type !== 'devis' && (
                                  <button
                                    onClick={() => {
                                      setPaymentDoc(doc);
                                      setPayAmount(doc.remainingAmount.toString());
                                    }}
                                    className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400"
                                    title="Encaisser un règlement partiel/total"
                                  >
                                    <DollarSign className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Credit Note Creation */}
                                {isFinalized && doc.type === 'facture' && (
                                  <button
                                    onClick={() => {
                                      setCreditNoteDoc(doc);
                                      setCreditAmount(doc.totalTtc.toString());
                                    }}
                                    className="p-1.5 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 text-orange-400"
                                    title="Émettre Facture d'Avoir (Credit Note)"
                                  >
                                    <ArrowDownRight className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Debit Note Creation */}
                                {isFinalized && doc.type === 'facture' && (
                                  <button
                                    onClick={() => {
                                      setDebitNoteDoc(doc);
                                      setDebitAmount('100');
                                    }}
                                    className="p-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400"
                                    title="Émettre Note de Débit (Debit Note)"
                                  >
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Audit History Drawer toggle */}
                                <button
                                  onClick={() => setExpandedAuditDocId(expandedAuditDocId === doc.id ? null : doc.id)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    expandedAuditDocId === doc.id ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                  }`}
                                  title="Consulter le journal d'audit immuable"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>

                                {/* Cancel finalized document */}
                                {isFinalized && doc.type !== 'devis' && (
                                  <button
                                    onClick={() => setCancelDoc(doc)}
                                    className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/30"
                                    title="Annuler la pièce commercialement"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* WhatsApp share */}
                                <button
                                  onClick={() => openWhatsAppModal(
                                    '+212661000000',
                                    doc.customerName,
                                    `Salam ${doc.customerName}, voici votre ${doc.type.toUpperCase()} N°${doc.number} d'un montant de ${doc.totalTtc} MAD. Merci pour votre confiance ! - SahlBiz`
                                  )}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400"
                                  title="Partager sur WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Audit Trail History Row */}
                          {expandedAuditDocId === doc.id && (
                            <tr className="bg-slate-950/40">
                              <td colSpan={6} className="p-4 border-t border-slate-800">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                                    <History className="w-4 h-4" />
                                    <span>Journal des Événements d'Audit Immuable</span>
                                  </div>
                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {doc.auditHistory && doc.auditHistory.length > 0 ? (
                                      doc.auditHistory.map((audit) => (
                                        <div key={audit.id} className="flex justify-between items-start text-[11px] font-mono p-2 bg-slate-900 rounded border border-slate-800">
                                          <div>
                                            <span className="text-slate-500 mr-2">[{audit.timestamp.replace('T', ' ').substring(0, 16)}]</span>
                                            <span className="text-emerald-400 font-bold uppercase mr-2">{audit.action}</span>
                                            <span className="text-slate-300">({audit.userName}): {audit.notes}</span>
                                          </div>
                                          <div className="text-right text-[10px] shrink-0 text-slate-400">
                                            Status: <b className="text-white">{audit.fromStatus || 'N/A'}</b> ➜ <b className="text-emerald-400">{audit.toStatus}</b>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-xs text-slate-500 italic p-1">Aucun audit historique pour cette pièce de transition.</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Customers Statement Ledger Sub-module */
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <span>Relevé de Compte Client (Customer Statements Ledger)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Générez instantanément des extraits de compte chronologiques avec débits, crédits et soldes progressifs nets.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-64">
                <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1">Sélectionner un Client</label>
                <select
                  value={selectedStatementCustomerId}
                  onChange={e => setSelectedStatementCustomerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Choisissez un client --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.ice ? `(ICE: ${c.ice})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedStatementCustomerId && (
                <button
                  onClick={() => window.print()}
                  className="mt-5 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shrink-0"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer le Relevé de Compte</span>
                </button>
              )}
            </div>
          </div>

          {selectedStatementCustomerId ? (
            (() => {
              const customer = customers.find(c => c.id === selectedStatementCustomerId);
              if (!customer) return null;

              // Aggregate all entries chronologically
              // Debits: Invoices, Debit Notes
              // Credits: Credit Notes, Payment Allocations
              interface StatementEntry {
                id: string;
                date: string;
                reference: string;
                type: 'facture' | 'credit_note' | 'debit_note' | 'payment';
                description: string;
                debit: number; // positive charged
                credit: number; // positive credited/paid
              }

              const entries: StatementEntry[] = [];

              // Get all customer invoices and notes
              const custDocs = documents.filter(d => d.customerId === selectedStatementCustomerId);

              custDocs.forEach(doc => {
                if (doc.type === 'facture' && doc.status !== 'cancelled') {
                  entries.push({
                    id: doc.id,
                    date: doc.date,
                    reference: doc.number,
                    type: 'facture',
                    description: `Facture N°${doc.number}`,
                    debit: doc.totalTtc,
                    credit: 0
                  });
                } else if (doc.type === 'credit_note') {
                  entries.push({
                    id: doc.id,
                    date: doc.date,
                    reference: doc.number,
                    type: 'credit_note',
                    description: `Avoir de Facture N°${doc.number}`,
                    debit: 0,
                    credit: doc.totalTtc
                  });
                } else if (doc.type === 'debit_note') {
                  entries.push({
                    id: doc.id,
                    date: doc.date,
                    reference: doc.number,
                    type: 'debit_note',
                    description: `Note de débit N°${doc.number}`,
                    debit: doc.totalTtc,
                    credit: 0
                  });
                }

                // Push allocations on this document if it has any
                if (doc.paymentAllocations && doc.paymentAllocations.length > 0) {
                  doc.paymentAllocations.forEach(alloc => {
                    entries.push({
                      id: alloc.id,
                      date: alloc.date,
                      reference: doc.number,
                      type: 'payment',
                      description: `Règlement Facture ${doc.number} (${alloc.paymentMethod.toUpperCase()})${alloc.reference ? ` Réf: ${alloc.reference}` : ''}`,
                      debit: 0,
                      credit: alloc.amount
                    });
                  });
                }
              });

              // Sort entries chronologically
              entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

              // Calculate balances
              let totalCharged = 0;
              let totalPaid = 0;
              let balanceList: number[] = [];
              let runningBal = 0;

              entries.forEach(e => {
                totalCharged += e.debit;
                totalPaid += e.credit;
                runningBal += (e.debit - e.credit);
                balanceList.push(runningBal);
              });

              return (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-white" id="printable-statement">
                  <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white uppercase">{customer.name}</h3>
                      {customer.ice && <div className="text-xs font-mono text-emerald-400">ICE: {customer.ice}</div>}
                      <div className="text-xs text-slate-400 mt-1">Téléphone: {customer.phone || 'N/A'} | Ville: {customer.city || 'N/A'}</div>
                    </div>
                    <div className="text-left sm:text-right bg-slate-950 p-4 rounded-xl border border-slate-800 mt-3 sm:mt-0">
                      <div className="text-[10px] uppercase font-bold text-slate-500">SOLDE DU COMPTE NET</div>
                      <div className="text-xl font-bold font-mono text-amber-400 mt-1">{formatMad(runningBal)}</div>
                      <span className="text-[10px] text-slate-400">Net restant dû à l'entreprise</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Total Facturé (Débit)</div>
                      <div className="text-sm font-bold font-mono text-white mt-1">{formatMad(totalCharged)}</div>
                    </div>
                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Total Encaissé (Crédit)</div>
                      <div className="text-sm font-bold font-mono text-emerald-400 mt-1">{formatMad(totalPaid)}</div>
                    </div>
                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Net Restant Dû</div>
                      <div className="text-sm font-bold font-mono text-amber-400 mt-1">{formatMad(runningBal)}</div>
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                        <tr>
                          <th className="p-3">Date</th>
                          <th className="p-3">Pièce Référence</th>
                          <th className="p-3">Description Événement</th>
                          <th className="p-3 text-right">Débit (+)</th>
                          <th className="p-3 text-right font-bold text-emerald-400">Crédit (-)</th>
                          <th className="p-3 text-right">Solde Progressif</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                        {entries.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-500 italic">Aucune transaction pour ce compte client.</td>
                          </tr>
                        ) : (
                          entries.map((entry, idx) => (
                            <tr key={entry.id} className="hover:bg-slate-900">
                              <td className="p-3 font-sans text-slate-400">{entry.date}</td>
                              <td className="p-3 font-bold text-white">{entry.reference}</td>
                              <td className="p-3 font-sans text-slate-300">{entry.description}</td>
                              <td className="p-3 text-right text-white">{entry.debit > 0 ? formatMad(entry.debit) : '-'}</td>
                              <td className="p-3 text-right text-emerald-400 font-bold">{entry.credit > 0 ? formatMad(entry.credit) : '-'}</td>
                              <td className="p-3 text-right font-bold text-white">{formatMad(balanceList[idx])}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              <User className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <span>Veuillez sélectionner un client ci-dessus pour consulter ou imprimer son historique de compte.</span>
            </div>
          )}
        </div>
      )}

      {/* PDF View Modal */}
      {selectedDocumentForView && (
        <DocumentPDFView
          document={selectedDocumentForView}
          onClose={() => setSelectedDocumentForView(null)}
        />
      )}

      {/* Record Payment Allocation Modal */}
      {paymentDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-emerald-400">Allouer un Nouveau Règlement</h3>
              <button onClick={() => setPaymentDoc(null)}><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-slate-300">
              Saisissez un paiement partiel ou total pour la facture <b className="font-mono">{paymentDoc.number}</b> ({paymentDoc.customerName}).
              <br />Restant dû net: <b className="text-red-400 font-mono">{formatMad(paymentDoc.remainingAmount)}</b>
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Montant Encaissé (MAD)</label>
                <input
                  type="number"
                  placeholder="Montant en MAD"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Mode de Paiement</label>
                  <select
                    value={payMethod}
                    onChange={e => setPayMethod(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="cash">Espèces</option>
                    <option value="check">Chèque</option>
                    <option value="cmi_card">Carte CMI</option>
                    <option value="transfer">Virement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Code/Référence (ex: Chèque N°)</label>
                  <input
                    type="text"
                    placeholder="Facultatif"
                    value={payRef}
                    onChange={e => setPayRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Notes / Commentaires</label>
                <input
                  type="text"
                  placeholder="ex: Acompte de commande"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button onClick={() => setPaymentDoc(null)} className="px-3 py-1.5 bg-slate-800 rounded-xl">Annuler</button>
              <button onClick={handleRecordPaymentSubmit} className="px-3 py-1.5 bg-emerald-600 rounded-xl font-bold text-white hover:bg-emerald-500">Valider l'encaissement</button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Note creation Modal */}
      {creditNoteDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-orange-400 flex items-center gap-1.5">
                <ArrowDownRight className="w-5 h-5" />
                <span>Générer un Avoir (Credit Note)</span>
              </h3>
              <button onClick={() => setCreditNoteDoc(null)}><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              L'avoir réduira le montant restant dû de la facture d'origine <b className="font-mono">{creditNoteDoc.number}</b>.
              <br />Montant total facture: <b className="text-emerald-400 font-mono">{formatMad(creditNoteDoc.totalTtc)}</b>
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Montant de l'Avoir (MAD)</label>
                <input
                  type="number"
                  placeholder="ex: 1200"
                  value={creditAmount}
                  onChange={e => setCreditAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Motif d'Émission de l'Avoir *</label>
                <input
                  type="text"
                  placeholder="ex: Retour d'un article défectueux"
                  value={creditReason}
                  onChange={e => setCreditReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button onClick={() => setCreditNoteDoc(null)} className="px-3 py-1.5 bg-slate-800 rounded-xl">Annuler</button>
              <button onClick={handleCreditNoteSubmit} className="px-3 py-1.5 bg-orange-600 rounded-xl font-bold hover:bg-orange-500">Valider l'avoir</button>
            </div>
          </div>
        </div>
      )}

      {/* Debit Note creation Modal */}
      {debitNoteDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-red-400 flex items-center gap-1.5">
                <ArrowUpRight className="w-5 h-5" />
                <span>Générer une Note de Débit</span>
              </h3>
              <button onClick={() => setDebitNoteDoc(null)}><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              La note de débit augmentera le solde restant dû de la facture d'origine <b className="font-mono">{debitNoteDoc.number}</b>.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Montant Additionnel Chargé (MAD)</label>
                <input
                  type="number"
                  placeholder="ex: 350"
                  value={debitAmount}
                  onChange={e => setDebitAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Motif du Débit *</label>
                <input
                  type="text"
                  placeholder="ex: Frais de logistique supplémentaires"
                  value={debitReason}
                  onChange={e => setDebitReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button onClick={() => setDebitNoteDoc(null)} className="px-3 py-1.5 bg-slate-800 rounded-xl">Annuler</button>
              <button onClick={handleDebitNoteSubmit} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 font-bold">Valider la note de débit</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-red-400 flex items-center gap-1.5">
                <Ban className="w-4 h-4" />
                <span>Confirmer l'Annulation Immuable</span>
              </h3>
              <button onClick={() => setCancelDoc(null)}><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Vous êtes sur le point d'annuler commercialement le document <b className="font-mono text-red-400">{cancelDoc.number}</b>.
              Cette opération est immuable et sera consignée de façon permanente dans le grand livre d'audit de l'entreprise.
            </p>
            <div className="space-y-1.5 text-xs">
              <label className="block text-slate-400">Motif de l'annulation *</label>
              <input
                type="text"
                placeholder="ex: Erreur de saisie d'articles / Contestation client"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button onClick={() => setCancelDoc(null)} className="px-3 py-1.5 bg-slate-800 rounded-xl">Conserver</button>
              <button onClick={handleCancelSubmit} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 font-bold text-white">Confirmer l'annulation</button>
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
              <div className="grid grid-cols-3 gap-3">
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

                <div>
                  <label className="block text-slate-300 mb-1">Statut Initial</label>
                  <select
                    value={customStatus}
                    onChange={e => setCustomStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="draft">Brouillon (DRAFT)</option>
                    {docType === 'facture' && (
                      <>
                        <option value="issued">Émise (ISSUED)</option>
                        <option value="paid">Payée Entièrement (PAID)</option>
                      </>
                    )}
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
                  disabled={items.length === 0 || isSaving}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium flex items-center gap-2"
                >
                  {isSaving && (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  <span>{isSaving ? 'Génération...' : 'Valider & Générer Document'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
