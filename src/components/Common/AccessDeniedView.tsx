import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { getRoleLabel } from '../../lib/rbac';

interface AccessDeniedViewProps {
  module: string;
  role?: string;
  onGoBack?: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({ module, role, onGoBack }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50 min-h-[500px]">
      <div className="max-w-md w-full bg-white border border-slate-250 p-8 shadow-xs text-center relative overflow-hidden geo-angle-top-right">
        {/* Sleek, professional accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" />
        
        <div className="w-16 h-16 mx-auto mb-6 bg-red-50 text-red-600 flex items-center justify-center rounded-none border border-red-150">
          <ShieldAlert className="w-8 h-8" />
        </div>
        
        <h2 className="text-lg font-bold text-slate-950 mb-2 font-mono uppercase tracking-tight">Accès Restreint</h2>
        
        <p className="text-xs text-slate-600 mb-6 font-sans leading-relaxed">
          Votre profil avec le rôle <strong className="text-slate-900 font-mono font-bold bg-slate-100 px-1.5 py-0.5">{getRoleLabel(role)}</strong> ne dispose pas des privilèges d'accès requis pour le module <strong className="text-slate-900 font-mono font-bold">"{module.toUpperCase()}"</strong>.
        </p>
        
        <div className="bg-slate-50 p-4 border border-slate-200 text-left mb-6 font-mono text-[11px] text-slate-500">
          <div className="font-bold text-slate-700 uppercase mb-1.5">Diagnostic RBAC :</div>
          <div className="space-y-1">
            <div>• Statut : Autorisation refusée</div>
            <div>• Module : {module}</div>
            <div>• Rôle assigné : {role || 'owner'}</div>
            <div>• Stratégie : Contrôle d'accès basé sur les rôles</div>
          </div>
        </div>
        
        {onGoBack && (
          <button
            onClick={onGoBack}
            className="w-full bg-slate-900 hover:bg-slate-950 text-white font-mono text-xs py-2.5 px-4 transition-all duration-150 border border-transparent font-medium"
          >
            RETOURNER AU TABLEAU DE BORD
          </button>
        )}
        
        <p className="text-[10px] text-slate-400 mt-4 font-sans">
          Contactez le gestionnaire de votre entreprise pour modifier vos habilitations.
        </p>
      </div>
    </div>
  );
};
