import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertCircle, 
  CheckCircle2, 
  History, 
  Coins, 
  Plus, 
  FileText, 
  Lock, 
  User, 
  Calendar,
  HelpCircle,
  RefreshCcw
} from 'lucide-react';

export const CashRegisterModule: React.FC = () => {
  const {
    language,
    cashRegisters,
    cashSessions,
    cashMovements,
    cashReconciliations,
    addCashRegister,
    openCashSessionNew,
    closeCashSessionNew,
    addCashMovement,
  } = useStore();

  const { userProfile, currentUser } = useAuth();

  // Navigation tabs: 'registers' | 'active-session' | 'history' | 'movements'
  const [activeTab, setActiveTab] = useState<'registers' | 'active-session' | 'history' | 'movements'>('registers');

  // Register state
  const [selectedRegisterId, setSelectedRegisterId] = useState<string>('register-default');
  const [showAddRegisterModal, setShowAddRegisterModal] = useState<boolean>(false);
  const [newRegisterName, setNewRegisterName] = useState<string>('');
  const [newRegisterCode, setNewRegisterCode] = useState<string>('');

  // Session state
  const [showOpenSessionModal, setShowOpenSessionModal] = useState<boolean>(false);
  const [openingFloat, setOpeningFloat] = useState<string>('');

  // Movement state
  const [showMovementModal, setShowMovementModal] = useState<boolean>(false);
  const [movementType, setMovementType] = useState<'cash_in' | 'cash_out' | 'refund'>('cash_in');
  const [movementAmount, setMovementAmount] = useState<string>('');
  const [movementReason, setMovementReason] = useState<string>('');

  // Reconciliation state
  const [showReconcileModal, setShowReconcileModal] = useState<boolean>(false);
  const [reconcileNotes, setReconcileNotes] = useState<string>('');
  const [actualBalance, setActualBalance] = useState<string>('');
  
  // Cash breakdown state
  const [breakdown, setBreakdown] = useState({
    notes200: 0,
    notes100: 0,
    notes50: 0,
    notes20: 0,
    coins10: 0,
    coins5: 0,
    coins2: 0,
    coins1: 0
  });

  const activeSession = useMemo(() => {
    return cashSessions.find(s => s.status === 'open' && s.registerId === selectedRegisterId);
  }, [cashSessions, selectedRegisterId]);

  const selectedRegister = useMemo(() => {
    return cashRegisters.find(r => r.id === selectedRegisterId);
  }, [cashRegisters, selectedRegisterId]);

  // Calculate actual total from breakdown
  const breakdownTotal = useMemo(() => {
    return (
      breakdown.notes200 * 200 +
      breakdown.notes100 * 100 +
      breakdown.notes50 * 50 +
      breakdown.notes20 * 20 +
      breakdown.coins10 * 10 +
      breakdown.coins5 * 5 +
      breakdown.coins2 * 2 +
      breakdown.coins1 * 1
    );
  }, [breakdown]);

  // Sync actual counted balance when breakdown updates
  const handleBreakdownChange = (field: keyof typeof breakdown, value: string) => {
    const num = Math.max(0, parseInt(value) || 0);
    const newBreakdown = { ...breakdown, [field]: num };
    setBreakdown(newBreakdown);
    
    // Auto calculate and update actual balance field
    const total = (
      newBreakdown.notes200 * 200 +
      newBreakdown.notes100 * 100 +
      newBreakdown.notes50 * 50 +
      newBreakdown.notes20 * 20 +
      newBreakdown.coins10 * 10 +
      newBreakdown.coins5 * 5 +
      newBreakdown.coins2 * 2 +
      newBreakdown.coins1 * 1
    );
    setActualBalance(total.toString());
  };

  const handleCreateRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegisterName || !newRegisterCode) return;
    addCashRegister({
      name: newRegisterName,
      code: newRegisterCode,
      status: 'active'
    });
    setNewRegisterName('');
    setNewRegisterCode('');
    setShowAddRegisterModal(false);
  };

  const handleOpenSession = (e: React.FormEvent) => {
    e.preventDefault();
    const floatVal = parseFloat(openingFloat) || 0;
    openCashSessionNew(selectedRegisterId, floatVal);
    setOpeningFloat('');
    setShowOpenSessionModal(false);
    setActiveTab('active-session');
  };

  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    const amountVal = parseFloat(movementAmount) || 0;
    if (amountVal <= 0 || !movementReason) return;

    addCashMovement(activeSession.id, movementType, amountVal, movementReason);
    setMovementAmount('');
    setMovementReason('');
    setShowMovementModal(false);
  };

  const handleReconcile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    const actualVal = parseFloat(actualBalance) || 0;

    closeCashSessionNew(activeSession.id, actualVal, reconcileNotes, breakdown);
    setActualBalance('');
    setReconcileNotes('');
    setBreakdown({
      notes200: 0,
      notes100: 0,
      notes50: 0,
      notes20: 0,
      coins10: 0,
      coins5: 0,
      coins2: 0,
      coins1: 0
    });
    setShowReconcileModal(false);
    setActiveTab('registers');
  };

  // Filter movements for the active session or overall
  const activeMovementsList = useMemo(() => {
    if (!activeSession) return [];
    return cashMovements.filter(m => m.sessionId === activeSession.id);
  }, [cashMovements, activeSession]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header section with brand identity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-mono flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-600" />
            Gestion des Caisses & Coffres
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Supervisez les sessions de caisse en temps réel, déclarez les fonds d'ouverture, suivez les flux d'espèces et effectuez des rapprochements fiables.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddRegisterModal(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-mono text-sm flex items-center gap-1.5 transition-colors duration-150"
          >
            <Plus className="w-4 h-4" /> Nouvelle Caisse
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('registers')}
          className={`px-4 py-2.5 font-mono text-sm border-b-2 transition-colors duration-150 ${
            activeTab === 'registers'
              ? 'border-slate-950 text-slate-950 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Caisses Disponibles ({cashRegisters.length})
        </button>
        <button
          onClick={() => setActiveTab('active-session')}
          className={`px-4 py-2.5 font-mono text-sm border-b-2 transition-colors duration-150 ${
            activeTab === 'active-session'
              ? 'border-slate-950 text-slate-950 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Session Active {activeSession && '●'}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 font-mono text-sm border-b-2 transition-colors duration-150 ${
            activeTab === 'history'
              ? 'border-slate-950 text-slate-950 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Sessions Clôturées ({cashSessions.filter(s => s.status === 'closed').length})
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2.5 font-mono text-sm border-b-2 transition-colors duration-150 ${
            activeTab === 'movements'
              ? 'border-slate-950 text-slate-950 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Flux Historique
        </button>
      </div>

      {/* Main Content Area */}
      <div className="mt-6">

        {/* TAB 1: REGISTERS LIST */}
        {activeTab === 'registers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cashRegisters.map(register => {
              const session = cashSessions.find(s => s.registerId === register.id && s.status === 'open');
              return (
                <div 
                  key={register.id} 
                  className={`bg-white border p-5 transition-shadow duration-150 flex flex-col justify-between hover:shadow-xs ${
                    session ? 'border-emerald-500/30 shadow-emerald-500/5 shadow-md' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-xs text-slate-400 font-bold block uppercase tracking-wider mb-1">
                          {register.code}
                        </span>
                        <h3 className="font-mono font-bold text-lg text-slate-900">
                          {register.name}
                        </h3>
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-mono font-semibold ${
                        session 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-500/20' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {session ? 'OUVERTE' : 'DISPONIBLE'}
                      </span>
                    </div>

                    {session ? (
                      <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Caissier :</span>
                          <span className="font-semibold text-slate-900">{session.openedBy}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Ouvert à :</span>
                          <span className="font-mono font-medium text-slate-700">{session.openedAt}</span>
                        </div>
                        <div className="flex justify-between text-base border-t border-slate-50 pt-2 mt-2">
                          <span className="text-slate-600 font-medium">Solde Théorique :</span>
                          <span className="font-mono font-bold text-emerald-600">
                            {session.expectedBalance.toFixed(2)} MAD
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 text-slate-500 text-sm italic">
                        Aucune session de caisse en cours sur ce terminal.
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
                    {session ? (
                      <>
                        <button
                          onClick={() => {
                            setSelectedRegisterId(register.id);
                            setActiveTab('active-session');
                          }}
                          className="flex-1 py-2 text-center border border-slate-300 hover:border-slate-800 text-slate-700 hover:text-slate-950 text-xs font-mono font-bold transition-all"
                        >
                          Gérer la caisse
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRegisterId(register.id);
                            setActualBalance(session.expectedBalance.toString());
                            setShowReconcileModal(true);
                          }}
                          className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-mono font-bold transition-colors"
                        >
                          Fermer
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedRegisterId(register.id);
                          setShowOpenSessionModal(true);
                        }}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold text-center transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Ouvrir une session
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: ACTIVE SESSION DASHBOARD */}
        {activeTab === 'active-session' && (
          <div className="space-y-6">
            {!activeSession ? (
              <div className="bg-slate-50 border border-slate-200 p-8 text-center max-w-md mx-auto">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="font-mono font-bold text-lg text-slate-900 mb-2">Aucune session active</h3>
                <p className="text-sm text-slate-500 mb-5">
                  Pour gérer des mouvements d'espèces ou encaisser, sélectionnez l'une des caisses disponibles et ouvrez une session.
                </p>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500 font-bold font-mono block uppercase">Choisir une caisse</label>
                  <select
                    value={selectedRegisterId}
                    onChange={(e) => setSelectedRegisterId(e.target.value)}
                    className="w-full border border-slate-300 bg-white px-3 py-2 text-sm font-mono focus:border-slate-900 outline-none"
                  >
                    {cashRegisters.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setShowOpenSessionModal(true)}
                  className="mt-4 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-mono text-sm font-bold flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Déclarer le fond de caisse
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Session Summary Card */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white border border-slate-200 p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-5 gap-3">
                      <div>
                        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 border border-emerald-500/20 font-semibold font-mono">
                          SESSION OUVERTE
                        </span>
                        <h2 className="text-xl font-bold font-mono text-slate-900 mt-1.5">
                          {activeSession.registerName} ({selectedRegister?.code})
                        </h2>
                      </div>
                      <div className="text-slate-500 text-sm font-mono text-right">
                        <div>Caissier : <span className="font-semibold text-slate-900">{activeSession.openedBy}</span></div>
                        <div>Ouvert à : {activeSession.openedAt}</div>
                      </div>
                    </div>

                    {/* Dashboard metrics grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      
                      <div className="bg-slate-50 p-4 border border-slate-100">
                        <span className="text-xs text-slate-500 block font-mono font-semibold uppercase">
                          Fond d'ouverture
                        </span>
                        <span className="text-xl font-mono font-bold text-slate-900 block mt-1">
                          {activeSession.openingFloat.toFixed(2)} MAD
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Espèces de départ</span>
                      </div>

                      <div className="bg-emerald-50/50 p-4 border border-emerald-100">
                        <span className="text-xs text-emerald-700 block font-mono font-semibold uppercase">
                          Ventes en Espèces
                        </span>
                        <span className="text-xl font-mono font-bold text-emerald-700 block mt-1">
                          +{activeSession.totalCashSales.toFixed(2)} MAD
                        </span>
                        <span className="text-[10px] text-emerald-500 block mt-0.5">Encaissé par le POS</span>
                      </div>

                      <div className="bg-rose-50/50 p-4 border border-rose-100">
                        <span className="text-xs text-rose-700 block font-mono font-semibold uppercase">
                          Remboursements
                        </span>
                        <span className="text-xl font-mono font-bold text-rose-700 block mt-1">
                          -{activeSession.totalCashRefunds.toFixed(2)} MAD
                        </span>
                        <span className="text-[10px] text-rose-500 block mt-0.5">Remboursé en espèces</span>
                      </div>

                      <div className="bg-slate-50 p-4 border border-slate-100">
                        <span className="text-xs text-slate-500 block font-mono font-semibold uppercase">
                          Total Entrées (Cash In)
                        </span>
                        <span className="text-xl font-mono font-bold text-slate-800 block mt-1">
                          +{activeSession.totalCashIn.toFixed(2)} MAD
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Ajouts manuels</span>
                      </div>

                      <div className="bg-slate-50 p-4 border border-slate-100">
                        <span className="text-xs text-slate-500 block font-mono font-semibold uppercase">
                          Total Sorties (Cash Out)
                        </span>
                        <span className="text-xl font-mono font-bold text-slate-800 block mt-1">
                          -{activeSession.totalCashOut.toFixed(2)} MAD
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Retraits manuels</span>
                      </div>

                      <div className="bg-slate-900 text-white p-4">
                        <span className="text-xs text-slate-400 block font-mono font-bold uppercase">
                          Solde Théorique Attendu
                        </span>
                        <span className="text-xl font-mono font-bold text-emerald-400 block mt-1">
                          {activeSession.expectedBalance.toFixed(2)} MAD
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Solde théorique attendu</span>
                      </div>

                    </div>

                    <div className="flex flex-wrap gap-4 mt-6 border-t border-slate-100 pt-5">
                      <button
                        onClick={() => {
                          setMovementType('cash_in');
                          setShowMovementModal(true);
                        }}
                        className="flex-1 min-w-[150px] py-2.5 border border-slate-300 hover:border-slate-800 text-slate-800 hover:text-slate-950 font-mono text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5"
                      >
                        <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                        Déposer des Espèces (Cash In)
                      </button>
                      <button
                        onClick={() => {
                          setMovementType('cash_out');
                          setShowMovementModal(true);
                        }}
                        className="flex-1 min-w-[150px] py-2.5 border border-slate-300 hover:border-slate-800 text-slate-800 hover:text-slate-950 font-mono text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5"
                      >
                        <ArrowDownLeft className="w-4 h-4 text-rose-600" />
                        Retirer des Espèces (Cash Out)
                      </button>
                      <button
                        onClick={() => {
                          setMovementType('refund');
                          setShowMovementModal(true);
                        }}
                        className="flex-1 min-w-[150px] py-2.5 border border-slate-300 hover:border-slate-800 text-slate-800 hover:text-slate-950 font-mono text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5"
                      >
                        <RefreshCcw className="w-4 h-4 text-amber-600 animate-spin-hover" />
                        Rembourser des Espèces (Refund)
                      </button>
                      <button
                        onClick={() => {
                          setActualBalance(activeSession.expectedBalance.toString());
                          setShowReconcileModal(true);
                        }}
                        className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold transition-colors text-center flex items-center justify-center gap-1.5"
                      >
                        <Lock className="w-4 h-4" />
                        Clôturer & Rapprocher
                      </button>
                    </div>
                  </div>

                  {/* Active Session Movements List */}
                  <div className="bg-white border border-slate-200 p-6">
                    <h3 className="font-mono font-bold text-sm text-slate-900 uppercase tracking-wide mb-4">
                      Flux d'espèces de cette session
                    </h3>
                    {activeMovementsList.length === 0 ? (
                      <p className="text-sm text-slate-500 italic">Aucun mouvement saisi pour l'instant.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm font-sans">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-400 font-mono uppercase text-xs">
                              <th className="py-2 pb-3 font-semibold">Heure</th>
                              <th className="py-2 pb-3 font-semibold">Type</th>
                              <th className="py-2 pb-3 font-semibold">Montant</th>
                              <th className="py-2 pb-3 font-semibold">Motif / Origine</th>
                              <th className="py-2 pb-3 font-semibold">Auteur</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono text-xs">
                            {activeMovementsList.map(m => (
                              <tr key={m.id} className="hover:bg-slate-50/50">
                                <td className="py-3 text-slate-500">{m.timestamp.substring(11, 16)}</td>
                                <td className="py-3">
                                  <span className={`px-2 py-0.5 text-[10px] font-bold ${
                                    m.type === 'opening' ? 'bg-slate-100 text-slate-700' :
                                    m.type === 'sale' ? 'bg-emerald-50 text-emerald-700 border border-emerald-500/10' :
                                    m.type === 'refund' ? 'bg-rose-50 text-rose-700 border border-rose-500/10' :
                                    m.type === 'cash_in' ? 'bg-cyan-50 text-cyan-700 border border-cyan-500/10' :
                                    'bg-amber-50 text-amber-700 border border-amber-500/10'
                                  }`}>
                                    {m.type.toUpperCase()}
                                  </span>
                                </td>
                                <td className={`py-3 font-bold ${
                                  m.type === 'sale' || m.type === 'cash_in' || m.type === 'opening' ? 'text-emerald-600' : 'text-rose-600'
                                }`}>
                                  {m.type === 'sale' || m.type === 'cash_in' || m.type === 'opening' ? '+' : '-'}{m.amount.toFixed(2)} MAD
                                </td>
                                <td className="py-3 text-slate-700 max-w-xs truncate">{m.reason}</td>
                                <td className="py-3 text-slate-500">{m.performedBy}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side helper info panel */}
                <div className="space-y-6">
                  <div className="bg-slate-900 text-white p-6 border border-slate-800">
                    <h3 className="font-mono font-bold text-sm uppercase tracking-wide mb-3 flex items-center gap-1.5 text-emerald-400">
                      <HelpCircle className="w-4 h-4" /> Conseil de Contrôle Maroc
                    </h3>
                    <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
                      <p>
                        Afin de respecter la réglementation marocaine en matière d'exactitude comptable et de contrôle fiscal :
                      </p>
                      <ul className="list-disc pl-4 space-y-2">
                        <li>Faites des rapprochements de caisse quotidiens (clôtures de fin de journée obligatoires).</li>
                        <li>Saisissez rigoureusement chaque prélèvement d'espèces (paiement direct d'un coursier, achat d'une fourniture locale urgente) comme un <b>Cash Out</b> avec facture d'achat ou justificatif.</li>
                        <li>Séparez les encaissements par carte CMI et par chèque des espèces réelles de la caisse pour éviter les écarts d'analyse.</li>
                      </ul>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 3: CLOSED SESSIONS HISTORY */}
        {activeTab === 'history' && (
          <div className="bg-white border border-slate-200 p-6">
            <h3 className="font-mono font-bold text-sm text-slate-900 uppercase tracking-wide mb-4">
              Sessions de caisse archivées
            </h3>
            {cashSessions.filter(s => s.status === 'closed').length === 0 ? (
              <p className="text-sm text-slate-500 italic text-center py-6">Aucune session archivée dans ce registre.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-sans">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-mono uppercase text-xs">
                      <th className="py-2 pb-3 font-semibold">Caisse</th>
                      <th className="py-2 pb-3 font-semibold">Ouverte le</th>
                      <th className="py-2 pb-3 font-semibold">Clôturée le</th>
                      <th className="py-2 pb-3 font-semibold">Solde Attendu</th>
                      <th className="py-2 pb-3 font-semibold">Solde Réel</th>
                      <th className="py-2 pb-3 font-semibold">Écart / Discrepancy</th>
                      <th className="py-2 pb-3 font-semibold">Statut</th>
                      <th className="py-2 pb-3 font-semibold">Caissier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {cashSessions.filter(s => s.status === 'closed').map(s => {
                      const rec = cashReconciliations.find(r => r.sessionId === s.id);
                      const diff = s.difference || 0;
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="py-3 font-bold text-slate-900">{s.registerName}</td>
                          <td className="py-3 text-slate-600">{s.openedAt}</td>
                          <td className="py-3 text-slate-600">{s.closedAt}</td>
                          <td className="py-3 font-medium text-slate-800">{s.expectedBalance.toFixed(2)} MAD</td>
                          <td className="py-3 font-bold text-slate-900">{(s.actualBalance || 0).toFixed(2)} MAD</td>
                          <td className={`py-3 font-bold ${
                            diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-amber-600' : 'text-rose-600'
                          }`}>
                            {diff === 0 ? '0.00 MAD' : `${diff > 0 ? '+' : ''}${diff.toFixed(2)} MAD`}
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 text-[10px] font-bold ${
                              diff === 0 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-500/10' 
                                : 'bg-rose-50 text-rose-700 border border-rose-500/10'
                            }`}>
                              {diff === 0 ? 'CONCORDANT' : 'ÉCART'}
                            </span>
                          </td>
                          <td className="py-3 text-slate-500">{s.closedBy || s.openedBy}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FLUX HISTORIQUE */}
        {activeTab === 'movements' && (
          <div className="bg-white border border-slate-200 p-6">
            <h3 className="font-mono font-bold text-sm text-slate-900 uppercase tracking-wide mb-4">
              Audit global de tous les mouvements de caisse
            </h3>
            {cashMovements.length === 0 ? (
              <p className="text-sm text-slate-500 italic text-center py-6">Aucun mouvement à afficher dans l'historique d'audit.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-sans">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-mono uppercase text-xs">
                      <th className="py-2 pb-3 font-semibold">Date & Heure</th>
                      <th className="py-2 pb-3 font-semibold">Caisse</th>
                      <th className="py-2 pb-3 font-semibold">Type de Flux</th>
                      <th className="py-2 pb-3 font-semibold">Montant</th>
                      <th className="py-2 pb-3 font-semibold">Motif / Justification</th>
                      <th className="py-2 pb-3 font-semibold">Opérateur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {cashMovements.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/50">
                        <td className="py-3 text-slate-600">{m.timestamp}</td>
                        <td className="py-3 font-medium text-slate-800">
                          {cashRegisters.find(r => r.id === m.registerId)?.name || 'Caisse Inconnue'}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 text-[10px] font-bold ${
                            m.type === 'opening' ? 'bg-slate-100 text-slate-700' :
                            m.type === 'sale' ? 'bg-emerald-50 text-emerald-700 border border-emerald-500/10' :
                            m.type === 'refund' ? 'bg-rose-50 text-rose-700 border border-rose-500/10' :
                            m.type === 'cash_in' ? 'bg-cyan-50 text-cyan-700 border border-cyan-500/10' :
                            'bg-amber-50 text-amber-700 border border-amber-500/10'
                          }`}>
                            {m.type.toUpperCase()}
                          </span>
                        </td>
                        <td className={`py-3 font-bold ${
                          m.type === 'sale' || m.type === 'cash_in' || m.type === 'opening' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {m.type === 'sale' || m.type === 'cash_in' || m.type === 'opening' ? '+' : '-'}{m.amount.toFixed(2)} MAD
                        </td>
                        <td className="py-3 text-slate-700">{m.reason}</td>
                        <td className="py-3 text-slate-500">{m.performedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL 1: ADD NEW REGISTER */}
      {showAddRegisterModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold font-mono text-slate-900 border-b border-slate-100 pb-2">
              Créer un terminal de caisse
            </h3>
            <form onSubmit={handleCreateRegister} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-bold font-mono block uppercase">Nom de la Caisse</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Caisse Principale, Tiroir Magasin B, etc."
                  value={newRegisterName}
                  onChange={(e) => setNewRegisterName(e.target.value)}
                  className="w-full border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-bold font-mono block uppercase">Code Unique</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: CAISSE-02, COFFRE-CENTRAL"
                  value={newRegisterCode}
                  onChange={(e) => setNewRegisterCode(e.target.value)}
                  className="w-full border border-slate-300 bg-white px-3 py-2 text-sm font-mono focus:border-slate-900 outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddRegisterModal(false)}
                  className="px-4 py-2 border border-slate-300 hover:border-slate-800 text-slate-700 hover:text-slate-950 font-mono text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold"
                >
                  Créer la Caisse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: OPEN CASH SESSION (INITIAL FLOAT) */}
      {showOpenSessionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div>
              <span className="text-xs text-slate-400 font-mono font-bold block uppercase tracking-wider">
                {selectedRegister?.code}
              </span>
              <h3 className="text-lg font-bold font-mono text-slate-900">
                Déclaration de fond d'ouverture de caisse
              </h3>
            </div>
            <form onSubmit={handleOpenSession} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-bold font-mono block uppercase">
                  Fond de caisse initial (MAD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  placeholder="Saisissez la valeur des pièces/billets au départ"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  className="w-full border border-slate-300 bg-white px-3 py-2 text-sm font-mono focus:border-slate-900 outline-none"
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed italic">
                Ce montant correspond au fond de roulement en espèces placé dans le tiroir ce matin pour assurer le rendu de monnaie sur les premières ventes.
              </p>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOpenSessionModal(false)}
                  className="px-4 py-2 border border-slate-300 hover:border-slate-800 text-slate-700 hover:text-slate-950 font-mono text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold"
                >
                  Ouvrir la session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CASH MOVEMENT (CASH IN / CASH OUT) */}
      {showMovementModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold font-mono text-slate-900 border-b border-slate-100 pb-2">
              {movementType === 'cash_in' ? 'Déposer des Espèces (Cash In)' : movementType === 'cash_out' ? 'Retirer des Espèces (Cash Out)' : 'Rembourser des Espèces (Cash Refund)'}
            </h3>
            <form onSubmit={handleAddMovement} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-bold font-mono block uppercase">
                  Montant en MAD
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  placeholder="0.00"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  className="w-full border border-slate-300 bg-white px-3 py-2 text-sm font-mono focus:border-slate-900 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-bold font-mono block uppercase">
                  Motif / Justification obligatoire
                </label>
                <input
                  type="text"
                  required
                  placeholder={movementType === 'cash_in' ? 'Ex: Apport de monnaie, dépôt supplémentaire' : movementType === 'cash_out' ? 'Ex: Achat fournitures bureau, café, timbre fiscal' : 'Ex: Retour article client, remboursement direct'}
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  className="w-full border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="px-4 py-2 border border-slate-300 hover:border-slate-800 text-slate-700 hover:text-slate-950 font-mono text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold"
                >
                  Valider le flux
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CLOSING RECONCILIATION WIZARD */}
      {showReconcileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xl font-bold font-mono text-slate-900">
                Rapprochement de Caisse de Clôture
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Comptabilisez précisément les espèces physiques de votre tiroir-caisse pour détecter les discrepancies.
              </p>
            </div>

            <form onSubmit={handleReconcile} className="space-y-6">
              
              {/* Dynamic Bill and Coin Counter Grid */}
              <div className="bg-slate-50 p-4 border border-slate-100">
                <h4 className="font-mono text-xs font-bold uppercase tracking-wide text-slate-700 mb-3 flex items-center gap-1">
                  <Coins className="w-4 h-4 text-emerald-600" />
                  Calculateur de Billets & Pièces (MAD)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold font-mono text-slate-500 block">200 DH Billets</label>
                    <input
                      type="number"
                      min="0"
                      value={breakdown.notes200 || ''}
                      placeholder="0"
                      onChange={(e) => handleBreakdownChange('notes200', e.target.value)}
                      className="w-full border border-slate-300 bg-white px-2 py-1 text-xs font-mono outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold font-mono text-slate-500 block">100 DH Billets</label>
                    <input
                      type="number"
                      min="0"
                      value={breakdown.notes100 || ''}
                      placeholder="0"
                      onChange={(e) => handleBreakdownChange('notes100', e.target.value)}
                      className="w-full border border-slate-300 bg-white px-2 py-1 text-xs font-mono outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold font-mono text-slate-500 block">50 DH Billets</label>
                    <input
                      type="number"
                      min="0"
                      value={breakdown.notes50 || ''}
                      placeholder="0"
                      onChange={(e) => handleBreakdownChange('notes50', e.target.value)}
                      className="w-full border border-slate-300 bg-white px-2 py-1 text-xs font-mono outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold font-mono text-slate-500 block">20 DH Billets</label>
                    <input
                      type="number"
                      min="0"
                      value={breakdown.notes20 || ''}
                      placeholder="0"
                      onChange={(e) => handleBreakdownChange('notes20', e.target.value)}
                      className="w-full border border-slate-300 bg-white px-2 py-1 text-xs font-mono outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold font-mono text-slate-500 block">10 DH Pièces</label>
                    <input
                      type="number"
                      min="0"
                      value={breakdown.coins10 || ''}
                      placeholder="0"
                      onChange={(e) => handleBreakdownChange('coins10', e.target.value)}
                      className="w-full border border-slate-300 bg-white px-2 py-1 text-xs font-mono outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold font-mono text-slate-500 block">5 DH Pièces</label>
                    <input
                      type="number"
                      min="0"
                      value={breakdown.coins5 || ''}
                      placeholder="0"
                      onChange={(e) => handleBreakdownChange('coins5', e.target.value)}
                      className="w-full border border-slate-300 bg-white px-2 py-1 text-xs font-mono outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold font-mono text-slate-500 block">2 DH Pièces</label>
                    <input
                      type="number"
                      min="0"
                      value={breakdown.coins2 || ''}
                      placeholder="0"
                      onChange={(e) => handleBreakdownChange('coins2', e.target.value)}
                      className="w-full border border-slate-300 bg-white px-2 py-1 text-xs font-mono outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold font-mono text-slate-500 block">1 DH Pièces</label>
                    <input
                      type="number"
                      min="0"
                      value={breakdown.coins1 || ''}
                      placeholder="0"
                      onChange={(e) => handleBreakdownChange('coins1', e.target.value)}
                      className="w-full border border-slate-300 bg-white px-2 py-1 text-xs font-mono outline-none"
                    />
                  </div>

                </div>
                <div className="text-right text-xs text-slate-500 mt-2 font-mono font-medium">
                  Total calculé : <span className="font-bold text-slate-900">{breakdownTotal.toFixed(2)} MAD</span>
                </div>
              </div>

              {/* Rapprochement stats fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 font-bold font-mono block uppercase">
                      Solde attendu en caisse
                    </label>
                    <div className="w-full bg-slate-100 border border-slate-200 px-3 py-2 text-sm font-mono text-slate-700 font-semibold">
                      {activeSession?.expectedBalance.toFixed(2)} MAD
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 font-bold font-mono block uppercase">
                      Solde réel compté (MAD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0"
                      placeholder="0.00"
                      value={actualBalance}
                      onChange={(e) => setActualBalance(e.target.value)}
                      className="w-full border border-slate-300 bg-white px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:border-slate-900 outline-none"
                    />
                  </div>
                </div>

                {/* Discrepancy analysis screen */}
                <div className="bg-slate-50 p-4 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <label className="text-xs text-slate-500 font-bold font-mono block uppercase mb-1">
                      Analyse de l'écart (Discrepancy)
                    </label>
                    {activeSession && (() => {
                      const expected = activeSession.expectedBalance;
                      const actual = parseFloat(actualBalance) || 0;
                      const diff = Number((actual - expected).toFixed(2));

                      if (diff === 0) {
                        return (
                          <div className="space-y-2">
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 text-xs font-bold font-mono border border-emerald-500/20">
                              <CheckCircle2 className="w-4 h-4" /> PARFAIT : Caisse Concordante
                            </span>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Le montant compté correspond exactement au montant théorique enregistré par le système.
                            </p>
                          </div>
                        );
                      } else {
                        return (
                          <div className="space-y-2">
                            <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-1 text-xs font-bold font-mono border border-rose-500/20">
                              <AlertCircle className="w-4 h-4" /> ATTENTION : Écart détecté
                            </span>
                            <div className="text-lg font-mono font-bold text-rose-600">
                              {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} MAD
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              {diff < 0 
                                ? "Il manque de l'argent dans le tiroir-caisse par rapport aux ventes théoriques. Une explication écrite est requise." 
                                : "Il y a un excédent de caisse. Veuillez vérifier s'il ne s'agit pas d'un rendu de monnaie oublié ou d'un flux non saisi."}
                            </p>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>

              </div>

              {/* Justification Notes */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-bold font-mono block uppercase">
                  Notes explicatives / Justification de clôture
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Écart de 10 MAD dû à un arrondi de rendu de monnaie sur achat fournisseur direct. Tout le reste est OK."
                  value={reconcileNotes}
                  onChange={(e) => setReconcileNotes(e.target.value)}
                  className="w-full border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 outline-none"
                />
              </div>

              {/* Modal actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReconcileModal(false)}
                  className="px-4 py-2 border border-slate-300 hover:border-slate-800 text-slate-700 hover:text-slate-950 font-mono text-xs font-bold"
                >
                  Retour
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs font-bold flex items-center gap-1.5"
                >
                  <Lock className="w-4 h-4" />
                  Valider et Clôturer la caisse
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
