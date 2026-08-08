import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Lock,
  Mail,
  Building2,
  User as UserIcon,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Hexagon,
  Layers,
  BarChart3,
  Globe2
} from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { login, register, loginWithGoogle, resetPassword } = useAuth();
  const [isRegister, setIsRegister] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [orgName, setOrgName] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegister) {
      if (!displayName.trim()) {
        setError('Veuillez saisir votre nom complet.');
        return;
      }
      if (!orgName.trim()) {
        setError("Veuillez saisir le nom de votre entreprise ou organisation.");
        return;
      }
      if (password !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas.');
        return;
      }
      if (password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, displayName, orgName);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = "Une erreur est survenue lors de l'authentification.";
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/invalid-login-credentials' ||
        (err.message && err.message.toLowerCase().includes('credential')) ||
        (err.message && err.message.toLowerCase().includes('wrong-password')) ||
        (err.message && err.message.toLowerCase().includes('user-not-found'))
      ) {
        msg = "Adresse e-mail ou mot de passe incorrect. Veuillez vérifier vos identifiants.";
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Cet e-mail est déjà utilisé par un autre compte.';
      } else if (err.code === 'auth/invalid-email') {
        msg = "Adresse e-mail invalide.";
      } else if (err.code === 'auth/operation-not-allowed' || (err.message && err.message.includes('operation-not-allowed'))) {
        msg = "La connexion par e-mail/mot de passe n'est pas activée dans votre console Firebase. Pour l'activer, rendez-vous dans la console Firebase (onglet Authentication > Sign-in method > Email/Password > Activer). En attendant, vous pouvez utiliser la connexion instantanée 'Google Auth' ci-dessous !";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSuccess(null);

    if (!email.trim()) {
      setError("Veuillez saisir votre adresse e-mail professionnelle.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setResetSuccess("Un e-mail de récupération de mot de passe a été envoyé avec succès. Veuillez vérifier votre boîte de réception ainsi que vos courriers indésirables (spams).");
    } catch (err: any) {
      console.error('Password reset error:', err);
      let msg = "Une erreur est survenue lors de l'envoi de l'e-mail de récupération.";
      if (
        err.code === 'auth/user-not-found' ||
        (err.message && err.message.toLowerCase().includes('user-not-found'))
      ) {
        msg = "Aucun compte ne correspond à cette adresse e-mail. Veuillez vérifier la saisie.";
      } else if (err.code === 'auth/invalid-email') {
        msg = "Adresse e-mail invalide.";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google Auth error:', err);
      setError("Échec de la connexion avec Google. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 md:p-10 overflow-hidden font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* GEOMETRIC BACKGROUND ACCENTS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        {/* Isometric Grid Pattern */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />

        {/* Geometric Polygons & Grid Lines */}
        <svg className="absolute inset-0 w-full h-full text-slate-800/40" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <pattern id="geometricGrid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <polygon points="30,0 60,30 30,60 0,30" fill="none" stroke="currentColor" strokeWidth="0.3" strokeDasharray="2,2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#geometricGrid)" />
        </svg>

        {/* Floating Geometric Hexagon Accents */}
        <div className="absolute top-12 left-10 text-emerald-500/30 animate-bounce duration-1000">
          <Hexagon className="w-16 h-16 stroke-[1]" />
        </div>
        <div className="absolute bottom-20 right-16 text-indigo-500/30">
          <Layers className="w-24 h-24 stroke-[1]" />
        </div>
      </div>

      {/* MAIN AUTH CONTAINER */}
      <div className="relative w-full max-w-5xl bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl grid grid-cols-1 lg:grid-cols-12 overflow-hidden z-10">
        
        {/* LEFT COLUMN: Geometric SahlBiz Identity & Value Banner */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/80 p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800 relative overflow-hidden">
          {/* Subtle Geometric Overlay */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            {/* Logo Header */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-tr from-emerald-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 transform rotate-3">
                <Hexagon className="w-6 h-6 text-slate-950 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-2xl font-black tracking-wider text-white font-mono">SahlBiz</span>
                <span className="text-[10px] uppercase tracking-widest text-emerald-400 block font-semibold">Pro Cloud Morocco</span>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Multi-Tenant Auth Cloud</span>
              </span>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-white leading-tight">
                Plateforme de Gestion Globale pour PME Marocaines
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connectez-vous pour accéder à votre espace sécurisé SahlBiz : facturation conforme DGI, gestion des stocks, carnet Kreddy et synchronisation Cloud en temps réel.
              </p>
            </div>
          </div>

          {/* Feature Highlights Grid */}
          <div className="my-8 space-y-3">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Multi-Tenant & Conformité DGI (TVA 2026, ICE)</span>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
              <BarChart3 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Calcul Droit de Timbre Espèces 0,25%</span>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
              <Globe2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Base Firestore Cloud sécurisée par organisation</span>
            </div>
          </div>

          {/* Footer badge */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>© 2026 SahlBiz Cloud</span>
            <span className="text-emerald-400 font-bold">Pro Edition v3.2</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Login & Register Form */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
          
          {/* Header depending on state */}
          {isForgotPassword ? (
            <div className="space-y-2 mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-400" />
                <span>Mot de passe oublié</span>
              </h3>
              <p className="text-xs text-slate-400">
                Saisissez votre adresse e-mail professionnelle. Nous vous enverrons un lien de réinitialisation sécurisé pour restaurer l'accès à votre espace.
              </p>
            </div>
          ) : (
            /* Tab Navigation Switcher */
            <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(null); setResetSuccess(null); }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  !isRegister
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-slate-950 shadow-md shadow-emerald-950/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Se connecter</span>
              </button>
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(null); setResetSuccess(null); }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  isRegister
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-slate-950 shadow-md shadow-emerald-950/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Créer un compte</span>
              </button>
            </div>
          )}

          {/* Success Banner */}
          {resetSuccess && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{resetSuccess}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          {isForgotPassword ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Adresse E-mail Professionnelle</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="nom@entreprise.ma"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] disabled:opacity-50 font-mono uppercase tracking-wider"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Envoyer le lien de récupération</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError(null);
                    setResetSuccess(null);
                  }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-mono underline"
                >
                  Retourner à la connexion
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Nom Complet</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="ex: Karim El Amrani"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Nom de l'Entreprise / Organisation</label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="ex: Atlas Distribution SARL"
                        value={orgName}
                        onChange={e => setOrgName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Adresse E-mail Professionnelle</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="nom@entreprise.ma"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mot de Passe</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {isRegister && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Confirmer le Mot de Passe</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {!isRegister && (
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError(null);
                      setResetSuccess(null);
                    }}
                    className="text-xs text-slate-400 hover:text-emerald-400 transition-colors font-mono"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isRegister ? 'Créer mon compte SahlBiz' : 'Accéder à mon espace'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-semibold">
              <span className="bg-slate-900 px-3 text-slate-500 font-mono">ou continuer avec</span>
            </div>
          </div>

          {/* Google Sign-in Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.1 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.1-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
              />
            </svg>
            <span>Google Auth</span>
          </button>
        </div>

      </div>
    </div>
  );
};
