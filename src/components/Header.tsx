import React from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { getTranslation } from '../lib/i18n';
import { Language } from '../types';
import {
  Sparkles,
  Globe,
  Wallet,
  Crown,
  Building2,
  CheckCircle2,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  ShieldCheck,
  User as UserIcon
} from 'lucide-react';

import sahlbizLogo from '../assets/images/sahlbiz_logo_1786198689277.jpg';

interface HeaderProps {
  onOpenAiAssistant: () => void;
  onOpenPricing: () => void;
}

// Geometric Balance SVG Icon Component
const GeometricGridIcon = ({ className = "w-4 h-4 text-indigo-500" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 12L12 22L22 12L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter" />
    <path d="M12 6L6 12L12 18L18 12L12 6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

export const Header: React.FC<HeaderProps> = ({ onOpenAiAssistant, onOpenPricing }) => {
  const { userProfile, logout } = useAuth();
  const {
    language,
    setLanguage,
    profile,
    cashSession,
    setActiveModule,
    isOnline,
    pendingSyncCount,
    triggerManualSync
  } = useStore();

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'fr', label: 'Français', flag: '🇲🇦' },
    { code: 'dar', label: 'Darija', flag: '🇲🇦' },
    { code: 'ar', label: 'العربية', flag: '🇲🇦' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 text-slate-900 shadow-xs relative overflow-hidden">
      {/* Subtle Geometric Background Vector Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-5 flex justify-between items-center px-8">
        <svg width="200" height="40" viewBox="0 0 200 40" fill="none">
          <path d="M0 20 L20 0 L40 20 L60 0 L80 20 L100 0 L120 20 L140 0 L160 20 L180 0 L200 20" stroke="#4f46e5" strokeWidth="1" />
        </svg>
        <svg width="200" height="40" viewBox="0 0 200 40" fill="none">
          <path d="M0 20 L20 40 L40 20 L60 40 L80 20 L100 40 L120 20 L140 40 L160 20 L180 40 L200 20" stroke="#10b981" strokeWidth="1" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 relative z-10">
        
        {/* Left: App Brand & Business Profile Info */}
        <div className="flex items-center gap-3">
          <div 
            onClick={() => setActiveModule('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-none geo-angle-top-right overflow-hidden border-2 border-slate-900 shadow-xs flex items-center justify-center bg-slate-900 group-hover:border-emerald-500 transition-colors">
              <img
                src={sahlbizLogo}
                alt="SahlBiz Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors font-mono">
                  SahlBiz
                </span>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-none bg-indigo-900 text-indigo-100 border border-indigo-700">
                  {profile.plan.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block truncate max-w-[180px]">
                {profile.name}
              </p>
            </div>
          </div>

          {/* ICE Pill badge with Geometric Alignment */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 px-3 py-1 rounded-none border-l-2 border-l-indigo-600 border-r border-t border-b border-slate-200">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-mono text-[11px] text-slate-800 font-bold">
              ICE: {profile.ice || 'Non renseigné'}
            </span>
          </div>
        </div>

        {/* Center: L'Mawoun Assistant Search / Quick Action Pill */}
        <div 
          onClick={onOpenAiAssistant}
          className="hidden md:flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 cursor-pointer px-4 h-10 rounded-none border border-slate-300 text-xs text-slate-700 flex-1 max-w-md transition-colors shadow-xs relative group"
        >
          <GeometricGridIcon className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="truncate font-medium text-slate-600">
            "Ch'hal baqi l'Bimo f crédit?" (L'Mawoun IA)
          </span>
          <span className="ml-auto text-[10px] font-mono font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-none uppercase tracking-wider">
            Darija
          </span>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* PWA Offline Sync Status Indicator */}
          <button
            onClick={triggerManualSync}
            title={isOnline ? 'En ligne - Cliquer pour synchroniser' : 'Hors-ligne - Données sauvegardées localement'}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-none border font-mono font-semibold transition-all ${
              !isOnline
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : pendingSyncCount > 0
                ? 'bg-blue-50 text-blue-900 border-blue-300 animate-pulse'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
          >
            {!isOnline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="hidden sm:inline font-bold">Hors-ligne</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="hidden sm:inline font-medium">En ligne</span>
              </>
            )}

            {pendingSyncCount > 0 && (
              <span className="flex items-center gap-1 bg-amber-500 text-white font-black text-[10px] px-1.5 py-0.2">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                {pendingSyncCount}
              </span>
            )}
          </button>
          
          {/* Quick Cash Register Status Pill */}
          <button
            onClick={() => setActiveModule('pos')}
            className="hidden sm:flex items-center gap-2 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-900 px-3 py-1.5 rounded-none border-l-2 border-l-emerald-500 border-t border-b border-r border-indigo-200 transition-colors font-medium"
          >
            <Wallet className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-indigo-700 font-mono text-[11px]">Caisse:</span>
            <span className="font-mono font-black text-indigo-950">
              {cashSession.expectedCash.toFixed(2)} MAD
            </span>
            <span className="w-2 h-2 bg-emerald-500 animate-pulse" />
          </button>

          {/* AI Assistant Mobile Button */}
          <button
            onClick={onOpenAiAssistant}
            className="md:hidden flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-none shadow-xs transition-all font-mono"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>IA</span>
          </button>

          {/* Upgrade Plan Button */}
          <button
            onClick={onOpenPricing}
            className="hidden sm:flex items-center gap-1.5 text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-1.5 rounded-none transition-colors font-mono font-semibold"
          >
            <Crown className="w-3.5 h-3.5 text-amber-600" />
            <span>249 MAD/mo</span>
          </button>

          {/* Admin Control Plane Quick Shortcut */}
          <button
            onClick={() => setActiveModule('admin')}
            className="hidden lg:flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-amber-400 font-mono font-bold px-2.5 py-1.5 rounded-none border border-slate-700 transition-colors shadow-xs"
            title="Console Master Control Plane Admin"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Control Plane</span>
          </button>

          {/* Language Switcher */}
          <div className="relative flex items-center bg-slate-100 rounded-none p-0.5 border border-slate-200 text-xs">
            <Globe className="w-3.5 h-3.5 text-slate-500 ml-2 mr-1 hidden sm:block" />
            <div className="flex items-center">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`px-2 py-1 font-mono font-bold text-xs transition-all ${
                    language === lang.code
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={lang.label}
                >
                  {lang.code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* User Account & Logout */}
          {userProfile && (
            <div className="flex items-center gap-2 border-l border-slate-200 pl-2">
              <div className="hidden xl:flex flex-col text-right text-xs">
                <span className="font-bold text-slate-900 leading-tight font-mono truncate max-w-[120px]">
                  {userProfile.displayName}
                </span>
                <span className="text-[10px] text-emerald-600 font-bold truncate max-w-[120px]">
                  {userProfile.orgName}
                </span>
              </div>
              <button
                onClick={logout}
                title="Déconnexion Firebase"
                className="flex items-center gap-1 bg-slate-900 hover:bg-rose-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-none transition-colors font-mono"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sortir</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </header>
  );
};
