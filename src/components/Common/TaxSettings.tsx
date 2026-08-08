import React from 'react';
import { TvaRate } from '../../types';
import { calculateTva, formatMad } from '../../lib/moroccanTax';
import { Percent, Info, CheckCircle2 } from 'lucide-react';

export interface TaxSettingsProps {
  selectedRate: TvaRate;
  onRateChange: (rate: TvaRate) => void;
  amountHt: number;
  label?: string;
  showBreakdown?: boolean;
  compact?: boolean;
  className?: string;
}

const TVA_RATES_INFO: { rate: TvaRate; label: string; description: string; tag: string }[] = [
  { rate: 20, label: '20%', description: 'Taux normal (biens & services)', tag: 'Normal' },
  { rate: 14, label: '14%', description: 'Transport, électricité, thé', tag: 'Réduit' },
  { rate: 10, label: '10%', description: 'Restauration, hôtellerie, banque', tag: 'Réduit' },
  { rate: 7, label: '7%', description: 'Produits de base (eau, sucre, lait)', tag: 'Réduit' },
  { rate: 0, label: '0%', description: 'Exonéré / Exportation', tag: 'Exonéré' },
];

export const TaxSettings: React.FC<TaxSettingsProps> = ({
  selectedRate,
  onRateChange,
  amountHt,
  label = 'Taux de TVA Marocain',
  showBreakdown = true,
  compact = false,
  className = '',
}) => {
  const { tvaAmount, amountTtc } = calculateTva(amountHt || 0, selectedRate);
  const activeRateObj = TVA_RATES_INFO.find(r => r.rate === selectedRate) || TVA_RATES_INFO[0];

  return (
    <div className={`space-y-3 bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Percent className="w-3.5 h-3.5 text-emerald-400" />
          <span>{label}</span>
        </label>
        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
          DGI Maroc ({selectedRate}%)
        </span>
      </div>

      {/* TVA Rate Switcher Buttons */}
      <div className="grid grid-cols-5 gap-1.5">
        {TVA_RATES_INFO.map(item => {
          const isSelected = selectedRate === item.rate;
          return (
            <button
              key={item.rate}
              type="button"
              onClick={() => onRateChange(item.rate)}
              className={`relative flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-xs font-bold ${
                isSelected
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-950/50'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
              title={`${item.rate}%: ${item.description}`}
            >
              <div className="flex items-center gap-1">
                <span>{item.label}</span>
                {isSelected && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
              </div>
              {!compact && (
                <span className="text-[9px] font-normal text-slate-400 truncate max-w-full mt-0.5">
                  {item.tag}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Description info */}
      <div className="text-[11px] text-slate-400 flex items-start gap-1.5 pt-0.5">
        <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
        <span>{activeRateObj.description}</span>
      </div>

      {/* Dynamic Breakdown Card */}
      {showBreakdown && amountHt > 0 && (
        <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-2.5 grid grid-cols-3 gap-2 text-center text-xs font-mono">
          <div className="bg-slate-950/50 p-1.5 rounded border border-slate-800">
            <span className="text-[10px] font-sans text-slate-400 block uppercase">Base HT</span>
            <span className="font-bold text-slate-200">{formatMad(amountHt)}</span>
          </div>
          <div className="bg-slate-950/50 p-1.5 rounded border border-slate-800">
            <span className="text-[10px] font-sans text-emerald-400 block uppercase">TVA ({selectedRate}%)</span>
            <span className="font-bold text-emerald-400">+{formatMad(tvaAmount)}</span>
          </div>
          <div className="bg-slate-950/50 p-1.5 rounded border border-emerald-500/30">
            <span className="text-[10px] font-sans text-slate-300 block uppercase font-bold">Total TTC</span>
            <span className="font-black text-white">{formatMad(amountTtc)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
