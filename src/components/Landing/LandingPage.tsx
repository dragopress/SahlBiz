import React, { useState, useEffect } from 'react';
import {
  Hexagon,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers,
  BarChart3,
  Globe2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Receipt,
  Building2,
  PhoneCall,
  MessageSquare,
  Users,
  Smartphone,
  Lock,
  Star,
  HelpCircle,
  Maximize2,
  X,
  CreditCard,
  Check,
  FileText
} from 'lucide-react';
import { RegistrationWizard } from '../Auth/RegistrationWizard';
import { AuthScreen } from '../Auth/AuthScreen';

import { useAuth } from '../../context/AuthContext';

// Imported Slide Images
import slideStrengthImg from '../../assets/images/slide_strength_1786201714900.jpg';
import slideConfigImg from '../../assets/images/slide_config_1786201733260.jpg';
import slideUsageImg from '../../assets/images/slide_usage_1786201747936.jpg';
import slideAiImg from '../../assets/images/slide_ai_assistant_1786202537121.jpg';

interface LandingPageProps {
  onLoginSuccess?: () => void;
  onEnterDashboard?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess, onEnterDashboard }) => {
  const { currentUser } = useAuth();

  // Modal states
  const [showRegModal, setShowRegModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedInitialPlan, setSelectedInitialPlan] = useState<string>('pro');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Carousel slide index
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  const slides = [
    {
      id: 'dashboard',
      title: '1. Tableau de Bord & Analytics PME',
      badge: 'Pilotage Financier Temps Réel',
      image: slideStrengthImg,
      subtitle: 'Visualisez la santé financière, le Chiffre d\'Affaires et les créances Kreddy en un clin d\'œil',
      highlights: [
        {
          title: 'Aperçu Global du Chiffre d\'Affaires',
          desc: 'Suivez vos ventes quotidiennes, hebdomadaires et mensuelles avec répartition par mode de règlement.'
        },
        {
          title: 'Indicateurs DGI & Solde Kreddy',
          desc: 'Gardez un œil sur les créances clients non recouvrées et le montant cumulé du droit de timbre.'
        },
        {
          title: 'Alertes de Stock & Trésorerie',
          desc: 'Soyez notifié dès qu\'un produit atteint le seuil critique pour éviter toute rupture au comptoir.'
        },
        {
          title: 'Isolation Cloud Multi-Tenant',
          desc: 'Vos données financières sont hébergées sur Firestore Enterprise avec chiffrement de bout en bout.'
        }
      ]
    },
    {
      id: 'invoices',
      title: '2. Facturation DGI Conforme & Export PDF',
      badge: 'Conformité Fiscalité Maroc 2026',
      image: slideConfigImg,
      subtitle: 'Créez des Factures, Devis et Bons de Livraison en 30 secondes avec calcul automatique des taxes',
      highlights: [
        {
          title: 'Mentions Légales Intégrées (ICE, IF, RC)',
          desc: 'Génération automatique de l\'ICE (15 chiffres), Registre de Commerce, Patente et Identifiant Fiscal.'
        },
        {
          title: 'Calcul Droit de Timbre Espèces (0,25%)',
          desc: 'Application conforme du droit de timbre fiscal pour tout règlement en espèces selon le CGI marocain.'
        },
        {
          title: 'Génération PDF & Envoi WhatsApp',
          desc: 'Transformez vos devis en factures en un clic et transmettez le document PDF directement via WhatsApp.'
        },
        {
          title: 'Taux TVA Polyvalents (20%, 14%, 10%, 7%, 0%)',
          desc: 'Gérez plusieurs lignes de produits avec des taux de TVA différenciés et exonérations légales.'
        }
      ]
    },
    {
      id: 'ai_assistant',
      title: '3. Assistant IA L\'Mawoun (Vocal & Darija)',
      badge: 'Intelligence Artificielle Marocaine',
      image: slideAiImg,
      subtitle: 'Bénéficiez d\'un conseiller comptable intelligent capable d\'analyser vos factures et répondre en Darija',
      highlights: [
        {
          title: 'Analyse OCR Automatique des Reçus',
          desc: 'Scannez une facture d\'achat ou un ticket de caisse : l\'IA extrait le fournisseur, la date et le montant HT/TTC.'
        },
        {
          title: 'Conseils Fiscaux & Réponses en Darija',
          desc: 'Posez vos questions sur la TVA, la CNSS ou l\'IS en Français ou en Darija ("Kifach nhaseb la TVA ?").'
        },
        {
          title: 'Prévisions de Ventes & Recommandations',
          desc: 'L\'IA anticipe les tendances de consommation et suggère les réapprovisionnements optimaux.'
        },
        {
          title: 'Synthèse Vocale & Commandes Rapides',
          desc: 'Interagissez vocalement avec l\'assistant pour dicter des ventes ou interroger le solde d\'un client.'
        }
      ]
    },
    {
      id: 'pos',
      title: '4. Caisse POS Tactile & Mode Offline',
      badge: 'Vitesse & Robustesse au Comptoir',
      image: slideUsageImg,
      subtitle: 'Encaissez vos clients instantanément, imprimez vos tickets et enregistrez les crédits Kreddy',
      highlights: [
        {
          title: 'Interface Caisse POS Multi-Supports',
          desc: 'Compatible avec écrans tactiles, PC, tablettes et douchettes code-barres USB/Bluetooth.'
        },
        {
          title: 'Impression Thermique 80mm & 58mm',
          desc: 'Impression directe de tickets de caisse personnalisés avec votre logo et coordonnées légales.'
        },
        {
          title: 'Fonctionnement Offline sans Internet',
          desc: 'Continuez d\'encaisser en cas de panne réseau : synchronisation automatique dès le retour d\'Internet.'
        },
        {
          title: 'Gestion de Caisse & Clôture Z',
          desc: 'Bilan de fin de journée, écarts de caisse et réconciliation des espèces, chèques et cartes CMI.'
        }
      ]
    }
  ];

  // Auto advance slide
  useEffect(() => {
    if (!isAutoPlay) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isAutoPlay, slides.length]);

  // Redirect on successful login
  useEffect(() => {
    if (currentUser) {
      if (showLoginModal || showRegModal) {
        setShowLoginModal(false);
        setShowRegModal(false);
      }
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    }
  }, [currentUser, onLoginSuccess, showLoginModal, showRegModal]);

  const handleOpenRegistration = (planId: string = 'pro') => {
    setSelectedInitialPlan(planId);
    setShowRegModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950 overflow-x-hidden">
      
      {/* BACKGROUND GEOMETRIC PATTERN */}
      <div className="fixed inset-0 pointer-events-none opacity-25 z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-10 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px]" />
        
        <svg className="w-full h-full text-slate-800/40" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <pattern id="landingGeoGrid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <polygon points="40,0 80,40 40,80 0,40" fill="none" stroke="currentColor" strokeWidth="0.3" strokeDasharray="3,3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#landingGeoGrid)" />
        </svg>
      </div>

      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-11 h-11 bg-gradient-to-tr from-emerald-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 transform rotate-3">
              <Hexagon className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-wider text-white font-mono">SahlBiz</span>
              <span className="text-[10px] uppercase tracking-widest text-emerald-400 block font-semibold">Pro Cloud Morocco</span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#slides" className="hover:text-emerald-400 transition-colors">Forces & Utilisation</a>
            <a href="#features" className="hover:text-emerald-400 transition-colors">Fonctionnalités DGI</a>
            <a href="#pricing" className="hover:text-emerald-400 transition-colors">Abonnement & Tarifs</a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">FAQ</a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <button
                onClick={() => onEnterDashboard && onEnterDashboard()}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all transform active:scale-95 font-mono"
              >
                <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                <span>Accéder au Dashboard →</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 transition-colors flex items-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Se connecter</span>
                </button>

                <button
                  onClick={() => handleOpenRegistration('pro')}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all transform active:scale-95"
                >
                  <span>Essai Gratuit 14 Jours</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </>
            )}
          </div>

        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
            <Sparkles className="w-4 h-4" />
            <span>Logiciel de Gestion Commerciale N°1 pour PME au Maroc</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight max-w-5xl mx-auto">
            La Plateforme Cloud Complète pour votre <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">Commerce & Facturation DGI</span>
          </h1>

          {/* Subheading */}
          <p className="text-sm sm:text-base text-slate-400 max-w-3xl mx-auto leading-relaxed">
            SahlBiz Pro simplifie la gestion de votre entreprise marocaine : émission de factures conformes DGI avec calcul automatique du Droit de Timbre (0.25%), caisse POS tactile, carnet Kreddy des dettes clients et relances automatiques par WhatsApp.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {currentUser ? (
              <button
                onClick={() => onEnterDashboard && onEnterDashboard()}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5 active:translate-y-0 uppercase tracking-wider font-mono"
              >
                <span>Accéder à mon Espace Dashboard</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </button>
            ) : (
              <button
                onClick={() => handleOpenRegistration('pro')}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5 active:translate-y-0 uppercase tracking-wider font-mono"
              >
                <span>Créer mon Compte Gratuitement</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </button>
            )}

            <a
              href="#slides"
              className="w-full sm:w-auto px-8 py-4 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-2xl text-sm font-bold text-slate-200 flex items-center justify-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
              <span>Voir la Galerie & Captures</span>
            </a>
          </div>

          {/* Value Highlights Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-10 text-left">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">100% Conforme DGI</div>
                <div className="text-[10px] text-slate-400">ICE, IF, RC, Timbre 0.25%</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3">
              <Receipt className="w-8 h-8 text-indigo-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">Carnet Kreddy</div>
                <div className="text-[10px] text-slate-400">Suivi des crédits & dettes</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3">
              <Zap className="w-8 h-8 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">Caisse POS Offline</div>
                <div className="text-[10px] text-slate-400">Ticket thermique & scan</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-cyan-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">Envoi WhatsApp</div>
                <div className="text-[10px] text-slate-400">PDF factures en 1 clic</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ================= SLIDE SHOWCASE SECTION ================= */}
      <section id="slides" className="py-16 bg-slate-900/50 border-y border-slate-800/80 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="text-center space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" />
              <span>Présentation Démo Interactive</span>
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Découvrez la Puissance de SahlBiz en Images
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
              Naviguez à travers les 3 étapes clés : nos forces uniques, la vitesse de configuration et la simplicité au quotidien.
            </p>
          </div>

          {/* SLIDE TAB NAVIGATION SWITCHER */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => {
                  setCurrentSlide(idx);
                  setIsAutoPlay(false);
                }}
                className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 font-mono ${
                  currentSlide === idx
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-950/50 scale-105'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-slate-950/30 flex items-center justify-center text-[10px]">
                  {idx + 1}
                </span>
                <span>{s.title.split('.')[1] || s.title}</span>
              </button>
            ))}

            <button
              onClick={() => setIsAutoPlay(!isAutoPlay)}
              className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-400 hover:text-white transition-colors"
              title={isAutoPlay ? 'Mettre en pause' : 'Lecture automatique'}
            >
              {isAutoPlay ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>

          {/* SLIDE CARD CONTAINER */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center overflow-hidden">
            
            {/* Left Column: Slide Image with Zoom Preview */}
            <div className="lg:col-span-7 relative group rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
              <img
                src={slides[currentSlide].image}
                alt={slides[currentSlide].title}
                className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />

              <button
                onClick={() => setZoomedImage(slides[currentSlide].image)}
                className="absolute top-4 right-4 p-2.5 bg-slate-950/80 hover:bg-slate-900 text-white rounded-xl backdrop-blur-md border border-slate-700 transition-all opacity-0 group-hover:opacity-100"
                title="Agrandir la capture"
              >
                <Maximize2 className="w-4 h-4 text-emerald-400" />
              </button>

              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-slate-950/80 border border-slate-700 text-emerald-400 text-xs font-mono font-bold backdrop-blur-md">
                  {slides[currentSlide].badge}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentSlide((currentSlide - 1 + slides.length) % slides.length)}
                    className="p-2 bg-slate-950/80 hover:bg-slate-900 text-white rounded-xl border border-slate-700 backdrop-blur-md transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentSlide((currentSlide + 1) % slides.length)}
                    className="p-2 bg-slate-950/80 hover:bg-slate-900 text-white rounded-xl border border-slate-700 backdrop-blur-md transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Slide Text Details */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold font-mono block mb-1">
                  MODULE {currentSlide + 1} / 3
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  {slides[currentSlide].title}
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {slides[currentSlide].subtitle}
                </p>
              </div>

              {/* Highlights List */}
              <div className="space-y-3">
                {slides[currentSlide].highlights.map((h, i) => (
                  <div key={i} className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 font-mono">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>{h.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed pl-6">
                      {h.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* Slide CTA */}
              <button
                onClick={() => handleOpenRegistration('pro')}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all font-mono uppercase tracking-wider"
              >
                <span>Tester cette fonctionnalité maintenant</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ================= FEATURES GRID ================= */}
      <section id="features" className="py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Conçu pour le marché Marocain</span>
            </span>
            <h2 className="text-3xl font-extrabold text-white">
              Une Suite Complète de Gestion Commerciale
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Tout ce dont votre commerce ou PME a besoin dans une seule interface moderne et intuitive.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Card 1 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 transition-all space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Facturation & Conformité DGI</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Factures, Devis, Devis Proforma, Bons de Livraison (BL) et Avoirs conformes aux normes marocaines (ICE, IF, RC, Droit de Timbre Espèces 0.25%).
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 transition-all space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-slate-950 transition-all">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Caisse POS & Imprimante Thermique</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Point de vente tactile ultra-rapide avec gestion des lecteurs code-barres et impression directe des tickets de caisse sur format 80mm et 58mm.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 transition-all space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Carnet Kreddy Dettes & Crédits</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Consignez les dettes de vos clients réguliers, suivez le solde en direct et envoyez des états de compte détaillés par WhatsApp en un seul clic.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 transition-all space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Intégration WhatsApp Business</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Envoyez automatiquement vos factures PDF, reçus de paiement et rappels d'échéances directement sur le WhatsApp de vos clients.
              </p>
            </div>

            {/* Card 5 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/50 transition-all space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-slate-950 transition-all">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Gestion de Stock Multi-Dépôts</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Suivez les mouvements de stock, gérez les alertes de rupture, les transferts entre dépôts et calculez vos marges bénéficiaires réelles.
              </p>
            </div>

            {/* Card 6 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 transition-all space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Module Paie CNSS & RH</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gérez le répertoire des employés, calculez les fiches de paie conformes aux cotisations CNSS & IR et suivez les avances sur salaire.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ================= PRICING SECTION ================= */}
      <section id="pricing" className="py-20 bg-slate-900/40 border-t border-slate-800 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono uppercase tracking-wider">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Tarification Transparente</span>
            </span>
            <h2 className="text-3xl font-extrabold text-white">
              Abonnements Adaptés à Chaque Stade de Croissance
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Profitez d'un essai gratuit de 14 jours sans carte bancaire requise.
            </p>
          </div>

          {/* PRICING GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Free Plan */}
            <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-6">
              <div>
                <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold uppercase font-mono">
                  Découverte
                </span>
                <h3 className="text-xl font-bold text-white mt-3 font-mono">Gratuit</h3>
                <div className="my-3">
                  <span className="text-3xl font-black text-white font-mono">0</span>
                  <span className="text-xs text-slate-400 ml-1">DH / mois</span>
                </div>
                <p className="text-xs text-slate-400">
                  Pour tester la solution et émettre jusqu'à 20 factures par mois.
                </p>
                <div className="space-y-2 mt-6 pt-6 border-t border-slate-800 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>20 Factures / mois</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>50 Articles au catalogue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Carnet Kreddy basique</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleOpenRegistration('free')}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl transition-colors"
              >
                Commencer Gratuitement
              </button>
            </div>

            {/* Starter Plan */}
            <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-6">
              <div>
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase font-mono">
                  Indépendant
                </span>
                <h3 className="text-xl font-bold text-white mt-3 font-mono">Starter</h3>
                <div className="my-3">
                  <span className="text-3xl font-black text-white font-mono">190</span>
                  <span className="text-xs text-slate-400 ml-1">DH / mois</span>
                </div>
                <p className="text-xs text-slate-400">
                  Idéal pour petits commerces de détail & artisans indépendants.
                </p>
                <div className="space-y-2 mt-6 pt-6 border-t border-slate-800 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Facturation DGI Illimitée</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Caisse POS Ticket Thermique</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Carnet Kreddy Dettes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Export Excel Comptable</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleOpenRegistration('starter')}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl transition-colors"
              >
                Choisir ce Plan
              </button>
            </div>

            {/* Pro Plan (Popular) */}
            <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-emerald-950/40 border-2 border-emerald-500 flex flex-col justify-between space-y-6 relative shadow-xl shadow-emerald-950/40">
              <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                Le Plus Populaire
              </span>
              <div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase font-mono">
                  Multi-Postes
                </span>
                <h3 className="text-xl font-bold text-white mt-3 font-mono">Pro Cloud</h3>
                <div className="my-3">
                  <span className="text-3xl font-black text-white font-mono">390</span>
                  <span className="text-xs text-slate-400 ml-1">DH / mois</span>
                </div>
                <p className="text-xs text-slate-400">
                  Pour PME, Grossistes & Magasins multi-caisses.
                </p>
                <div className="space-y-2 mt-6 pt-6 border-t border-slate-800 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Tout le plan Starter +</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Multi-utilisateurs & Rôles</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Calcul Droit de Timbre Espèces</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Intégration WhatsApp Cloud API</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleOpenRegistration('pro')}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-950/50 transition-all font-mono uppercase tracking-wider"
              >
                Démarrer l'essai gratuit
              </button>
            </div>

            {/* Business Enterprise Plan */}
            <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-6">
              <div>
                <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase font-mono">
                  Entreprise
                </span>
                <h3 className="text-xl font-bold text-white mt-3 font-mono">Business</h3>
                <div className="my-3">
                  <span className="text-3xl font-black text-white font-mono">790</span>
                  <span className="text-xs text-slate-400 ml-1">DH / mois</span>
                </div>
                <p className="text-xs text-slate-400">
                  Pour réseaux de franchises & entreprises à fort volume.
                </p>
                <div className="space-y-2 mt-6 pt-6 border-t border-slate-800 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Tout le plan Pro +</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Gestion RH & Fiches Paie CNSS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Multi-dépôts & Transferts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Accompagnement Dédié</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleOpenRegistration('business')}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl transition-colors"
              >
                Choisir ce Plan
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ================= FAQ SECTION ================= */}
      <section id="faq" className="py-20 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="text-center space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono uppercase tracking-wider">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Questions Fréquentes</span>
            </span>
            <h2 className="text-3xl font-extrabold text-white">
              Tout ce que vous devez savoir sur SahlBiz
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Est-ce que SahlBiz est conforme aux exigences de la DGI au Maroc ?",
                a: "Oui, à 100%. SahlBiz intègre les mentions obligatoires DGI : Numéro d'Identifiant Commun de l'Entreprise (ICE), Identifiant Fiscal (IF), Registre de Commerce (RC), Patente ainsi que le calcul légal du Droit de Timbre pour les règlements en espèces (0.25%)."
              },
              {
                q: "Comment fonctionne le mode Offline-First pour la Caisse POS ?",
                a: "En cas de coupure d'Internet, votre caisse continue de fonctionner normalement : scan des codes-barres, encaissement et impression des tickets. Dès le rétablissement de la connexion, toutes vos ventes sont automatiquement synchronisées dans le Cloud."
              },
              {
                q: "Comment fonctionnent le Carnet Kreddy et l'envoi WhatsApp ?",
                a: "Chaque vente à crédit est inscrite dans la fiche client Kreddy. Vous pouvez générer un relevé de compte au format PDF et l'envoyer directement sur le numéro WhatsApp de votre client en un seul clic."
              },
              {
                q: "Puis-je tester la plateforme gratuitement ?",
                a: "Absolument. Vous bénéficiez de 14 jours d'essai gratuit avec l'ensemble des fonctionnalités du plan Pro Cloud, sans engagement et sans carte bancaire requise."
              }
            ].map((faq, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{faq.q}</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed pl-6">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-900 py-12 relative z-10 text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-emerald-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Hexagon className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            </div>
            <span>© 2026 SahlBiz Pro Cloud Morocco. Tous droits réservés.</span>
          </div>

          <div className="flex items-center gap-6">
            <span>Casablanca Technopark</span>
            <span>Rabat Agdal</span>
            <span className="text-emerald-400 font-bold">Support 6j/7 : +212 522-909000</span>
          </div>
        </div>
      </footer>

      {/* ================= MODAL: REGISTRATION WIZARD ================= */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl my-8">
            <button
              onClick={() => setShowRegModal(false)}
              className="absolute -top-4 -right-4 p-2 bg-slate-900 text-slate-400 hover:text-white rounded-full border border-slate-700 z-10 shadow-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <RegistrationWizard
              initialPlan={selectedInitialPlan}
              onCancel={() => setShowRegModal(false)}
              onSuccess={() => {
                setShowRegModal(false);
                if (onLoginSuccess) onLoginSuccess();
              }}
              onSwitchToLogin={() => {
                setShowRegModal(false);
                setShowLoginModal(true);
              }}
            />
          </div>
        </div>
      )}

      {/* ================= MODAL: LOGIN SCREEN ================= */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-5xl my-8">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute -top-4 -right-4 p-2 bg-slate-900 text-slate-400 hover:text-white rounded-full border border-slate-700 z-10 shadow-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <AuthScreen />
          </div>
        </div>
      )}

      {/* ================= IMAGE ZOOM PREVIEW MODAL ================= */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute -top-4 -right-4 p-2 bg-slate-900 text-white rounded-full border border-slate-700 z-10 shadow-xl"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomedImage}
              alt="Zoom Preview"
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl border border-slate-800 shadow-2xl"
            />
          </div>
        </div>
      )}

    </div>
  );
};
