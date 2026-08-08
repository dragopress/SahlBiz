import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Crown, Check, X, CreditCard, Building2, ShieldCheck, Sparkles, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

interface PricingModalProps {
  onClose: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ onClose }) => {
  const { profile, updateProfile } = useStore();
  const { currentUser } = useAuth();

  const [selectedPlanId, setSelectedPlanId] = useState<string>(profile.plan || 'pro');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<any>(null);

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<'cmi_card' | 'virement_bank' | 'cashplus'>('cmi_card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [txRef, setTxRef] = useState<string>('');

  const plans = [
    {
      id: 'free',
      name: 'Gratuit',
      priceMonthly: 0,
      priceAnnually: 0,
      priceLabel: '0 MAD',
      desc: 'Pour démarrer la numérisation',
      features: ['Jusqu\'à 20 Factures/mois', 'Carnet Kreddy basique', 'Caisse POS simplifiée', '1 Utilisateur']
    },
    {
      id: 'starter',
      name: 'Sahl Starter',
      priceMonthly: 99,
      priceAnnually: 950,
      priceLabel: '99 MAD/mois',
      desc: 'Idéal pour petites épiceries',
      features: ['Jusqu\'à 100 Factures/mois', 'Relances WhatsApp Kreddy', 'Gestion de stock avec alertes', '2 Utilisateurs']
    },
    {
      id: 'pro',
      name: 'Sahl Pro',
      priceMonthly: 249,
      priceAnnually: 2390,
      priceLabel: '249 MAD/mois',
      isPopular: true,
      desc: 'Pour TPE & PME exigeantes',
      features: [
        'Factures & Devis Illimités',
        'Scanner OCR Reçus par IA',
        'Export Comptable PCGM (Sage/Divalto)',
        'Gestion des Salariés & Paie CNSS',
        'L\'Mawoun IA Vocal Darija'
      ]
    },
    {
      id: 'business',
      name: 'Sahl Business',
      priceMonthly: 499,
      priceAnnually: 4790,
      priceLabel: '499 MAD/mois',
      desc: 'Pour réseaux multi-dépts',
      features: ['Multi-Magasins & Dépôts', 'Intégration CMI Paiement', 'Support Dédié WhatsApp 7j/7', 'Utilisateurs Illimités']
    }
  ];

  const handleSelectPlan = (plan: any) => {
    setSelectedPlanForCheckout(plan);
    setShowConfirmation(true);
  };

  const handleConfirmSubscription = async () => {
    if (!selectedPlanForCheckout) return;

    setIsProcessing(true);
    const mockTx = `CMI-${Date.now().toString().slice(-6)}`;
    setTxRef(mockTx);

    try {
      // Record subscription status in Firestore
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const path = `users/${currentUser.uid}`;
        try {
          await setDoc(userDocRef, {
            plan: selectedPlanForCheckout.id,
            billingCycle,
            paymentMethod,
            paymentStatus: 'confirmed',
            subscribedAt: new Date().toISOString(),
            transactionRef: mockTx,
          }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
      }

      // Update local profile state
      updateProfile({
        ...profile,
        plan: selectedPlanForCheckout.id,
      });

      setTimeout(() => {
        setIsProcessing(false);
        setPaymentSuccess(true);
      }, 1200);

    } catch (e) {
      console.error('Subscription error:', e);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 shadow-2xl text-white space-y-6 my-auto max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold">Tarifs & Abonnements SahlBiz Maroc</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Abonnement sans engagement. Facturation sécurisée en Dirhams Marocains (MAD).</p>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 3: SUCCESS CONFIRMATION RECEIPT */}
        {paymentSuccess ? (
          <div className="text-center py-10 space-y-5">
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40 shadow-lg shadow-emerald-950/50">
              <ShieldCheck className="w-12 h-12" />
            </div>

            <div className="space-y-1">
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold rounded-full">
                ABONNEMENT CONFIRMÉ & SYNC FIRESTORE
              </span>
              <h3 className="text-2xl font-black text-white pt-2">Félicitations ! Votre Plan est Actif</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Votre entreprise est désormais enregistrée sous la formule <b className="text-emerald-400 uppercase font-mono">{selectedPlanForCheckout?.name}</b>.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 max-w-md mx-auto text-left text-xs font-mono space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Réf. Transaction CMI :</span>
                <span className="text-emerald-400 font-bold">{txRef}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Méthode de Paiement :</span>
                <span className="text-white capitalize">{paymentMethod.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Cycle de Facturation :</span>
                <span className="text-white">{billingCycle === 'annually' ? 'Annuel (-20%)' : 'Mensuel'}</span>
              </div>
              <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800 font-bold">
                <span className="text-slate-200">Statut de la Souscription :</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Enregistré dans Firestore
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-3 rounded-xl text-xs transition-all shadow-lg shadow-emerald-900/40 font-mono uppercase tracking-wider"
            >
              Accéder à mes fonctionnalités
            </button>
          </div>
        ) : showConfirmation && selectedPlanForCheckout ? (

          /* STEP 2: SIMULATED PAYMENT CONFIRMATION PROMPT */
          <div className="space-y-6">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-emerald-400 font-mono uppercase">Récapitulatif de la commande</span>
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="text-slate-400 hover:text-white text-xs underline font-mono"
                >
                  ← Changer de formule
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-base text-white">{selectedPlanForCheckout.name}</h4>
                  <p className="text-xs text-slate-400">{selectedPlanForCheckout.desc}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-400 font-mono">
                    {billingCycle === 'annually' ? selectedPlanForCheckout.priceAnnually : selectedPlanForCheckout.priceMonthly} MAD
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {billingCycle === 'annually' ? '/ an (2 mois offerts)' : '/ mois'}
                  </span>
                </div>
              </div>

              {/* Billing Cycle Selector */}
              <div className="pt-2">
                <label className="block text-xs text-slate-300 font-bold mb-2">Cycle de facturation :</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all text-left ${
                      billingCycle === 'monthly'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div>Facturation Mensuelle</div>
                    <div className="text-[10px] font-normal text-slate-400">Paiement mois par mois</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBillingCycle('annually')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all text-left relative ${
                      billingCycle === 'annually'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="absolute -top-2 right-2 bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full font-mono">
                      -20% RÉDUCTION
                    </span>
                    <div>Facturation Annuelle</div>
                    <div className="text-[10px] font-normal text-slate-400">Économisez 2 mois d'abonnement</div>
                  </button>
                </div>
              </div>

              {/* Moroccan Payment Method Options */}
              <div className="pt-2">
                <label className="block text-xs text-slate-300 font-bold mb-2">Moyen de paiement sécurisé au Maroc :</label>
                <div className="space-y-2">
                  <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'cmi_card' ? 'bg-slate-800/80 border-emerald-500 text-white' : 'bg-slate-900/50 border-slate-800 text-slate-400'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payMethod"
                        checked={paymentMethod === 'cmi_card'}
                        onChange={() => setPaymentMethod('cmi_card')}
                        className="accent-emerald-500"
                      />
                      <div>
                        <span className="font-bold text-xs text-white block">Carte Bancaire Marocaine (CMI)</span>
                        <span className="text-[10px] text-slate-400">Attijariwafa, BCP, BMCE, CIH, Crédit du Maroc, SG</span>
                      </div>
                    </div>
                    <CreditCard className="w-5 h-5 text-emerald-400" />
                  </label>

                  <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'virement_bank' ? 'bg-slate-800/80 border-emerald-500 text-white' : 'bg-slate-900/50 border-slate-800 text-slate-400'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payMethod"
                        checked={paymentMethod === 'virement_bank'}
                        onChange={() => setPaymentMethod('virement_bank')}
                        className="accent-emerald-500"
                      />
                      <div>
                        <span className="font-bold text-xs text-white block">Virement Bancaire Officiel</span>
                        <span className="text-[10px] text-slate-400">Emission du RIB entreprise instantané</span>
                      </div>
                    </div>
                    <Building2 className="w-5 h-5 text-indigo-400" />
                  </label>

                  <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'cashplus' ? 'bg-slate-800/80 border-emerald-500 text-white' : 'bg-slate-900/50 border-slate-800 text-slate-400'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payMethod"
                        checked={paymentMethod === 'cashplus'}
                        onChange={() => setPaymentMethod('cashplus')}
                        className="accent-emerald-500"
                      />
                      <div>
                        <span className="font-bold text-xs text-white block">Paiement en Agence (Cash Plus / Wafacash)</span>
                        <span className="text-[10px] text-slate-400">Règlement en espèces via code de paiement</span>
                      </div>
                    </div>
                    <Building2 className="w-5 h-5 text-amber-400" />
                  </label>
                </div>
              </div>

            </div>

            {/* Final Action Button */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Annuler
              </button>

              <button
                onClick={handleConfirmSubscription}
                disabled={isProcessing}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-3 rounded-xl text-xs transition-all shadow-lg shadow-emerald-950/50 flex items-center gap-2 font-mono uppercase tracking-wider"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Traitement Sécurisé CMI...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-white" />
                    <span>Confirmer et Activer l'Abonnement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (

          /* STEP 1: PLAN GRID SELECTION */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map(p => (
                <div
                  key={p.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                    p.isPopular
                      ? 'bg-slate-800/90 border-emerald-500 shadow-lg shadow-emerald-900/20 relative'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  {p.isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] uppercase font-extrabold px-3 py-0.5 rounded-full border border-emerald-400 shadow">
                      Plus Populaire
                    </span>
                  )}

                  <div>
                    <h3 className="font-bold text-sm text-white mb-1">{p.name}</h3>
                    <div className="text-xl font-extrabold text-emerald-400 mb-1">{p.priceLabel}</div>
                    <p className="text-[11px] text-slate-400 mb-4">{p.desc}</p>

                    <ul className="space-y-2 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                      {p.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleSelectPlan(p)}
                    className={`w-full mt-6 py-2 rounded-xl text-xs font-bold transition-all ${
                      profile.plan === p.id
                        ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                        : p.isPopular
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    {profile.plan === p.id ? 'Plan Actuel' : 'Choisir ce plan'}
                  </button>
                </div>
              ))}
            </div>

            {/* Local Moroccan Payment Method Badges */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>Moyens de paiement marocains acceptés:</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-slate-300">
                <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">Carte CMI</span>
                <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">Virement Attijariwafa / BCP</span>
                <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">Cash Plus / Wafacash</span>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

