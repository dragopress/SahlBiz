import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  User as UserIcon,
  Building2,
  Mail,
  Lock,
  CheckCircle2,
  CreditCard,
  Building,
  Receipt,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Zap,
  HelpCircle,
  Clock,
  AlertCircle,
  Hexagon,
  Award,
  Check,
  Copy,
  Download
} from 'lucide-react';

export interface RegistrationWizardProps {
  initialPlan?: string;
  onCancel?: () => void;
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const RegistrationWizard: React.FC<RegistrationWizardProps> = ({
  initialPlan = 'pro',
  onCancel,
  onSuccess,
  onSwitchToLogin
}) => {
  const { register } = useAuth();

  // Wizard Step: 1 = Account, 2 = Plan, 3 = Payment Method, 4 = Confirmation
  const [step, setStep] = useState<number>(1);

  // Form State - Step 1: Account
  const [displayName, setDisplayName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Form State - Step 2: Plan
  const [selectedPlan, setSelectedPlan] = useState<string>(initialPlan);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');

  // Form State - Step 3: Payment Method
  const [paymentMethod, setPaymentMethod] = useState<'cmi' | 'bank_transfer' | 'wafacash' | 'free_trial'>('free_trial');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [bankRef, setBankRef] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedRib, setCopiedRib] = useState(false);

  const plans = [
    {
      id: 'free',
      name: 'Gratuit',
      badge: 'Découverte',
      monthlyPrice: 0,
      annualPrice: 0,
      desc: 'Idéal pour micro-entrepreneurs & test des fonctionnalités de base',
      features: [
        'Jusqu’à 20 Factures & Devis / mois',
        'Gestion de 50 Produits',
        'Carnet Kreddy basique',
        'Support communautaire'
      ]
    },
    {
      id: 'starter',
      name: 'Starter',
      badge: 'Indépendant',
      monthlyPrice: 190,
      annualPrice: 150,
      desc: 'Parfait pour commerces de détail & artisans indépendants',
      features: [
        'Facturation illimitée (Conforme DGI)',
        'Gestion de Stock & Alertes',
        'Carnet Kreddy Dettes & Relances',
        'Caisse POS & Impression Ticket',
        'Export Comptable Excel'
      ]
    },
    {
      id: 'pro',
      name: 'Pro Cloud',
      badge: 'Le Plus Populaire',
      popular: true,
      monthlyPrice: 390,
      annualPrice: 310,
      desc: 'Conçu pour PME, Grossistes & Magasins multi-caisses',
      features: [
        'Tout le plan Starter +',
        'Multi-utilisateurs & Rôles',
        'Droit de Timbre Espèces 0,25%',
        'Intégration WhatsApp Cloud 1-Clic',
        'Multi-dépôts (Magasin + Stock)',
        'Support Téléphonique Prioritaire 6j/7'
      ]
    },
    {
      id: 'business',
      name: 'Business Enterprise',
      badge: 'Sur-Mesure',
      monthlyPrice: 790,
      annualPrice: 630,
      desc: 'Pour réseaux de franchises & entreprises à fort volume',
      features: [
        'Tout le plan Pro +',
        'API sur-mesure & Webhooks',
        'Gestion RH & Fiches de Paie CNSS',
        'Comptable dédié pour déclarations',
        'Accompagnement & Formation sur site'
      ]
    }
  ];

  const currentPlanObj = plans.find(p => p.id === selectedPlan) || plans[2];
  const calculatedPrice = billingCycle === 'annually' ? currentPlanObj.annualPrice : currentPlanObj.monthlyPrice;

  // Step 1 Validation
  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!displayName.trim()) {
      setError('Veuillez saisir votre nom complet.');
      return;
    }
    if (!orgName.trim()) {
      setError('Veuillez saisir le nom de votre entreprise.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Veuillez saisir une adresse e-mail valide.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setStep(2);
  };

  // Final Registration Execution
  const handleFinalSubmit = async () => {
    setError(null);
    setLoading(true);

    let status: 'confirmed' | 'pending' | 'trial' = 'confirmed';
    if (paymentMethod === 'free_trial') status = 'trial';
    if (paymentMethod === 'bank_transfer' || paymentMethod === 'wafacash') status = 'pending';

    try {
      await register(email, password, displayName, orgName, {
        plan: selectedPlan,
        billingCycle,
        paymentMethod,
        paymentStatus: status
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Registration error:', err);
      let msg = "Une erreur est survenue lors de la création du compte.";
      if (err.code === 'auth/email-already-in-use') {
        msg = 'Cet e-mail est déjà associé à un compte. Veuillez vous connecter.';
      } else if (err.code === 'auth/operation-not-allowed' || (err.message && err.message.includes('operation-not-allowed'))) {
        msg = "L'inscription par e-mail/mot de passe n'est pas activée dans votre console Firebase. Pour l'activer, rendez-vous dans la console Firebase (Authentication > Sign-in method > Email/Password > Activer). En attendant, vous pouvez vous connecter instantanément en utilisant Google Auth sur l'écran d'accueil !";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      setStep(1); // Return to step 1 to fix email if needed
    } finally {
      setLoading(false);
    }
  };

  const copyRibToClipboard = () => {
    navigator.clipboard.writeText('007 780 0001234567890123 45');
    setCopiedRib(true);
    setTimeout(() => setCopiedRib(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans text-slate-100">
      
      {/* HEADER WIZARD BAR */}
      <div className="bg-slate-950 px-6 py-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Hexagon className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight font-mono">
              Inscription SahlBiz Pro Cloud
            </h2>
            <p className="text-xs text-slate-400">
              Conformité DGI, Facturation & Caisse POS au Maroc
            </p>
          </div>
        </div>

        {/* STEP PROGRESS INDICATOR */}
        <div className="flex items-center gap-2">
          {[
            { num: 1, label: 'Compte' },
            { num: 2, label: 'Plan' },
            { num: 3, label: 'Paiement' },
            { num: 4, label: 'Validation' }
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div
                onClick={() => {
                  if (s.num < step) setStep(s.num);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold font-mono transition-all ${
                  step === s.num
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/50'
                    : step > s.num
                    ? 'bg-emerald-500/20 text-emerald-400 cursor-pointer hover:bg-emerald-500/30'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-slate-950/40 flex items-center justify-center text-[10px]">
                  {s.num}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {idx < 3 && <div className="w-3 h-0.5 bg-slate-800" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="mx-6 mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* WIZARD CONTENT BODY */}
      <div className="p-6 md:p-8">

        {/* ================= STEP 1: ACCOUNT & BUSINESS DETAILS ================= */}
        {step === 1 && (
          <form onSubmit={handleStep1Next} className="space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Étape 1 sur 4</span>
              </span>
              <h3 className="text-xl font-bold text-white">Création de votre Identité Entreprise</h3>
              <p className="text-xs text-slate-400">
                Créez votre accès administrateur. Vos données d'entreprise serviront à générer vos factures et devis conformes DGI.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nom Complet Administrateur *</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="ex: Youssef Benjelloun"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nom de l'Entreprise / Raison Sociale *</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="ex: Atlas Trading SARL"
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">E-mail Professionnel *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="contact@atlastrading.ma"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mot de Passe *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirmer le Mot de Passe *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-800 max-w-2xl mx-auto">
              {onSwitchToLogin ? (
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Déjà un compte ? <span className="text-emerald-400 font-semibold underline">Se connecter</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all"
              >
                <span>Choisir mon Plan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 2: CHOOSE PLAN ================= */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Étape 2 sur 4</span>
              </span>
              <h3 className="text-xl font-bold text-white">Choisissez le Plan SahlBiz Adapté à votre Activité</h3>
              <p className="text-xs text-slate-400">
                Ajustez votre abonnement à tout moment sans frais cachés.
              </p>

              {/* MONTHLY / ANNUALLY TOGGLE */}
              <div className="inline-flex items-center bg-slate-950 p-1 rounded-full border border-slate-800 mt-3">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Mensuel
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annually')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 ${
                    billingCycle === 'annually'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Annuel</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase">
                    -20%
                  </span>
                </button>
              </div>
            </div>

            {/* PLAN CARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map(p => {
                const price = billingCycle === 'annually' ? p.annualPrice : p.monthlyPrice;
                const isSelected = selectedPlan === p.id;

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id)}
                    className={`relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/40 border-emerald-500 shadow-xl shadow-emerald-950/40 ring-2 ring-emerald-500/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {p.popular && (
                      <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                        {p.badge}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-white font-mono">{p.name}</h4>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                              : 'border-slate-700 bg-slate-900'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>

                      <div className="mb-3">
                        <span className="text-2xl font-black text-white font-mono">
                          {price === 0 ? '0' : price}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold ml-1">
                          {price === 0 ? 'DH' : 'DH / mois'}
                        </span>
                        {billingCycle === 'annually' && price > 0 && (
                          <span className="block text-[10px] text-emerald-400 font-mono">
                            Facturé {price * 12} DH / an
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                        {p.desc}
                      </p>

                      <div className="space-y-2 border-t border-slate-800/80 pt-3">
                        {p.features.map((f, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlan(p.id);
                      }}
                      className={`w-full mt-5 py-2 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {isSelected ? 'Plan Sélectionné' : 'Choisir ce plan'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour aux infos</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all"
              >
                <span>Étape Suivante : Paiement</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: PAYMENT METHOD ================= */}
        {step === 3 && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center space-y-2 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Étape 3 sur 4</span>
              </span>
              <h3 className="text-xl font-bold text-white">Mode de Réglement & Activation</h3>
              <p className="text-xs text-slate-400">
                Vous avez choisi le plan <span className="text-emerald-400 font-bold">{currentPlanObj.name}</span> à{' '}
                <span className="text-white font-bold font-mono">{calculatedPrice} DH/mois</span> ({billingCycle === 'annually' ? 'Facturation Annuelle' : 'Facturation Mensuelle'}).
              </p>
            </div>

            {/* PAYMENT METHOD SELECTOR TABS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  id: 'free_trial',
                  title: 'Essai Gratuit',
                  sub: '14 jours gratuits',
                  icon: Clock
                },
                {
                  id: 'cmi',
                  title: 'Carte CMI / CB',
                  sub: 'Paiement Sécurisé',
                  icon: CreditCard
                },
                {
                  id: 'bank_transfer',
                  title: 'Virement RIB',
                  sub: 'Attijari / BCP',
                  icon: Building
                },
                {
                  id: 'wafacash',
                  title: 'Cash / Agency',
                  sub: 'Wafacash / CashPlus',
                  icon: Receipt
                }
              ].map(m => {
                const Icon = m.icon;
                const isSel = paymentMethod === m.id;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      isSel
                        ? 'bg-slate-900 border-emerald-500 text-white shadow-lg ring-1 ring-emerald-500'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${isSel ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <div>
                      <div className="text-xs font-bold text-white leading-tight">{m.title}</div>
                      <div className="text-[10px] text-slate-500">{m.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* PAYMENT METHOD DETAILED PANEL */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              
              {/* Option 1: Free Trial */}
              {paymentMethod === 'free_trial' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-emerald-400 font-bold text-xs">
                    <ShieldCheck className="w-5 h-5" />
                    <span>Activez votre essai gratuit de 14 jours instantanément !</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Aucune carte bancaire requise. Accédez immédiatement à votre espace SahlBiz Pro Cloud avec l'ensemble des fonctionnalités incluses pendant 14 jours.
                  </p>
                </div>
              )}

              {/* Option 2: CMI Bank Card */}
              {paymentMethod === 'cmi' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                    <span>Paiement par Carte Bancaire Marocaine (CMI Gateway)</span>
                    <span className="text-[10px] text-emerald-400 font-mono">3D Secure Enabled</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] text-slate-400 mb-1">Nom du Titulaire de la Carte</label>
                      <input
                        type="text"
                        placeholder="ex: Youssef Benjelloun"
                        value={cardHolder}
                        onChange={e => setCardHolder(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] text-slate-400 mb-1">Numéro de Carte (16 chiffres)</label>
                      <input
                        type="text"
                        maxLength={19}
                        placeholder="4000 1234 5678 9010"
                        value={cardNumber}
                        onChange={e => setCardNumber(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Date d'Expiration</label>
                      <input
                        type="text"
                        placeholder="MM/AA"
                        value={cardExpiry}
                        onChange={e => setCardExpiry(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Code CVC / CWW</label>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="123"
                        value={cardCvc}
                        onChange={e => setCardCvc(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Option 3: Bank Transfer RIB */}
              {paymentMethod === 'bank_transfer' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                    <span>Coordonnées Bancaires Officiels SahlBiz Maroc</span>
                    <button
                      type="button"
                      onClick={copyRibToClipboard}
                      className="text-emerald-400 hover:underline text-[11px] flex items-center gap-1 font-mono"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedRib ? 'RIB Copié !' : 'Copier le RIB'}</span>
                    </button>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono space-y-1.5 text-slate-300">
                    <div><span className="text-slate-500">Banque :</span> Attijariwafa Bank Maroc</div>
                    <div><span className="text-slate-500">Bénéficiaire :</span> SahlBiz Cloud Technologies SARL</div>
                    <div><span className="text-slate-500">RIB (24 chiffres) :</span> <span className="text-emerald-400 font-bold">007 780 0001234567890123 45</span></div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Référence du Virement (Optionnel)</label>
                    <input
                      type="text"
                      placeholder="ex: VIR-78902-ATLAS"
                      value={bankRef}
                      onChange={e => setBankRef(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Option 4: Wafacash / Cash Agency */}
              {paymentMethod === 'wafacash' && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-200">
                    Paiement en Espèces via Agence (Wafacash / CashPlus / Al Barid Bank)
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Un code de réservation d'abonnement sera généré. Présentez ce code dans n'importe quelle agence partenaires Wafacash ou CashPlus au Maroc pour valider votre compte.
                  </p>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Code d'Agence Généré</span>
                    <div className="text-lg font-black text-amber-400 font-mono tracking-widest mt-0.5">
                      SB-MAROC-88902
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Changer de Plan</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all"
              >
                <span>Vérifier la Commande</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: PAYMENT CONFIRMATION & CREATION ================= */}
        {step === 4 && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center space-y-2 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Étape 4 sur 4 - Confirmation</span>
              </span>
              <h3 className="text-xl font-bold text-white">Récapitulatif de votre Commande</h3>
              <p className="text-xs text-slate-400">
                Vérifiez vos informations avant de valider la création de votre compte et l'activation du service.
              </p>
            </div>

            {/* ORDER RECAP CARD */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Organisme Client</span>
                  <div className="text-sm font-bold text-white">{orgName}</div>
                  <div className="text-xs text-slate-400">{displayName} ({email})</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Statut Offre</span>
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
                    <Award className="w-3 h-3" />
                    <span>Plan {currentPlanObj.name}</span>
                  </div>
                </div>
              </div>

              {/* FINANCIAL BREAKDOWN */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Abonnement SahlBiz {currentPlanObj.name} ({billingCycle === 'annually' ? 'Annuel' : 'Mensuel'})</span>
                  <span className="font-mono">{calculatedPrice} DH</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Configuration Cloud Multi-Tenant & Synchronisation</span>
                  <span className="font-mono text-emerald-400">Inclus (0 DH)</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>TVA Complémentaire (20%)</span>
                  <span className="font-mono">{(calculatedPrice * 0.2).toFixed(2)} DH</span>
                </div>

                <div className="border-t border-slate-800 pt-3 flex justify-between text-sm font-bold text-white">
                  <span>Total TTC :</span>
                  <span className="text-emerald-400 font-mono text-base">
                    {(calculatedPrice * 1.2).toFixed(2)} DH
                  </span>
                </div>
              </div>

              {/* PAYMENT STATUS BADGE */}
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Mode de paiement sélectionné :</span>
                <span className="font-bold text-white uppercase font-mono">
                  {paymentMethod === 'free_trial' && 'Essai Gratuit 14 Jours'}
                  {paymentMethod === 'cmi' && 'Carte CMI / 3D-Secure'}
                  {paymentMethod === 'bank_transfer' && 'Virement Bancaire (RIB)'}
                  {paymentMethod === 'wafacash' && 'Comptoir Wafacash / Cash'}
                </span>
              </div>
            </div>

            {/* ACTION CONFIRMATION BUTTON */}
            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={loading}
                className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Modifier le mode</span>
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={loading}
                className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs rounded-xl shadow-xl shadow-emerald-950/60 flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 font-mono uppercase tracking-wider"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4.5 h-4.5 stroke-[2.5]" />
                    <span>Valider & Accéder à mon Espace</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
