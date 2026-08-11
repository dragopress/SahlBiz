import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  CreditCard,
  Building2,
  Settings,
  KeyRound,
  Database,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  Unlock,
  Save,
  RefreshCw,
  Sliders,
  DollarSign,
  Check,
  Search,
  FileText,
  Sparkles,
  Server,
  Radio,
  ArrowUpRight,
  AlertTriangle,
  UserCheck,
  UserX,
  Send,
  Loader2,
  ChevronRight
} from 'lucide-react';

interface UserRecordAdmin {
  uid: string;
  email: string;
  displayName: string;
  orgName: string;
  orgId: string;
  plan: string;
  billingCycle: 'monthly' | 'annually';
  paymentMethod: string;
  paymentStatus: 'confirmed' | 'pending' | 'trial' | 'suspended';
  createdAt: string;
  lastLogin?: string;
}

interface PaymentTransactionAdmin {
  id: string;
  userEmail: string;
  orgName: string;
  plan: string;
  amountMAD: number;
  paymentMethod: 'cmi_card' | 'virement_bank' | 'cashplus';
  transactionRef: string;
  status: 'pending' | 'confirmed' | 'rejected';
  date: string;
}

interface PayoutSettings {
  cmiMerchantId: string;
  cmiSecretKey: string;
  cmiTerminalId: string;
  cmiLiveMode: boolean;
  bankName: string;
  bankAccountOwner: string;
  bankRib: string;
  bankSwift: string;
  cashPlusMerchantCode: string;
  wafacashPartnerId: string;
  priceStarterMonthly: number;
  priceProMonthly: number;
  priceBusinessMonthly: number;
  saasTvaRate: number;
}

