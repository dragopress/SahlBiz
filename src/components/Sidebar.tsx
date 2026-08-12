import React from 'react';
import { useStore, ModuleType } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { getTranslation } from '../lib/i18n';
import sahlbizLogo from '../assets/images/sahlbiz_logo_1786198689277.jpg';
import { canAccessModule } from '../lib/rbac';
import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  Truck,
  Receipt,
  Briefcase,
  ShoppingBag,
  Calculator,
  Crown,
  Settings,
  ShieldCheck,
  ChevronRight,
  Fingerprint
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeModule, setActiveModule, language, customers, documents, products } = useStore();
  const { currentUser, userProfile } = useAuth();

  const isAdmin = userProfile?.role === 'admin';

  const unpaidKreddyCount = customers.filter(c => c.kreddyBalance > 0).length;
  const unpaidDocsCount = documents.filter(d => d.status === 'unpaid' || d.status === 'partial').length;
  const lowStockCount = products.filter(p => p.stockQty <= p.minStockAlert).length;

  const navItems: { id: ModuleType; labelKey: string; icon: React.FC<{ className?: string }>; badge?: number; badgeColor?: string }[] = [
    { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
    { id: 'crm', labelKey: 'crm', icon: Users, badge: unpaidKreddyCount, badgeColor: 'bg-red-500/20 text-red-400 border-red-500/40' },
    { id: 'invoices', labelKey: 'invoices', icon: FileText, badge: unpaidDocsCount, badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
    { id: 'products', labelKey: 'products', icon: Package, badge: lowStockCount, badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40' },
    { id: 'purchases', labelKey: 'purchases', icon: Truck },
    { id: 'expenses', labelKey: 'expenses', icon: Receipt },
    { id: 'hr', labelKey: 'hr', icon: Briefcase },
    { id: 'pos', labelKey: 'pos', icon: ShoppingBag },
    { id: 'accountant', labelKey: 'accountant', icon: Calculator },
    { id: 'pricing', labelKey: 'pricing', icon: Crown },
    { id: 'settings', labelKey: 'settings', icon: Settings },
    { id: 'audit', labelKey: 'audit', icon: Fingerprint },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', labelKey: 'admin', icon: ShieldCheck });
  }

  const allowedNavItems = navItems.filter(item => canAccessModule(userProfile?.role || 'owner', item.id));

  return (
    <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-800 shrink-0 flex flex-col justify-between text-white relative overflow-hidden">
      
      {/* Background Geometric Grid Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="sidebar-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sidebar-grid)" />
        </svg>
      </div>

      <div className="p-3 sm:p-4 space-y-1 relative z-10">
        
        {/* Brand Header with Logo & Geometric Border */}
        <div className="px-3 py-2 flex items-center gap-2.5 border-b border-slate-800/90 mb-3 pb-3">
          <div className="w-8 h-8 rounded-none geo-angle-top-right overflow-hidden border border-emerald-500/60 shadow-xs bg-slate-900 shrink-0">
            <img
              src={sahlbizLogo}
              alt="SahlBiz Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5 font-mono">
              <span>SahlBiz</span>
              <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded-none bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                PRO
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block -mt-0.5 font-sans">ERP & POS Maroc</span>
          </div>
        </div>

        <nav className="space-y-1">
          {allowedNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            const label = getTranslation(language, item.labelKey);

            return (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-none text-xs sm:text-sm font-medium transition-all relative ${
                  isActive
                    ? 'bg-indigo-600/90 text-white font-semibold shadow-xs border-l-4 border-l-emerald-400 pl-2.5'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-300' : 'text-slate-400'}`} />
                  <span className="truncate">{label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2 font-mono">
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-none border ${item.badgeColor || 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'}`}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-300" />}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Banner with Geometric Alignment */}
      <div className="p-4 border-t border-slate-800/90 bg-slate-900/80 relative z-10 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>ICE CGI 2026</span>
          <span className="text-indigo-400">v1.2</span>
        </div>
        <div className="flex items-center justify-between bg-slate-950 rounded-none p-2 border-l-2 border-l-emerald-500 border border-slate-800 text-[11px]">
          <span className="font-bold text-slate-300 font-sans">Conforme CGI Maroc</span>
          <span className="text-emerald-400 font-mono font-bold text-[10px]">100% OK</span>
        </div>
      </div>
    </aside>
  );
};
