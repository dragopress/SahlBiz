import React from 'react';
import { Product, ProductVariant } from '../../types';
import { formatMad } from '../../lib/moroccanTax';
import { Layers, X, Check, Barcode, AlertTriangle } from 'lucide-react';

interface VariantSelectorModalProps {
  product: Product | null;
  onClose: () => void;
  onSelectVariant: (product: Product, variant: ProductVariant) => void;
}

export const VariantSelectorModal: React.FC<VariantSelectorModalProps> = ({
  product,
  onClose,
  onSelectVariant,
}) => {
  if (!product || !product.variants || product.variants.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl text-slate-900 overflow-hidden space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">{product.name}</h3>
              <p className="text-[11px] text-slate-500">Choisissez la variante à ajouter au panier</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Variants List */}
        <div className="p-4 space-y-2.5 max-h-[60vh] overflow-y-auto">
          {product.variants.map((v) => {
            const attrString = Object.entries(v.attributes)
              .map(([key, val]) => `${key}: ${val}`)
              .join(' • ');
            const isOutOfStock = v.stockQty <= 0;

            return (
              <div
                key={v.id}
                onClick={() => {
                  if (!isOutOfStock) {
                    onSelectVariant(product, v);
                    onClose();
                  }
                }}
                className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                  isOutOfStock
                    ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                    : 'bg-white hover:bg-indigo-50/50 border-slate-200 hover:border-indigo-500 cursor-pointer shadow-2xs hover:shadow-xs'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      {attrString}
                    </span>
                    {isOutOfStock && (
                      <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> Rupture
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
                    <span>SKU: {v.sku}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Barcode className="w-3 h-3 text-slate-400" /> {v.barcode}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-3">
                  <div className="font-black text-indigo-600 font-mono text-sm">
                    {formatMad(v.sellingPrice)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Stock: <b className={v.stockQty <= 5 ? 'text-amber-600 font-bold' : 'text-slate-800'}>{v.stockQty}</b>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs transition-colors"
          >
            Annuler
          </button>
        </div>

      </div>
    </div>
  );
};