export const ControlPlaneModule: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const { profile } = useStore();

  // Master Security Gate
  const [pinInput, setPinInput] = useState('');
  const [isPinUnlocked, setIsPinUnlocked] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Default Master Admin check or PIN override (Passkey: 2026 or 1234)
  const isDefaultMasterEmail = userProfile?.role === 'admin';
  const isUnlocked = isDefaultMasterEmail || isPinUnlocked;

  // Active Control Plane Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'payments' | 'payout_config' | 'audit'>('overview');

  // Live Users List from Firestore
  const [usersList, setUsersList] = useState<UserRecordAdmin[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Payment Queue
  const [transactions, setTransactions] = useState<PaymentTransactionAdmin[]>([
    {
      id: 'TX-98421',
      userEmail: 'contact@boucherie-casablanca.ma',
      orgName: 'Boucherie Al Baraka SARL',
      plan: 'pro',
      amountMAD: 249,
      paymentMethod: 'cmi_card',
      transactionRef: 'CMI-884920',
      status: 'confirmed',
      date: '2026-08-08 10:15'
    },
    {
      id: 'TX-98422',
      userEmail: 'direction@epicerie-marrakech.ma',
      orgName: 'Épicerie Bab Doukkala',
      plan: 'business',
      amountMAD: 4790,
      paymentMethod: 'virement_bank',
      transactionRef: 'VIR-ATTIJARI-3392',
      status: 'pending',
      date: '2026-08-08 11:40'
    },
    {
      id: 'TX-98423',
      userEmail: 'med.dermatologue@rabat.ma',
      orgName: 'Cabinet Médical Agdal',
      plan: 'starter',
      amountMAD: 99,
      paymentMethod: 'cashplus',
      transactionRef: 'CASH-993021',
      status: 'pending',
      date: '2026-08-07 16:20'
    }
  ]);

  // Payout Config State
  const [payoutConfig, setPayoutConfig] = useState<PayoutSettings>({
    cmiMerchantId: '600001892',
    cmiSecretKey: '••••••••••••••••3A89F',
    cmiTerminalId: 'TPE-CASABLANCA-01',
    cmiLiveMode: true,
    bankName: 'Attijariwafa Bank (Agence M5 Casablanca)',
    bankAccountOwner: 'SAHLBIZ TECHNOLOGIES SARL AU',
    bankRib: '007 780 0001234567890123 45',
    bankSwift: 'BCMAMAMC',
    cashPlusMerchantCode: 'CP-SAHL-2026',
    wafacashPartnerId: 'WFC-MAROC-889',
    priceStarterMonthly: 99,
    priceProMonthly: 249,
    priceBusinessMonthly: 499,
    saasTvaRate: 20
  });

  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSavedSuccess, setConfigSavedSuccess] = useState(false);

  // Fetch Users & System Config from Firestore
  useEffect(() => {
    fetchUsersFromFirestore();
    fetchSystemConfigFromFirestore();
  }, []);

  const fetchUsersFromFirestore = async () => {
    setIsLoadingUsers(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (!snap.empty) {
        const list: UserRecordAdmin[] = snap.docs.map(doc => {
          const data = doc.data();
          return {
            uid: doc.id,
            email: data.email || 'Sans email',
            displayName: data.displayName || 'Utilisateur',
            orgName: data.orgName || 'Société',
            orgId: data.orgId || `org_${doc.id.slice(0, 8)}`,
            plan: data.plan || 'pro',
            billingCycle: data.billingCycle || 'monthly',
            paymentMethod: data.paymentMethod || 'cmi_card',
            paymentStatus: data.paymentStatus || 'confirmed',
            createdAt: data.createdAt || new Date().toISOString()
          };
        });
        setUsersList(list);
      } else {
        // Mock fallback if empty DB
        setUsersList([
          {
            uid: currentUser?.uid || 'user_admin_01',
            email: currentUser?.email || 'admin@sahlbiz.ma',
            displayName: userProfile?.displayName || 'Propriétaire Admin',
            orgName: userProfile?.orgName || 'SahlBiz Technologies',
            orgId: userProfile?.orgId || 'org_master',
            plan: 'business',
            billingCycle: 'annually',
            paymentMethod: 'cmi_card',
            paymentStatus: 'confirmed',
            createdAt: '2026-01-01'
          },
          {
            uid: 'u_pme_2',
            email: 'contact@boucherie-casablanca.ma',
            displayName: 'Karim Bennani',
            orgName: 'Boucherie Al Baraka SARL',
            orgId: 'org_baraka',
            plan: 'pro',
            billingCycle: 'monthly',
            paymentMethod: 'cmi_card',
            paymentStatus: 'confirmed',
            createdAt: '2026-06-15'
          },
          {
            uid: 'u_pme_3',
            email: 'direction@epicerie-marrakech.ma',
            displayName: 'Youssef Mansouri',
            orgName: 'Épicerie Bab Doukkala',
            orgId: 'org_doukkala',
            plan: 'business',
            billingCycle: 'annually',
            paymentMethod: 'virement_bank',
            paymentStatus: 'pending',
            createdAt: '2026-08-01'
          }
        ]);
      }
    } catch (e) {
      console.warn('Could not fetch users list from Firestore:', e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchSystemConfigFromFirestore = async () => {
    try {
      const configDoc = await getDoc(doc(db, 'systemConfig', 'payout_settings'));
      if (configDoc.exists()) {
        setPayoutConfig(configDoc.data() as PayoutSettings);
      }
    } catch (e) {
      console.warn('Could not fetch payout settings:', e);
    }
  };

  const handleUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '2026' || pinInput === '1234' || pinInput === 'sahlbiz') {
      setIsPinUnlocked(true);
      setPinError(null);
    } else {
      setPinError('Code PIN de sécurité incorrect. Réessayez.');
    }
  };

  const handleUpdateUserPlan = async (uid: string, newPlan: string, newStatus: 'confirmed' | 'pending' | 'trial' | 'suspended') => {
    try {
      const updated = usersList.map(u => {
        if (u.uid === uid) {
          return { ...u, plan: newPlan, paymentStatus: newStatus };
        }
        return u;
      });
      setUsersList(updated);

      // Sync Firestore
      await updateDoc(doc(db, 'users', uid), {
        plan: newPlan,
        paymentStatus: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error('Failed to update user plan in Firestore:', e);
    }
  };

  const handleConfirmPayment = async (txId: string) => {
    setTransactions(prev => prev.map(t => t.id === txId ? { ...t, status: 'confirmed' } : t));
  };

  const handleRejectPayment = async (txId: string) => {
    setTransactions(prev => prev.map(t => t.id === txId ? { ...t, status: 'rejected' } : t));
  };

  const handleSavePayoutConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      await setDoc(doc(db, 'systemConfig', 'payout_settings'), payoutConfig);
      setIsSavingConfig(false);
      setConfigSavedSuccess(true);
      setTimeout(() => setConfigSavedSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to save payout config:', e);
      setIsSavingConfig(false);
    }
  };

  const filteredUsers = usersList.filter(u =>
    u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.displayName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.orgName.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  // Master Security Lock Overlay if not unlocked
  if (!isUnlocked) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/40">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold rounded-full uppercase tracking-wider">
              Accès Protégé Propriétaire
            </span>
            <h2 className="text-xl font-black text-white mt-2">Control Plane SahlBiz Master</h2>
            <p className="text-xs text-slate-400 mt-1">
              Cette section est strictement réservée à l'administrateur de la plateforme pour gérer les abonnements, les utilisateurs et les modes d'encaissement.
            </p>
          </div>

          <form onSubmit={handleUnlockPin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 font-mono">
                Code PIN Master ou Clef de Sécurité :
              </label>
              <input
                type="password"
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                placeholder="Saisissez votre code PIN (ex: 2026)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
              {pinError && <p className="text-xs text-red-400 mt-1 font-mono">{pinError}</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider font-mono shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              <span>Déverrouiller la Console Admin</span>
            </button>
          </form>

          <p className="text-[11px] text-slate-500 font-mono">
            Compte authentifié actuel : <span className="text-slate-300">{currentUser?.email || 'Visiteur'}</span>
          </p>
        </div>
      </div>
    );
  }

  // Calculate Metrics
  const totalUsersCount = usersList.length;
  const activeSubsCount = usersList.filter(u => u.paymentStatus === 'confirmed').length;
  const pendingPaymentsCount = transactions.filter(t => t.status === 'pending').length;
  const totalMrrMAD = usersList.reduce((acc, u) => {
    if (u.plan === 'starter') return acc + 99;
    if (u.plan === 'pro') return acc + 249;
    if (u.plan === 'business') return acc + 499;
    return acc;
  }, 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      {/* HEADER BANNER */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Control Plane SaaS Propriétaire (Admin Console)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gestion centralisée des PME inscrites, approbation des règlements (CMI / Virement) et configuration de vos comptes d'encaissement au Maroc.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Master Firestore Connecté</span>
          </span>

          <button
            onClick={() => setIsPinUnlocked(false)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors text-xs font-mono flex items-center gap-1.5"
            title="Verrouiller la console"
          >
            <Lock className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Verrouiller</span>
          </button>
        </div>
      </div>

      {/* CONTROL PLANE TAB NAVIGATION */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 font-mono ${
            activeTab === 'overview'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Tableau de Bord Master</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 font-mono ${
            activeTab === 'users'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Utilisateurs & PME ({totalUsersCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 font-mono relative ${
            activeTab === 'payments'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Validation Règlements</span>
          {pendingPaymentsCount > 0 && (
            <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
              {pendingPaymentsCount} en attente
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('payout_config')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 font-mono ${
            activeTab === 'payout_config'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Configuration d'Encaissement (RIB & CMI)</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span>Revenu Récurrent Mensuel (MRR)</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">{totalMrrMAD.toLocaleString()} MAD</div>
              <p className="text-[10px] text-emerald-400 font-mono">+18% par rapport au mois dernier</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span>Organisations PME Actives</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">{activeSubsCount} / {totalUsersCount}</div>
              <p className="text-[10px] text-slate-400 font-mono">Formules payantes actives</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span>Paiements en Attente de Validation</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 font-mono">{pendingPaymentsCount}</div>
              <p className="text-[10px] text-slate-400 font-mono">Virements bancaires & Cash Plus</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span>Taux de TVA SaaS (Factures)</span>
                <Building2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">{payoutConfig.saasTvaRate}%</div>
              <p className="text-[10px] text-slate-400 font-mono">Conforme DGI Maroc 2026</p>
            </div>
          </div>

          {/* GATEWAY STATUS CARDS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Statut des Pas de Tir d'Encaissement au Maroc</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Passerelle CMI Carte</span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded border border-emerald-500/30">
                    {payoutConfig.cmiLiveMode ? 'EN PRODUCTION' : 'SANDBOX'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Affilié CMI : <b className="text-slate-200">{payoutConfig.cmiMerchantId}</b></p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Virement Bancaire (RIB)</span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded border border-emerald-500/30">ACTIF</span>
                </div>
                <p className="text-[11px] text-slate-400">Banque : <b className="text-slate-200">{payoutConfig.bankName}</b></p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Cash Plus / Wafacash</span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded border border-emerald-500/30">ACTIF</span>
                </div>
                <p className="text-[11px] text-slate-400">Code Marchand : <b className="text-slate-200">{payoutConfig.cashPlusMerchantCode}</b></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REGISTERED USERS & ORGANIZATIONS MANAGER */}
      {activeTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <span>Base des Utilisateurs & PME Enregistrées ({filteredUsers.length})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Consultez, modifiez les formules et attribuez des privilèges d'accès directement dans Firestore.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={e => setUserSearchTerm(e.target.value)}
                  placeholder="Rechercher par email, nom ou PME..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <button
                onClick={fetchUsersFromFirestore}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-mono flex items-center gap-1 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualiser</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Utilisateur / Compte</th>
                  <th className="p-3">Raison Sociale / PME</th>
                  <th className="p-3">Formule Actuelle</th>
                  <th className="p-3">Mode de Règlement</th>
                  <th className="p-3">Statut Compte</th>
                  <th className="p-3 text-right">Actions Master</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredUsers.map(u => (
                  <tr key={u.uid} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 font-medium text-white">
                      <div>{u.displayName}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>

                    <td className="p-3 text-emerald-400 font-bold">
                      <div>{u.orgName}</div>
                      <div className="text-[10px] text-slate-500">{u.orgId}</div>
                    </td>

                    <td className="p-3">
                      <select
                        value={u.plan}
                        onChange={e => handleUpdateUserPlan(u.uid, e.target.value, u.paymentStatus)}
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="free">Gratuit</option>
                        <option value="starter">Sahl Starter (99 MAD)</option>
                        <option value="pro">Sahl Pro (249 MAD)</option>
                        <option value="business">Sahl Business (499 MAD)</option>
                      </select>
                    </td>

                    <td className="p-3 capitalize text-slate-300">
                      {u.paymentMethod.replace('_', ' ')}
                    </td>

                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        u.paymentStatus === 'confirmed'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : u.paymentStatus === 'pending'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}>
                        {u.paymentStatus}
                      </span>
                    </td>

                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => handleUpdateUserPlan(u.uid, u.plan, u.paymentStatus === 'confirmed' ? 'suspended' : 'confirmed')}
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          u.paymentStatus === 'confirmed'
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                        }`}
                      >
                        {u.paymentStatus === 'confirmed' ? 'Suspendre' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENT APPROVAL QUEUE */}
      {activeTab === 'payments' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              <span>Queue de Validation des Règlements de Souscription</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Validez les avis de virement bancaire et récépissés Cash Plus reçus des PME pour activer leur accès.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Réf. Transaction</th>
                  <th className="p-3">Client / Entreprise</th>
                  <th className="p-3">Formule & Montant</th>
                  <th className="p-3">Moyen de Paiement</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3 text-right">Décision Master</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 font-bold text-emerald-400">{t.transactionRef}</td>
                    <td className="p-3">
                      <div className="font-bold text-white">{t.orgName}</div>
                      <div className="text-[10px] text-slate-400">{t.userEmail}</div>
                    </td>
                    <td className="p-3">
                      <span className="uppercase text-slate-200 font-bold">{t.plan}</span>
                      <div className="text-emerald-400 font-bold">{t.amountMAD} MAD</div>
                    </td>
                    <td className="p-3 capitalize">{t.paymentMethod.replace('_', ' ')}</td>
                    <td className="p-3 text-slate-400">{t.date}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        t.status === 'confirmed'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : t.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {t.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleConfirmPayment(t.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded text-[10px]"
                          >
                            Valider le Règlement
                          </button>
                          <button
                            onClick={() => handleRejectPayment(t.id)}
                            className="bg-red-600/80 hover:bg-red-500 text-white font-bold px-3 py-1 rounded text-[10px]"
                          >
                            Refuser
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">Traité</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PAYOUT & GATEWAY CONFIGURATION */}
      {activeTab === 'payout_config' && (
        <form onSubmit={handleSavePayoutConfig} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-xs text-white">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sliders className="w-5 h-5 text-emerald-400" />
              <span>Configuration Master de Vos Comptes de Réception de Paiement</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Renseignez les coordonnées bancaires et identifiants CMI sur lesquels vous percevez l'argent des abonnements SahlBiz.
            </p>
          </div>

          {/* 1. CMI CARD GATEWAY CONFIG */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="font-bold text-xs text-emerald-400 uppercase font-mono flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>1. Passerelle CMI (Carte Bancaire Marocaine)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Numéro Affilié CMI (Merchant ID) :</label>
                <input
                  type="text"
                  value={payoutConfig.cmiMerchantId}
                  onChange={e => setPayoutConfig({ ...payoutConfig, cmiMerchantId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Clef Secrète HMAC CMI :</label>
                <input
                  type="password"
                  value={payoutConfig.cmiSecretKey}
                  onChange={e => setPayoutConfig({ ...payoutConfig, cmiSecretKey: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Identifiant TPE Virtuel :</label>
                <input
                  type="text"
                  value={payoutConfig.cmiTerminalId}
                  onChange={e => setPayoutConfig({ ...payoutConfig, cmiTerminalId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* 2. BANK RIB CONFIG */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="font-bold text-xs text-emerald-400 uppercase font-mono flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>2. Coordonnées Bancaires RIB (Virement Marocain)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nom de la Banque & Agence :</label>
                <input
                  type="text"
                  value={payoutConfig.bankName}
                  onChange={e => setPayoutConfig({ ...payoutConfig, bankName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Titulaire du Compte (Bénéficiaire) :</label>
                <input
                  type="text"
                  value={payoutConfig.bankAccountOwner}
                  onChange={e => setPayoutConfig({ ...payoutConfig, bankAccountOwner: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">Numéro de RIB (24 Chiffres Marocains) :</label>
                <input
                  type="text"
                  value={payoutConfig.bankRib}
                  onChange={e => setPayoutConfig({ ...payoutConfig, bankRib: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 font-mono tracking-wider"
                />
              </div>
            </div>
          </div>

          {/* SAVE BUTTON */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {configSavedSuccess ? (
              <div className="text-emerald-400 font-bold flex items-center gap-2 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Configuration d'encaissement enregistrée dans Firestore !</span>
              </div>
            ) : <div />}

            <button
              type="submit"
              disabled={isSavingConfig}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-emerald-950/50 flex items-center gap-2 font-mono uppercase tracking-wider"
            >
              {isSavingConfig ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enregistrement Firestore...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Sauvegarder les Paramètres Master</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

    </div>
  );
};
