import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { validateIce } from '../../lib/moroccanTax';
import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Settings, Building2, CheckCircle2, AlertCircle, Save, User, ShieldCheck, Mail, KeyRound, Loader2 } from 'lucide-react';

export const SettingsModule: React.FC = () => {
  const { profile, updateProfile } = useStore();
  const { currentUser, userProfile } = useAuth();

  const [form, setForm] = useState({ ...profile });
  const [iceError, setIceError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.ice.trim()) {
      const { valid, message } = validateIce(form.ice);
      if (!valid) {
        setIceError(message || 'ICE invalide');
        return;
      }
    }
    setIceError(null);
    setIsSaving(true);

    try {
      // 1. Update global StoreContext & Firestore businessProfiles/{orgId}
      updateProfile(form);

      // 2. Associate & Sync with Authenticated Firebase User Record users/{uid}
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const path = `users/${currentUser.uid}`;
        try {
          await setDoc(userDocRef, {
            orgName: form.name,
            businessProfile: form,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
      }

      setIsSaving(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save user profile:', err);
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      
      {/* Header Banner */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-400" />
            <span>Profil Utilisateur & Fiche Légale Entreprise</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gérez votre compte utilisateur Firebase Auth et synchronisez la fiche fiscale de votre entreprise au Maroc.
          </p>
        </div>
      </div>

      {/* USER PROFILE & FIREBASE AUTH ASSOCIATION CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-xs text-white space-y-4">
        <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2 border-b border-slate-800 pb-2">
          <User className="w-4 h-4 text-emerald-400" />
          <span>Compte Utilisateur Firebase Associé</span>
          <span className="ml-auto px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full font-mono text-[10px]">
            AUTHENTIFIÉ
          </span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mb-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Adresse Email Compte</span>
            </div>
            <div className="font-bold text-white truncate">{currentUser?.email || 'Non renseigné'}</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mb-1">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span>Identifiant Firebase UID</span>
            </div>
            <div className="font-bold text-slate-300 truncate">{currentUser?.uid || 'Local'}</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Organisation ID (Multi-Tenant)</span>
            </div>
            <div className="font-bold text-emerald-400 truncate">{userProfile?.orgId || 'org_default'}</div>
          </div>
        </div>
      </div>

      {/* BUSINESS PROFILE FORM */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 text-xs text-white">
        
        {/* General Info */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Building2 className="w-4 h-4" /> Information Générales & Commerciales
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Raison Sociale / Nom Commercial *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Téléphone Principal (WhatsApp) *</label>
              <input
                type="text"
                required
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Adresse Siège Social</label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Ville</label>
              <input
                type="text"
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>
        </div>

        {/* Moroccan Fiscal Mandatory Parameters */}
        <div className="space-y-3 pt-3">
          <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2 border-b border-slate-800 pb-2">
            <span>Identifiants Fiscaux Marocains (CGI)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">ICE (15 Chiffres) *</label>
              <input
                type="text"
                maxLength={15}
                required
                value={form.ice}
                onChange={e => setForm({ ...form, ice: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-emerald-400 font-bold"
              />
              {iceError && <p className="text-red-400 text-[10px] mt-1">{iceError}</p>}
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Identifiant Fiscal (I.F)</label>
              <input
                type="text"
                value={form.if}
                onChange={e => setForm({ ...form, if: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Registre de Commerce (R.C)</label>
              <input
                type="text"
                value={form.rc}
                onChange={e => setForm({ ...form, rc: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Taxe Professionnelle (Patente)</label>
              <input
                type="text"
                value={form.patente}
                onChange={e => setForm({ ...form, patente: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Numéro CNSS</label>
              <input
                type="text"
                value={form.cnss}
                onChange={e => setForm({ ...form, cnss: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
              />
            </div>
          </div>
        </div>

        {/* Banking Info */}
        <div className="space-y-3 pt-3">
          <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2 border-b border-slate-800 pb-2">
            <span>Coordonnées Bancaires (RIB Factures)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Nom de la Banque</label>
              <input
                type="text"
                value={form.bankName}
                onChange={e => setForm({ ...form, bankName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">RIB Bancaire (24 Chiffres)</label>
              <input
                type="text"
                maxLength={24}
                value={form.bankRib}
                onChange={e => setForm({ ...form, bankRib: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
              />
            </div>
          </div>
        </div>

        {/* Save Submit */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          {isSaved ? (
            <div className="text-emerald-400 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Modifications enregistrées et associées à votre compte Firebase !</span>
            </div>
          ) : <div />}

          <button
            type="submit"
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-900/30 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enregistrement Firestore...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Enregistrer la Fiche Légale & Compte</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

