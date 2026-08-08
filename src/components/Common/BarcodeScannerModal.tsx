import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, Barcode, CheckCircle2, Volume2, VolumeX, Sparkles, RefreshCw } from 'lucide-react';
import { Product, ProductVariant } from '../../types';
import { formatMad } from '../../lib/moroccanTax';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onItemScanned: (product: Product, variant?: ProductVariant) => void;
  title?: string;
  continuousMode?: boolean;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  onItemScanned,
  title = 'Scanner Code-Barres Caisse POS',
  continuousMode = true,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'hardware'>('camera');
  const [manualBarcode, setManualBarcode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScannedResult, setLastScannedResult] = useState<{
    code: string;
    product?: Product;
    variant?: ProductVariant;
    timestamp: number;
  } | null>(null);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'html5qr-code-full-region';
  const hardwareInputRef = useRef<HTMLInputElement | null>(null);

  // Play audio beep on successful barcode scan
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880 Hz pitch
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.warn('Audio feedback not supported:', e);
    }
  };

  // Helper to match barcode against products or product variants
  const findProductByBarcode = (code: string): { product?: Product; variant?: ProductVariant } => {
    const cleanCode = code.trim().toLowerCase();
    
    // First check exact variant barcode or SKU matches
    for (const prod of products) {
      if (prod.variants && prod.variants.length > 0) {
        const matchingVar = prod.variants.find(
          v => v.barcode.toLowerCase() === cleanCode || v.sku.toLowerCase() === cleanCode
        );
        if (matchingVar) {
          return { product: prod, variant: matchingVar };
        }
      }
    }

    // Next check main product barcode or SKU matches
    const mainMatch = products.find(
      p => p.barcode.toLowerCase() === cleanCode || p.sku.toLowerCase() === cleanCode
    );

    if (mainMatch) {
      // If product has variants, return first available variant or product itself
      return { product: mainMatch };
    }

    return {};
  };

  const handleBarcodeDetected = (decodedText: string) => {
    playBeep();
    const { product, variant } = findProductByBarcode(decodedText);

    setLastScannedResult({
      code: decodedText,
      product,
      variant,
      timestamp: Date.now(),
    });

    if (product) {
      onItemScanned(product, variant);
      if (!continuousMode) {
        onClose();
      }
    }
  };

  // Initialize Camera Scanner
  useEffect(() => {
    if (!isOpen || activeTab !== 'camera') return;

    let isSubscribed = true;

    const startScanner = async () => {
      try {
        setCameraError(null);
        const html5QrCode = new Html5Qrcode(readerElementId);
        html5QrcodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 250, height: 180 },
            aspectRatio: 1.333,
          },
          (decodedText) => {
            if (isSubscribed) {
              handleBarcodeDetected(decodedText);
            }
          },
          () => {
            // ignore frame parse failures
          }
        );
      } catch (err: any) {
        console.error('Error starting html5Qrcode:', err);
        if (isSubscribed) {
          setCameraError(
            err?.message || 'Accès caméra indisponible ou refusé par le navigateur.'
          );
        }
      }
    };

    // Small delay to ensure DOM element is mounted
    const timer = setTimeout(startScanner, 100);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
      if (html5QrcodeRef.current) {
        html5QrcodeRef.current.stop().catch(() => {}).finally(() => {
          if (html5QrcodeRef.current) {
            html5QrcodeRef.current.clear();
            html5QrcodeRef.current = null;
          }
        });
      }
    };
  }, [isOpen, activeTab]);

  // Focus hardware input when switching tab
  useEffect(() => {
    if (isOpen && activeTab === 'hardware' && hardwareInputRef.current) {
      hardwareInputRef.current.focus();
    }
  }, [isOpen, activeTab]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    handleBarcodeDetected(manualBarcode);
    setManualBarcode('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl text-slate-900 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-500">Scan via caméra mobile ou lecteur code-barres USB</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Désactiver le bip' : 'Activer le bip'}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 p-1 text-xs">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2 font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'camera'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4" /> Caméra スマホ / Web
          </button>
          <button
            onClick={() => setActiveTab('hardware')}
            className={`flex-1 py-2 font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'hardware'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Barcode className="w-4 h-4" /> Lecteur USB / Clavier
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {activeTab === 'camera' && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-300 min-h-[240px] flex items-center justify-center">
                <div id={readerElementId} className="w-full h-full" />
                
                {cameraError && (
                  <div className="absolute inset-0 p-6 bg-slate-900/90 text-white flex flex-col items-center justify-center text-center space-y-3">
                    <Camera className="w-10 h-10 text-rose-400 mb-1" />
                    <p className="text-xs text-slate-300">{cameraError}</p>
                    <p className="text-[11px] text-slate-400">
                      Vous pouvez basculer sur l'onglet <b>"Lecteur USB / Clavier"</b> pour saisir ou scanner directement.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Placez le code-barres dans le viseur (EAN-13, EAN-8, Code128)</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'hardware' && (
            <div className="space-y-4 py-2">
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-xs text-indigo-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-indigo-700">
                  <Barcode className="w-4 h-4 text-indigo-600" /> Mode Lecteur Code-Barres USB / Bluetooth
                </div>
                <p className="text-[11px] text-indigo-800">
                  Le champ ci-dessous reste automatiquement actif. Scannez un article avec votre douchette ou pistolet laser pour l'ajouter instantanément au panier.
                </p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div>
                  <label className="block text-slate-700 font-bold text-xs mb-1">
                    Saisir ou scanner Code-barres / SKU
                  </label>
                  <div className="flex gap-2">
                    <input
                      ref={hardwareInputRef}
                      type="text"
                      placeholder="ex: 6111001001234 ou HUI-001"
                      value={manualBarcode}
                      onChange={e => setManualBarcode(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors"
                    >
                      Valider
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Last Scanned Result Feedback */}
          {lastScannedResult && (
            <div
              className={`p-3 rounded-xl border text-xs transition-all ${
                lastScannedResult.product
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center justify-between font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className={`w-4 h-4 ${lastScannedResult.product ? 'text-emerald-600' : 'text-amber-600'}`} />
                  {lastScannedResult.product ? 'Article Détecté & Ajouté !' : 'Code-Barres Inconnu'}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {lastScannedResult.code}
                </span>
              </div>

              {lastScannedResult.product ? (
                <div className="mt-1 space-y-0.5">
                  <div className="font-extrabold text-slate-900 text-sm">
                    {lastScannedResult.product.name}
                  </div>
                  {lastScannedResult.variant && (
                    <div className="text-xs text-indigo-700 font-bold">
                      Déclinaison: {Object.entries(lastScannedResult.variant.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-600 font-mono">
                    <span>
                      Prix: <b>{formatMad(lastScannedResult.variant?.sellingPrice ?? lastScannedResult.product.sellingPrice)}</b>
                    </span>
                    <span>
                      Stock dispo: <b>{lastScannedResult.variant?.stockQty ?? lastScannedResult.product.stockQty}</b>
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-amber-800">
                  Aucun produit ne correspond au code <b>{lastScannedResult.code}</b>. Vérifiez l'article dans le catalogue Produits.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
          <div className="text-[11px] text-slate-500">
            {continuousMode ? 'Mode continu: prêt pour le scan suivant' : 'Fermeture automatique au scan'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition-colors"
          >
            Fermer le Scanner
          </button>
        </div>

      </div>
    </div>
  );
};
