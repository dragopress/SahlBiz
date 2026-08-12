import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider, useStore } from './context/StoreContext';
import { LandingPage } from './components/Landing/LandingPage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardModule } from './components/Dashboard/DashboardModule';
import { CustomerModule } from './components/Customers/CustomerModule';
import { InvoiceModule } from './components/Invoices/InvoiceModule';
import { ProductModule } from './components/Products/ProductModule';
import { PurchasesModule } from './components/Purchases/PurchasesModule';
import { ExpenseModule } from './components/Expenses/ExpenseModule';
import { EmployeeModule } from './components/Employees/EmployeeModule';
import { PosModule } from './components/POS/PosModule';
import { AccountantModule } from './components/Accountant/AccountantModule';
import { PricingModal } from './components/Pricing/PricingModal';
import { SettingsModule } from './components/Settings/SettingsModule';
import { ControlPlaneModule } from './components/Admin/ControlPlaneModule';
import { AuditModule } from './components/Audit/AuditModule';
import { AiAssistantModal } from './components/AiAssistant/AiAssistantModal';
import { WhatsAppModal } from './components/WhatsApp/WhatsAppModal';
import { Hexagon } from 'lucide-react';
import { canAccessModule } from './lib/rbac';
import { AccessDeniedView } from './components/Common/AccessDeniedView';

const AppContent: React.FC<{ onShowLanding: () => void }> = ({ onShowLanding }) => {
  const { currentUser, userProfile } = useAuth();
  const { activeModule, setActiveModule, whatsAppModalData, closeWhatsAppModal } = useStore();

  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  const isAdmin = userProfile?.role === 'admin';

  React.useEffect(() => {
    if (activeModule === 'admin' && !isAdmin) {
      setActiveModule('dashboard');
    }
  }, [activeModule, isAdmin, setActiveModule]);

  const renderModule = () => {
    if (activeModule === 'admin' && !isAdmin) {
      return <DashboardModule />;
    }

    const hasAccess = canAccessModule(userProfile?.role || 'owner', activeModule);
    if (!hasAccess) {
      return (
        <AccessDeniedView
          module={activeModule}
          role={userProfile?.role || 'owner'}
          onGoBack={() => setActiveModule('dashboard')}
        />
      );
    }

    switch (activeModule) {
      case 'dashboard':
        return <DashboardModule />;
      case 'crm':
        return <CustomerModule />;
      case 'invoices':
        return <InvoiceModule />;
      case 'products':
        return <ProductModule />;
      case 'purchases':
        return <PurchasesModule />;
      case 'expenses':
        return <ExpenseModule />;
      case 'hr':
        return <EmployeeModule />;
      case 'pos':
        return <PosModule />;
      case 'accountant':
        return <AccountantModule />;
      case 'pricing':
        return <PricingModal onClose={() => setActiveModule('dashboard')} />;
      case 'settings':
        return <SettingsModule />;
      case 'audit':
        return <AuditModule />;
      case 'admin':
        return <ControlPlaneModule />;
      default:
        return <DashboardModule />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-600 selection:text-white">
      {/* Top Fixed Navigation */}
      <Header
        onOpenAiAssistant={() => setIsAiOpen(true)}
        onOpenPricing={() => setIsPricingOpen(true)}
      />

      {/* Landing Page Banner Quick Switch for Authenticated User */}
      <div className="bg-slate-900 text-slate-200 px-4 py-1.5 text-xs flex items-center justify-between border-b border-slate-800 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-emerald-400 font-bold">SahlBiz Cloud Connecté</span>
          <span className="text-slate-400 hidden sm:inline">| Mode Production PME</span>
        </div>
        <button
          onClick={onShowLanding}
          className="text-emerald-400 hover:text-emerald-300 font-bold underline transition-colors"
        >
          Voir la Landing Page & Présentation →
        </button>
      </div>

      {/* Main Body with Sidebar + Active Module View */}
      <div className="flex-1 flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-900">
          {renderModule()}
        </main>
      </div>

      {/* AI Assistant Modal (L'Mawoun) */}
      {isAiOpen && (
        <AiAssistantModal onClose={() => setIsAiOpen(false)} />
      )}

      {/* Pricing Upgrade Modal */}
      {isPricingOpen && (
        <PricingModal onClose={() => setIsPricingOpen(false)} />
      )}

      {/* WhatsApp Trigger Modal */}
      {whatsAppModalData && (
        <WhatsAppModal
          phone={whatsAppModalData.phone}
          name={whatsAppModalData.name}
          text={whatsAppModalData.text}
          onClose={closeWhatsAppModal}
        />
      )}
    </div>
  );
};

const MainAppGate: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [inDashboard, setInDashboard] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="w-14 h-14 bg-gradient-to-tr from-emerald-500 to-indigo-600 rounded-2xl flex items-center justify-center animate-pulse shadow-lg shadow-emerald-500/20 mb-4">
          <Hexagon className="w-8 h-8 text-slate-950 stroke-[2.5]" />
        </div>
        <p className="text-sm font-mono font-semibold text-emerald-400">SahlBiz Cloud Sync...</p>
      </div>
    );
  }

  // Always start on LandingPage unless explicitly entering dashboard AND authenticated
  if (!inDashboard || !currentUser) {
    return (
      <LandingPage
        onEnterDashboard={() => setInDashboard(true)}
        onLoginSuccess={() => setInDashboard(true)}
      />
    );
  }

  return (
    <StoreProvider>
      <AppContent onShowLanding={() => setInDashboard(false)} />
    </StoreProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppGate />
    </AuthProvider>
  );
}

