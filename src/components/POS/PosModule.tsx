import React, { useState, useRef } from 'react';
import { useStore, PosCartItem } from '../../context/StoreContext';
import { Product, ProductVariant, PaymentMethod } from '../../types';
import { formatMad, calculateTva, calculateDroitDeTimbre } from '../../lib/moroccanTax';
import { BarcodeScannerModal } from '../Common/BarcodeScannerModal';
import { VariantSelectorModal } from './VariantSelectorModal';
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Wallet,
  Receipt,
  X,
  CheckCircle2,
  Printer,
  Camera,
  Layers,
  Barcode,
  Sparkles
} from 'lucide-react';

export const PosModule: React.FC = () => {
  const {
    products,
    customers,
    cashSession,
    processPosSale,
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('passage');

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [variantModalProduct, setVariantModalProduct] = useState<Product | null>(null);

  // Cart State
  const [cartItems, setCartItems] = useState<PosCartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  // Cash change calculator
  const [cashReceived, setCashReceived] = useState<string>('');

  // Success ticket modal
  const [completedSale, setCompletedSale] = useState<{ totalTtc: number; changeDue: number; number: string } | null>(null);

  const categories = Array.from(new Set(products.map(p => p.category)));

  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      return true;
    }

    const matchesName = p.name.toLowerCase().includes(term);
    const matchesSku = p.sku.toLowerCase().includes(term);
    const matchesBarcode = p.barcode.includes(term);

    const matchesVariant = p.variants?.some(
      v => v.sku.toLowerCase().includes(term) || v.barcode.includes(term) || Object.values(v.attributes).some(attrVal => String(attrVal).toLowerCase().includes(term))
    );

    const matchesSearch = matchesName || matchesSku || matchesBarcode || matchesVariant;

    if (!matchesSearch) return false;
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    return true;
  });

  const getCartItemKey = (item: PosCartItem) => {
    return item.product.id + (item.selectedVariant ? `-${item.selectedVariant.id}` : '');
  };

  const addItemToCart = (product: Product, variant?: ProductVariant) => {
    // Check available stock
    const availableStock = variant ? variant.stockQty : product.stockQty;
    if (availableStock <= 0) return;

    setCartItems(prev => {
      const targetKey = product.id + (variant ? `-${variant.id}` : '');
      const existing = prev.find(item => getCartItemKey(item) === targetKey);

      if (existing) {
        return prev.map(item =>
          getCartItemKey(item) === targetKey
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, selectedVariant: variant, quantity: 1 }];
    });
  };

  const handleProductClick = (product: Product) => {
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      setVariantModalProduct(product);
    } else {
      addItemToCart(product);
    }
  };

  const updateCartQty = (itemKey: string, delta: number) => {
    setCartItems(prev =>
      prev
        .map(item => {
          if (getCartItemKey(item) === itemKey) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as PosCartItem[]
    );
  };

  // Quick Barcode Direct Scan in Search Input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      const cleanTerm = searchTerm.trim().toLowerCase();

      // Check variant exact match first
      for (const prod of products) {
        if (prod.variants && prod.variants.length > 0) {
          const matchVar = prod.variants.find(
            v => v.barcode.toLowerCase() === cleanTerm || v.sku.toLowerCase() === cleanTerm
          );
          if (matchVar) {
            addItemToCart(prod, matchVar);
            setSearchTerm('');
            return;
          }
        }
      }

      // Check product exact match
      const matchProd = products.find(
        p => p.barcode.toLowerCase() === cleanTerm || p.sku.toLowerCase() === cleanTerm
      );

      if (matchProd) {
        handleProductClick(matchProd);
        setSearchTerm('');
      }
    }
  };

  // Cart Calculations
  let subtotalHt = 0;
  let totalTva = 0;

  cartItems.forEach(item => {
    const price = item.selectedVariant ? item.selectedVariant.sellingPrice : item.product.sellingPrice;
    const { tvaAmount } = calculateTva(price * item.quantity, item.product.tvaRate);
    subtotalHt += price * item.quantity;
    totalTva += tvaAmount;
  });

  const totalTtcWithoutTimbre = subtotalHt + totalTva;
  const droitDeTimbre = calculateDroitDeTimbre(totalTtcWithoutTimbre, paymentMethod);
  const finalTotalTtc = Number((totalTtcWithoutTimbre + droitDeTimbre).toFixed(2));

  const receivedAmt = parseFloat(cashReceived) || finalTotalTtc;
  const changeDue = Math.max(0, receivedAmt - finalTotalTtc);

  const handleCheckout = () => {
    if (cartItems.length === 0) return;

    processPosSale(cartItems, paymentMethod, selectedCustomerId === 'passage' ? undefined : selectedCustomerId);

    const docNum = `FAC-POS-${Math.floor(1000 + Math.random() * 9000)}`;

    setCompletedSale({
      totalTtc: finalTotalTtc,
      changeDue,
      number: docNum,
    });

    setCartItems([]);
    setCashReceived('');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-slate-900">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>Caisse POS Vente Rapide</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Fond de caisse disponible: <b className="text-emerald-700 font-mono text-sm">{formatMad(cashSession.expectedCash)}</b>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded transition-all shadow-xs"
          >
            <Camera className="w-4 h-4" />
            <span>Scanner Code-Barres</span>
          </button>

          <select
            value={selectedCustomerId}
            onChange={e => setSelectedCustomerId(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-900 font-bold px-3 py-2 rounded focus:outline-none focus:border-indigo-600"
          >
            <option value="passage">👤 Client Passage (Comptoir)</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                👤 {c.name} {c.ice ? `(ICE: ${c.ice})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* POS Catalog & Cart Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Catalog & Search */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Search Bar & Scanner Launch */}
          <div className="flex flex-col sm:flex-row gap-2 bg-white p-3 rounded border border-slate-200 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Scanner code-barres / Chercher nom, SKU, variante... (Appuyez sur Entrée)"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full bg-slate-50 border border-slate-200 rounded pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedCategory === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tous
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap transition-colors ${
                    selectedCategory === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.map(prod => {
              const isOutOfStock = prod.stockQty <= 0;
              const hasVariants = prod.hasVariants && prod.variants && prod.variants.length > 0;

              return (
                <div
                  key={prod.id}
                  onClick={() => handleProductClick(prod)}
                  className={`bg-white border p-3.5 rounded cursor-pointer transition-all hover:border-indigo-600 shadow-2xs hover:shadow-xs flex flex-col justify-between ${
                    isOutOfStock ? 'opacity-50 border-slate-200 bg-slate-50' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="font-bold text-xs text-slate-900 line-clamp-2">{prod.name}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded font-mono shrink-0">
                        {prod.tvaRate}% TVA
                      </span>
                    </div>

                    {hasVariants ? (
                      <div className="flex items-center gap-1 text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded w-fit mt-1">
                        <Layers className="w-3 h-3" />
                        <span>{prod.variants!.length} Déclinaisons</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-1">
                        <Barcode className="w-3 h-3" /> {prod.barcode}
                      </div>
                    )}
                  </div>

                  <div className="flex items-end justify-between mt-3 pt-2 border-t border-slate-100">
                    <div className="font-black font-mono text-sm text-indigo-600">
                      {formatMad(prod.sellingPrice)}
                    </div>
                    <span className={`text-[10px] font-bold ${prod.stockQty <= prod.minStockAlert ? 'text-rose-600' : 'text-slate-500'}`}>
                      Stk: {prod.stockQty}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Cart Panel */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-600" />
                <span>Panier Caisse ({cartItems.reduce((s, i) => s + i.quantity, 0)})</span>
              </h3>
              {cartItems.length > 0 && (
                <button
                  onClick={() => setCartItems([])}
                  className="text-[11px] text-rose-600 hover:underline font-bold"
                >
                  Vider Panier
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {cartItems.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Scannez un code-barres ou cliquez sur un produit.
                </div>
              ) : (
                cartItems.map(item => {
                  const key = getCartItemKey(item);
                  const unitPrice = item.selectedVariant ? item.selectedVariant.sellingPrice : item.product.sellingPrice;

                  return (
                    <div
                      key={key}
                      className="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5 max-w-[140px]">
                        <div className="font-bold text-slate-900 truncate">{item.product.name}</div>
                        {item.selectedVariant && (
                          <div className="text-[10px] text-indigo-700 font-bold truncate">
                            {Object.entries(item.selectedVariant.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 font-mono">
                          {formatMad(unitPrice)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-white rounded border border-slate-200">
                          <button
                            onClick={() => updateCartQty(key, -1)}
                            className="p-1 hover:text-slate-900 text-slate-500"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 font-bold font-mono text-slate-900 text-xs">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateCartQty(key, 1)}
                            className="p-1 hover:text-slate-900 text-slate-500"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="font-black font-mono text-indigo-600 text-xs w-16 text-right">
                          {(unitPrice * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Payment Method & Totals */}
          <div className="space-y-3 pt-3 border-t border-slate-200 text-xs">
            
            {/* Payment Method Selector */}
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1 tracking-wider">Mode de Règlement</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-2 rounded border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    paymentMethod === 'cash' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" /> Espèces
                </button>
                <button
                  onClick={() => setPaymentMethod('cmi_card')}
                  className={`p-2 rounded border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    paymentMethod === 'cmi_card' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" /> Carte CMI
                </button>
                <button
                  onClick={() => setPaymentMethod('kreddy')}
                  className={`p-2 rounded border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    paymentMethod === 'kreddy' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  Carnet Kreddy
                </button>
                <button
                  onClick={() => setPaymentMethod('check')}
                  className={`p-2 rounded border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    paymentMethod === 'check' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  Chèque
                </button>
              </div>
            </div>

            {/* Cash Received input for change calculator */}
            {paymentMethod === 'cash' && (
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1">
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Espèces Reçues (MAD):</span>
                  {changeDue > 0 && <span className="text-emerald-700 font-bold">Rendu: {formatMad(changeDue)}</span>}
                </div>
                <input
                  type="number"
                  placeholder={finalTotalTtc.toString()}
                  value={cashReceived}
                  onChange={e => setCashReceived(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-2.5 py-1 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>
            )}

            {/* Totals Summary */}
            <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1 font-mono text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total HT:</span>
                <span>{formatMad(subtotalHt)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total TVA:</span>
                <span>{formatMad(totalTva)}</span>
              </div>
              {droitDeTimbre > 0 && (
                <div className="flex justify-between text-amber-700 text-[10px] font-bold">
                  <span>Droit de Timbre (0.25%):</span>
                  <span>{formatMad(droitDeTimbre)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-1.5 flex justify-between font-extrabold text-base text-slate-900">
                <span>TOTAL TTC:</span>
                <span className="text-indigo-600">{formatMad(finalTotalTtc)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={cartItems.length === 0}
              className="w-full py-3 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <Printer className="w-4 h-4" />
              <span>Valider & Imprimer Ticket</span>
            </button>

          </div>
        </div>

      </div>

      {/* Barcode Scanner Camera & Hardware Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        products={products}
        onItemScanned={(product, variant) => {
          addItemToCart(product, variant);
        }}
      />

      {/* Product Variant Selector Modal */}
      <VariantSelectorModal
        product={variantModalProduct}
        onClose={() => setVariantModalProduct(null)}
        onSelectVariant={(product, variant) => {
          addItemToCart(product, variant);
        }}
      />

      {/* Ticket Success Modal */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded border border-slate-200 w-full max-w-sm p-6 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-full text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-bold text-lg text-slate-900">Vente Encaissée !</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Ticket N° {completedSale.number}</p>
            </div>

            <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs font-mono space-y-1">
              <div className="flex justify-between text-slate-700">
                <span>Montant Réglé:</span>
                <span className="font-bold">{formatMad(completedSale.totalTtc)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Monnaie Rendue:</span>
                <span>{formatMad(completedSale.changeDue)}</span>
              </div>
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="bg-slate-900 text-white text-xs px-4 py-2 rounded font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Imprimer Ticket
              </button>
              <button
                onClick={() => setCompletedSale(null)}
                className="bg-indigo-600 text-white text-xs px-4 py-2 rounded font-bold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
