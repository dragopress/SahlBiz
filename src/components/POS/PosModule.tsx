import React, { useState, useEffect, useRef } from 'react';
import { useStore, PosCartItem } from '../../context/StoreContext';
import { Product, ProductVariant, PaymentMethod, BusinessDocument, Customer } from '../../types';
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
  Sparkles,
  Keyboard,
  History,
  DollarSign,
  AlertCircle,
  UserPlus,
  FolderDown,
  FolderUp,
  Undo2,
  RefreshCw,
  FileText,
  Check,
  Lock,
  Unlock,
  Wifi,
  WifiOff,
  Percent,
  ChevronRight,
  Calculator
} from 'lucide-react';

export const PosModule: React.FC = () => {
  const {
    products,
    customers,
    cashSession,
    processPosSale,
    closeCashSession,
    openCashSession,
    addCashToSession,
    withdrawCashFromSession,
    addCustomer,
    documents,
    addInventoryMovement,
    adjustKreddyBalance,
    isOnline,
    pendingSyncCount,
    triggerManualSync
  } = useStore();

  const searchRef = useRef<HTMLInputElement>(null);

  // Search & Categories State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('passage');

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [variantModalProduct, setVariantModalProduct] = useState<Product | null>(null);

  // Cart State
  const [cartItems, setCartItems] = useState<PosCartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  // Global Cart Discounts
  const [cartDiscountPercent, setCartDiscountPercent] = useState<number>(0);
  const [cartDiscountFixed, setCartDiscountFixed] = useState<number>(0);
  const [isCartDiscountOpen, setIsCartDiscountOpen] = useState(false);

  // Direct edit Cart Item modal
  const [editingCartItem, setEditingCartItem] = useState<PosCartItem | null>(null);
  const [editingItemDiscountPercent, setEditingItemDiscountPercent] = useState<number>(0);
  const [editingItemDiscountFixed, setEditingItemDiscountFixed] = useState<number>(0);
  const [editingItemCustomPrice, setEditingItemCustomPrice] = useState<string>('');
  const [editingItemQuantity, setEditingItemQuantity] = useState<number>(1);

  // Split Payment states
  const [isSplitPaymentOpen, setIsSplitPaymentOpen] = useState(false);
  const [splitCash, setSplitCash] = useState<string>('');
  const [splitCard, setSplitCard] = useState<string>('');
  const [splitCheck, setSplitCheck] = useState<string>('');
  const [splitKreddy, setSplitKreddy] = useState<string>('');

  // Suspended Carts (Held Orders)
  const [suspendedCarts, setSuspendedCarts] = useState<{ id: string; name: string; items: PosCartItem[]; customerId: string; date: string }[]>([]);
  const [isSuspendConfirmOpen, setIsSuspendConfirmOpen] = useState(false);
  const [suspendCartName, setSuspendCartName] = useState('');
  const [isSuspendedCartsOpen, setIsSuspendedCartsOpen] = useState(false);

  // Quick Customer Creation
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustLimit, setNewCustLimit] = useState('2000');

  // Cashier Sessions Add-ins / Adjustments
  const [isCashInOpen, setIsCashInOpen] = useState(false);
  const [cashInAmount, setCashInAmount] = useState<string>('');
  const [cashInReason, setCashInReason] = useState<string>('');

  const [isCashOutOpen, setIsCashOutOpen] = useState(false);
  const [cashOutAmount, setCashOutAmount] = useState<string>('');
  const [cashOutReason, setCashOutReason] = useState<string>('');

  const [isClosingOpen, setIsClosingOpen] = useState(false);
  const [countedCash, setCountedCash] = useState<string>('');
  const [countedCard, setCountedCard] = useState<string>('');
  const [countedCheck, setCountedCheck] = useState<string>('');
  const [countedKreddy, setCountedKreddy] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');

  // Returns Module States
  const [isReturnsOpen, setIsReturnsOpen] = useState(false);
  const [returnSearchTerm, setReturnSearchTerm] = useState('');
  const [selectedReturnDoc, setSelectedReturnDoc] = useState<BusinessDocument | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<{ [itemId: string]: number }>({});
  const [returnNotes, setReturnNotes] = useState('');

  // Receipt Reprint State
  const [selectedReprintDoc, setSelectedReprintDoc] = useState<BusinessDocument | null>(null);

  // Offline Simulation State
  const [simulatedOffline, setSimulatedOffline] = useState(false);

  // Cash Received calculator
  const [cashReceived, setCashReceived] = useState<string>('');

  // Success ticket modal
  const [completedSale, setCompletedSale] = useState<{ totalTtc: number; changeDue: number; number: string; items: any[]; customerName: string; paymentMethod: string; date: string } | null>(null);

  // Cash session initialization
  const [openingFloat, setOpeningFloat] = useState<string>('500');

  // Idempotency state
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  // Load Suspended Carts on mount
  useEffect(() => {
    const cached = localStorage.getItem('sahlbiz_suspended_carts');
    if (cached) {
      try {
        setSuspendedCarts(JSON.parse(cached));
      } catch (e) {
        console.error('Failed to parse suspended carts', e);
      }
    }
  }, []);

  // Save Suspended Carts
  const saveSuspendedCarts = (newCarts: typeof suspendedCarts) => {
    setSuspendedCarts(newCarts);
    localStorage.setItem('sahlbiz_suspended_carts', JSON.stringify(newCarts));
  };

  // Keyboard Navigation Bindings
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering hotkeys when typing in search or normal inputs except F keys
      const activeEl = document.activeElement;
      const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if (e.key === 'F1') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (cartItems.length > 0 && cashSession.status === 'open') {
          setPaymentMethod('cash');
          // Trigger checkout
          handleFastCashCheckout();
        }
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cartItems.length > 0 && cashSession.status === 'open') {
          openSplitPaymentModal();
        }
      } else if (e.key === 'F6') {
        e.preventDefault();
        setIsAddCustomerOpen(true);
      } else if (e.key === 'F7') {
        e.preventDefault();
        if (cartItems.length > 0 && cashSession.status === 'open') {
          setSuspendCartName(`Caddie N° ${suspendedCarts.length + 1}`);
          setIsSuspendConfirmOpen(true);
        }
      } else if (e.key === 'F8') {
        e.preventDefault();
        setIsSuspendedCartsOpen(true);
      } else if (e.key === 'F9') {
        e.preventDefault();
        setIsReturnsOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cartItems, suspendedCarts, cashSession.status]);

  const categories = Array.from(new Set(products.map(p => p.category)));

  // Filter products by search term & category
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

  // Add Item to Cart with Stock Checks
  const addItemToCart = (product: Product, variant?: ProductVariant, customQty: number = 1) => {
    const availableStock = variant ? variant.stockQty : product.stockQty;

    setCartItems(prev => {
      const targetKey = product.id + (variant ? `-${variant.id}` : '');
      const existing = prev.find(item => getCartItemKey(item) === targetKey);
      const currentQtyInCart = existing ? existing.quantity : 0;
      const finalQty = currentQtyInCart + customQty;

      if (finalQty > availableStock) {
        alert(`Stock insuffisant ! Stock disponible: ${availableStock}`);
        return prev;
      }

      if (existing) {
        return prev.map(item =>
          getCartItemKey(item) === targetKey
            ? { ...item, quantity: finalQty }
            : item
        );
      }
      return [...prev, { product, selectedVariant: variant, quantity: customQty }];
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
            const availableStock = item.selectedVariant ? item.selectedVariant.stockQty : item.product.stockQty;
            const newQty = item.quantity + delta;
            if (newQty > availableStock) {
              alert(`Stock insuffisant ! Max disponible: ${availableStock}`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as PosCartItem[]
    );
  };

  // Barcode search on press Enter
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      const cleanTerm = searchTerm.trim().toLowerCase();

      // Variant exact match
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

      // Product exact match
      const matchProd = products.find(
        p => p.barcode.toLowerCase() === cleanTerm || p.sku.toLowerCase() === cleanTerm
      );

      if (matchProd) {
        handleProductClick(matchProd);
        setSearchTerm('');
      }
    }
  };

  // Cart Calculations with support for item-level and cart-level discounts
  let totalHtBeforeGlobalDiscount = 0;
  let totalTvaBeforeGlobalDiscount = 0;

  cartItems.forEach(item => {
    const basePrice = item.customPrice !== undefined
      ? item.customPrice
      : (item.selectedVariant ? item.selectedVariant.sellingPrice : item.product.sellingPrice);
    
    let discountedPrice = basePrice;
    if (item.discountPercent) {
      discountedPrice = discountedPrice * (1 - item.discountPercent / 100);
    }
    if (item.discountFixed) {
      discountedPrice = Math.max(0, discountedPrice - item.discountFixed);
    }

    const { tvaAmount } = calculateTva(discountedPrice * item.quantity, item.product.tvaRate);
    totalHtBeforeGlobalDiscount += discountedPrice * item.quantity;
    totalTvaBeforeGlobalDiscount += tvaAmount;
  });

  // Apply Global Cart Discount
  let globalDiscountFactor = 1;
  if (cartDiscountPercent > 0) {
    globalDiscountFactor = 1 - (cartDiscountPercent / 100);
  } else if (cartDiscountFixed > 0 && totalHtBeforeGlobalDiscount > 0) {
    globalDiscountFactor = (totalHtBeforeGlobalDiscount - cartDiscountFixed) / totalHtBeforeGlobalDiscount;
    if (globalDiscountFactor < 0) globalDiscountFactor = 0;
  }

  const subtotalHt = Number((totalHtBeforeGlobalDiscount * globalDiscountFactor).toFixed(2));
  const totalTva = Number((totalTvaBeforeGlobalDiscount * globalDiscountFactor).toFixed(2));
  const totalTtcWithoutTimbre = Number((subtotalHt + totalTva).toFixed(2));
  const droitDeTimbre = calculateDroitDeTimbre(totalTtcWithoutTimbre, paymentMethod);
  const finalTotalTtc = Number((totalTtcWithoutTimbre + droitDeTimbre).toFixed(2));

  const receivedAmt = parseFloat(cashReceived) || finalTotalTtc;
  const changeDue = Math.max(0, receivedAmt - finalTotalTtc);

  // Active Customer Details for credit limits
  const activeCustomer = customers.find(c => c.id === selectedCustomerId);

  // Suspended Cart management
  const handleSuspendCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendCartName.trim()) return;

    const newCart = {
      id: `sus-${Date.now()}`,
      name: suspendCartName,
      items: [...cartItems],
      customerId: selectedCustomerId,
      date: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };

    saveSuspendedCarts([newCart, ...suspendedCarts]);
    setCartItems([]);
    setSuspendCartName('');
    setIsSuspendConfirmOpen(false);
  };

  const handleResumeCart = (cart: typeof suspendedCarts[0]) => {
    setCartItems(cart.items);
    setSelectedCustomerId(cart.customerId);
    saveSuspendedCarts(suspendedCarts.filter(c => c.id !== cart.id));
    setIsSuspendedCartsOpen(false);
  };

  const handleDeleteSuspendedCart = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveSuspendedCarts(suspendedCarts.filter(c => c.id !== id));
  };

  // Quick Customer Create
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;

    const limit = parseFloat(newCustLimit) || 2000;
    addCustomer({
      name: newCustName,
      phone: newCustPhone,
      email: newCustEmail || undefined,
      pricingTier: 'standard',
      creditLimit: limit,
      notes: 'Ajout rapide POS',
    });

    // Auto select newly created customer
    const match = customers.find(c => c.name === newCustName || c.phone === newCustPhone);
    if (match) setSelectedCustomerId(match.id);

    // Reset Form
    setNewCustName('');
    setNewCustPhone('');
    setNewCustEmail('');
    setNewCustLimit('2000');
    setIsAddCustomerOpen(false);
  };

  // Open item-level discount / price editor modal
  const openItemEditor = (item: PosCartItem) => {
    setEditingCartItem(item);
    setEditingItemDiscountPercent(item.discountPercent || 0);
    setEditingItemDiscountFixed(item.discountFixed || 0);
    setEditingItemCustomPrice(item.customPrice !== undefined ? item.customPrice.toString() : '');
    setEditingItemQuantity(item.quantity);
  };

  // Save changes to item
  const handleSaveItemEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCartItem) return;

    const key = getCartItemKey(editingCartItem);
    const availableStock = editingCartItem.selectedVariant ? editingCartItem.selectedVariant.stockQty : editingCartItem.product.stockQty;

    if (editingItemQuantity > availableStock) {
      alert(`La quantité dépasse le stock disponible (${availableStock})`);
      return;
    }

    setCartItems(prev =>
      prev.map(item => {
        if (getCartItemKey(item) === key) {
          return {
            ...item,
            quantity: editingItemQuantity,
            discountPercent: editingItemDiscountPercent || undefined,
            discountFixed: editingItemDiscountFixed || undefined,
            customPrice: editingItemCustomPrice ? parseFloat(editingItemCustomPrice) : undefined,
          };
        }
        return item;
      })
    );
    setEditingCartItem(null);
  };

  // Quick cash checkout (F2) helper
  const handleFastCashCheckout = () => {
    if (isCheckoutLoading) return;
    setIsCheckoutLoading(true);

    const key = `idemp-pos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const res = processPosSale(
      cartItems,
      'cash',
      selectedCustomerId === 'passage' ? undefined : selectedCustomerId,
      undefined,
      key,
      cartDiscountPercent,
      cartDiscountFixed
    );

    if (res.success && res.doc) {
      setCompletedSale({
        totalTtc: res.doc.totalTtc,
        changeDue: changeDue,
        number: res.doc.number,
        items: res.doc.items,
        customerName: res.doc.customerName,
        paymentMethod: 'Espèces',
        date: res.doc.date
      });
      setCartItems([]);
      setCashReceived('');
      setCartDiscountPercent(0);
      setCartDiscountFixed(0);
    } else {
      alert(res.error || "Une erreur est survenue.");
    }
    setIsCheckoutLoading(false);
  };

  // Open split payment modal & populate fields
  const openSplitPaymentModal = () => {
    setSplitCash(finalTotalTtc.toString());
    setSplitCard('');
    setSplitCheck('');
    setSplitKreddy('');
    setIsSplitPaymentOpen(true);
  };

  // Submit split payment
  const handleSplitCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    const cash = parseFloat(splitCash) || 0;
    const card = parseFloat(splitCard) || 0;
    const check = parseFloat(splitCheck) || 0;
    const kreddy = parseFloat(splitKreddy) || 0;

    const totalPaid = Number((cash + card + check + kreddy).toFixed(2));
    if (Math.abs(totalPaid - finalTotalTtc) > 0.05) {
      alert(`Le montant total réglé (${totalPaid} MAD) ne correspond pas au montant TTC requis (${finalTotalTtc} MAD).`);
      return;
    }

    if (kreddy > 0 && selectedCustomerId === 'passage') {
      alert("La méthode Kreddy nécessite de sélectionner un client identifié.");
      return;
    }

    if (kreddy > 0 && activeCustomer) {
      const allowedCredit = activeCustomer.creditLimit - activeCustomer.kreddyBalance;
      if (kreddy > allowedCredit) {
        alert(`Crédit Kreddy refusé ! Solde disponible restant: ${allowedCredit} MAD. Limite autorisée dépassée.`);
        return;
      }
    }

    setIsCheckoutLoading(true);
    const key = `idemp-pos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const res = processPosSale(
      cartItems,
      'split',
      selectedCustomerId === 'passage' ? undefined : selectedCustomerId,
      { cash, card, check, kreddy },
      key,
      cartDiscountPercent,
      cartDiscountFixed
    );

    if (res.success && res.doc) {
      setCompletedSale({
        totalTtc: res.doc.totalTtc,
        changeDue: 0,
        number: res.doc.number,
        items: res.doc.items,
        customerName: res.doc.customerName,
        paymentMethod: `Multi-mode (Esp: ${cash} | Carte: ${card} | Chq: ${check} | Kreddy: ${kreddy})`,
        date: res.doc.date
      });
      setCartItems([]);
      setCartDiscountPercent(0);
      setCartDiscountFixed(0);
      setIsSplitPaymentOpen(false);
    } else {
      alert(res.error || "Une erreur est survenue lors de l'encaissement.");
    }
    setIsCheckoutLoading(false);
  };

  // Normal / Single method checkout action
  const handleCheckout = () => {
    if (cartItems.length === 0) return;

    if (paymentMethod === 'kreddy' && selectedCustomerId === 'passage') {
      alert("Le règlement par Carnet Kreddy nécessite de sélectionner un client identifié.");
      return;
    }

    if (paymentMethod === 'kreddy' && activeCustomer) {
      const allowedCredit = activeCustomer.creditLimit - activeCustomer.kreddyBalance;
      if (finalTotalTtc > allowedCredit) {
        alert(`Plafond de crédit Kreddy insuffisant ! Solde disponible: ${allowedCredit} MAD.`);
        return;
      }
    }

    setIsCheckoutLoading(true);
    const key = `idemp-pos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const res = processPosSale(
      cartItems,
      paymentMethod,
      selectedCustomerId === 'passage' ? undefined : selectedCustomerId,
      undefined,
      key,
      cartDiscountPercent,
      cartDiscountFixed
    );

    if (res.success && res.doc) {
      setCompletedSale({
        totalTtc: res.doc.totalTtc,
        changeDue: paymentMethod === 'cash' ? changeDue : 0,
        number: res.doc.number,
        items: res.doc.items,
        customerName: res.doc.customerName,
        paymentMethod: paymentMethod === 'cash' ? 'Espèces' : paymentMethod === 'cmi_card' ? 'Carte CMI' : paymentMethod === 'kreddy' ? 'Carnet Kreddy' : 'Chèque',
        date: res.doc.date
      });
      setCartItems([]);
      setCashReceived('');
      setCartDiscountPercent(0);
      setCartDiscountFixed(0);
    } else {
      alert(res.error || "Une erreur est survenue lors de l'encaissement.");
    }
    setIsCheckoutLoading(false);
  };

  // Returns Logic
  const handleReturnDocSearch = () => {
    const doc = documents.find(d => d.number === returnSearchTerm.trim());
    if (doc) {
      setSelectedReturnDoc(doc);
      const qties: typeof returnQuantities = {};
      doc.items.forEach(item => {
        qties[item.id] = 0;
      });
      setReturnQuantities(qties);
    } else {
      alert("Ticket non trouvé.");
    }
  };

  const handleSaveReturn = async () => {
    if (!selectedReturnDoc) return;

    const returnedItems = selectedReturnDoc.items.map(item => {
      const returnedQty = returnQuantities[item.id] || 0;
      return { ...item, returnedQty };
    }).filter(i => i.returnedQty > 0);

    if (returnedItems.length === 0) {
      alert("Veuillez sélectionner au moins un article et une quantité à retourner.");
      return;
    }

    // 1. Process inventory additions (returns)
    let refundAmount = 0;
    for (const item of returnedItems) {
      refundAmount += item.unitPriceHt * item.returnedQty * (1 + item.tvaRate / 100);

      // Register return movement to put back stock
      await addInventoryMovement({
        productId: item.productId,
        productName: item.productName,
        variantId: item.variantId,
        variantName: item.variantName,
        type: 'return',
        quantity: item.returnedQty,
        unitCost: item.unitPriceHt,
        referenceType: 'pos',
        referenceId: selectedReturnDoc.id,
        notes: returnNotes || `Retour partiel de vente ${selectedReturnDoc.number}`
      });
    }

    // 2. Financial settlement
    if (selectedReturnDoc.paymentMethod === 'kreddy') {
      // Deduct from outstanding Kreddy balance
      adjustKreddyBalance(selectedReturnDoc.customerId, -refundAmount);
      alert(`Retour enregistré ! ${formatMad(refundAmount)} ont été déduits du carnet de crédit du client.`);
    } else {
      // Payout in Cash (reduces expected register cash via withdraw helper)
      withdrawCashFromSession(refundAmount, `Remboursement Retour ticket ${selectedReturnDoc.number}`);
      alert(`Retour enregistré ! Veuillez rembourser ${formatMad(refundAmount)} en espèces au client.`);
    }

    setIsReturnsOpen(false);
    setSelectedReturnDoc(null);
    setReturnQuantities({});
    setReturnNotes('');
    setReturnSearchTerm('');
  };

  // Past Receipts (POS only)
  const posSalesInvoices = documents.filter(d => d.number.startsWith('FAC-POS-'));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-slate-900">
      
      {/* Dynamic Offline / simulated offline status banner */}
      {(simulatedOffline || !isOnline) && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded text-xs text-rose-900 flex items-center justify-between font-bold animate-pulse">
          <div className="flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-rose-600" />
            <span>MODE HORS-LIGNE ACTIVÉ: Les ventes sont sauvegardées localement et synchronisées dès que la connexion revient.</span>
          </div>
          <button
            onClick={() => {
              setSimulatedOffline(false);
              triggerManualSync();
            }}
            className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded"
          >
            Passer en ligne
          </button>
        </div>
      )}

      {/* SESSION CLOSED VIEW */}
      {cashSession.status === 'closed' ? (
        <div className="max-w-md mx-auto bg-white border border-slate-200 p-8 rounded-2xl shadow-xl space-y-6 text-center pt-12 pb-12">
          <div className="w-16 h-16 bg-slate-100 border border-slate-200 text-slate-600 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-950">Session de Caisse Fermée</h2>
            <p className="text-xs text-slate-500 mt-1">Vous devez initialiser le fond de caisse pour commencer à vendre.</p>
          </div>

          <div className="space-y-4 text-left">
            <div>
              <label className="block text-xs text-slate-700 font-bold mb-1">Fond de Caisse Initial (MAD) *</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="number"
                  required
                  value={openingFloat}
                  onChange={e => setOpeningFloat(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2.5 pl-9 text-sm focus:outline-none focus:border-indigo-600 font-mono font-bold"
                />
              </div>
            </div>

            <button
              onClick={() => openCashSession(parseFloat(openingFloat) || 0)}
              className="w-full py-3 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-xs"
            >
              Ouvrir la session de caisse
            </button>
          </div>
        </div>
      ) : (
        /* SESSION OPEN VIEW */
        <>
          {/* Top Cashier Session Bar */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white p-4 rounded border border-slate-200 shadow-xs text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded flex items-center justify-center font-bold">
                <Unlock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900">Session de Caisse Active</div>
                <div className="text-slate-500 text-[10px] mt-0.5 font-mono">Début: {cashSession.openedAt}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 font-mono font-bold text-[11px]">
              <div className="bg-slate-50 border border-slate-150 p-2 rounded">
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Fond de caisse (MAD)</span>
                <span className="text-indigo-600 text-sm font-black">{formatMad(cashSession.expectedCash)}</span>
              </div>
              <div className="bg-slate-50 border border-slate-150 p-2 rounded">
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Ventes Espèces</span>
                <span className="text-emerald-700 text-sm font-black">{formatMad(cashSession.totalSalesCash)}</span>
              </div>
              <div className="bg-slate-50 border border-slate-150 p-2 rounded">
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Ventes Carte CMI</span>
                <span className="text-blue-700 text-sm font-black">{formatMad(cashSession.totalSalesCard)}</span>
              </div>
              <div className="bg-slate-50 border border-slate-150 p-2 rounded">
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Ventes Kreddy</span>
                <span className="text-rose-700 text-sm font-black">{formatMad(cashSession.totalSalesKreddy)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsCashInOpen(true)}
                className="bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 font-bold px-2.5 py-1.5 rounded flex items-center gap-1.5"
                title="Entrée de caisse"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                <span>Entrée (+)</span>
              </button>
              <button
                onClick={() => setIsCashOutOpen(true)}
                className="bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 font-bold px-2.5 py-1.5 rounded flex items-center gap-1.5"
                title="Sortie de caisse"
              >
                <Minus className="w-3.5 h-3.5 text-rose-600" />
                <span>Sortie (-)</span>
              </button>
              <button
                onClick={() => {
                  setCountedCash(cashSession.expectedCash.toString());
                  setCountedCard(cashSession.totalSalesCard.toString());
                  setCountedCheck(cashSession.totalSalesCheck.toString());
                  setCountedKreddy(cashSession.totalSalesKreddy.toString());
                  setIsClosingOpen(true);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded"
              >
                Clôturer Session
              </button>
            </div>
          </div>

          {/* Main Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>Caisse POS Vente Rapide</span>
                </h1>
                <p className="text-[11px] text-slate-500 mt-0.5">Scannez des articles ou cliquez pour encaisser vos clients.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSimulatedOffline(!simulatedOffline)}
                className={`flex items-center gap-1.5 border px-3 py-2 text-xs font-bold rounded ${
                  simulatedOffline ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                {simulatedOffline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                <span>Simuler Hors-ligne</span>
              </button>

              <button
                onClick={() => setIsReturnsOpen(true)}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold px-3 py-2 rounded"
              >
                <Undo2 className="w-4 h-4 text-rose-600" />
                <span>Retours (F9)</span>
              </button>

              <button
                onClick={() => setIsSuspendedCartsOpen(true)}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold px-3 py-2 rounded relative"
              >
                <History className="w-4 h-4 text-indigo-600" />
                <span>Caddies (F8)</span>
                {suspendedCarts.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center">
                    {suspendedCarts.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setIsScannerOpen(true)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded shadow-2xs"
              >
                <Camera className="w-4 h-4" />
                <span>Scanner photo</span>
              </button>
            </div>
          </div>

          {/* POS CATALOG & CART */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Catalog (Left side) */}
            <div className="lg:col-span-2 space-y-4">
              
              {/* Category selector & Search bar */}
              <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded border border-slate-200 shadow-xs">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Scanner ou chercher produit... (F1 pour focus | Entrée pour scanner)"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full bg-slate-50 border border-slate-200 rounded pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-2.5 py-1.5 rounded text-xs font-bold whitespace-nowrap transition-colors ${
                      selectedCategory === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tous
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1.5 rounded text-xs font-bold whitespace-nowrap transition-colors ${
                        selectedCategory === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product cards list */}
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
                          <span className="font-bold text-xs text-slate-950 line-clamp-2">{prod.name}</span>
                          <span className="text-[9px] bg-slate-100 text-slate-600 font-black px-1.5 py-0.5 rounded font-mono shrink-0">
                            {prod.tvaRate}% TVA
                          </span>
                        </div>

                        {hasVariants ? (
                          <div className="flex items-center gap-1 text-[9px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded w-fit mt-1">
                            <Layers className="w-3 h-3" />
                            <span>{prod.variants!.length} Déclinaisons</span>
                          </div>
                        ) : (
                          <div className="text-[9px] text-slate-400 font-mono flex items-center gap-1 mt-1">
                            <Barcode className="w-3 h-3 text-slate-400" /> {prod.barcode}
                          </div>
                        )}
                      </div>

                      <div className="flex items-end justify-between mt-3 pt-2 border-t border-slate-100 text-xs">
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

            {/* Cart Panel (Right side) */}
            <div className="bg-white border border-slate-200 rounded p-4 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                {/* Cart Customer selection */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3 mb-3">
                  <div className="flex-1">
                    <select
                      value={selectedCustomerId}
                      onChange={e => setSelectedCustomerId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 font-bold px-2.5 py-2 rounded focus:outline-none focus:border-indigo-600"
                    >
                      <option value="passage">👤 Client Passage (Comptoir)</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          👤 {c.name} {c.kreddyBalance > 0 ? `(Solde: ${c.kreddyBalance} MAD)` : ''}
                        </option>
                      ))}
                    </select>

                    {/* Customer limits display */}
                    {activeCustomer && (
                      <div className="text-[10px] mt-1 font-mono text-slate-500 flex justify-between">
                        <span>Max Kreddy: <b>{formatMad(activeCustomer.creditLimit)}</b></span>
                        <span>Solde: <b className="text-rose-600">{formatMad(activeCustomer.kreddyBalance)}</b></span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setIsAddCustomerOpen(true)}
                    className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-600 shrink-0"
                    title="Nouveau client (F6)"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between pb-2 mb-2">
                  <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-indigo-600" />
                    <span>Panier ({cartItems.reduce((s, i) => s + i.quantity, 0)})</span>
                  </h3>
                  {cartItems.length > 0 && (
                    <button
                      onClick={() => setCartItems([])}
                      className="text-[10px] text-rose-600 hover:underline font-bold"
                    >
                      Tout vider
                    </button>
                  )}
                </div>

                {/* Cart list items */}
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {cartItems.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs space-y-1">
                      <Barcode className="w-8 h-8 text-slate-300 mx-auto" />
                      <div>Le panier est vide.</div>
                    </div>
                  ) : (
                    cartItems.map(item => {
                      const key = getCartItemKey(item);
                      
                      // Calculate individual item prices after discount
                      const basePrice = item.customPrice !== undefined
                        ? item.customPrice
                        : (item.selectedVariant ? item.selectedVariant.sellingPrice : item.product.sellingPrice);
                      
                      let discountedPrice = basePrice;
                      if (item.discountPercent) {
                        discountedPrice = discountedPrice * (1 - item.discountPercent / 100);
                      }
                      if (item.discountFixed) {
                        discountedPrice = Math.max(0, discountedPrice - item.discountFixed);
                      }

                      return (
                        <div
                          key={key}
                          className="p-2.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between text-xs cursor-pointer"
                          onClick={() => openItemEditor(item)}
                          title="Cliquez pour appliquer un rabais ou forcer le prix"
                        >
                          <div className="space-y-0.5 max-w-[140px]">
                            <div className="font-bold text-slate-950 truncate flex items-center gap-1">
                              <span>{item.product.name}</span>
                              {(item.discountPercent || item.discountFixed) && <span className="bg-rose-100 text-rose-700 text-[9px] px-1 rounded font-black">%</span>}
                            </div>
                            {item.selectedVariant && (
                              <div className="text-[9px] text-indigo-700 font-bold truncate">
                                {Object.entries(item.selectedVariant.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-500 font-mono">
                              {item.discountPercent || item.discountFixed ? (
                                <span className="space-x-1">
                                  <span className="line-through opacity-50">{formatMad(basePrice)}</span>
                                  <span className="font-bold text-rose-700">{formatMad(discountedPrice)}</span>
                                </span>
                              ) : (
                                <span>{formatMad(basePrice)}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center bg-white rounded border border-slate-200">
                              <button
                                onClick={() => updateCartQty(key, -1)}
                                className="p-1 hover:text-slate-900 text-slate-500"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-1.5 font-bold font-mono text-slate-950 text-xs">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateCartQty(key, 1)}
                                className="p-1 hover:text-slate-900 text-slate-500"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="font-black font-mono text-indigo-600 text-xs w-16 text-right shrink-0">
                              {formatMad(discountedPrice * item.quantity)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* POS Cart Discount & Checkout actions */}
              <div className="space-y-3 pt-3 border-t border-slate-200 text-xs">
                
                {/* Global Cart discounts button */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setIsCartDiscountOpen(true)}
                    className="text-xs text-indigo-600 hover:underline font-bold flex items-center gap-1"
                  >
                    <Percent className="w-3.5 h-3.5" />
                    <span>Appliquer remise globale</span>
                  </button>
                  {(cartDiscountPercent > 0 || cartDiscountFixed > 0) && (
                    <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded">
                      Remise: {cartDiscountPercent > 0 ? `${cartDiscountPercent}%` : `${cartDiscountFixed} MAD`}
                    </span>
                  )}
                </div>

                {/* Standard Single Payment methods */}
                <div>
                  <label className="block text-slate-500 text-[9px] font-bold uppercase mb-1 tracking-wider">Mode de Règlement principal</label>
                  <div className="grid grid-cols-4 gap-1">
                    <button
                      onClick={() => setPaymentMethod('cash')}
                      className={`py-1.5 px-1 rounded border text-[10px] font-bold text-center transition-colors ${
                        paymentMethod === 'cash' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      Espèces
                    </button>
                    <button
                      onClick={() => setPaymentMethod('cmi_card')}
                      className={`py-1.5 px-1 rounded border text-[10px] font-bold text-center transition-colors ${
                        paymentMethod === 'cmi_card' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      Carte CMI
                    </button>
                    <button
                      onClick={() => setPaymentMethod('kreddy')}
                      className={`py-1.5 px-1 rounded border text-[10px] font-bold text-center transition-colors ${
                        paymentMethod === 'kreddy' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      Kreddy
                    </button>
                    <button
                      onClick={() => setPaymentMethod('check')}
                      className={`py-1.5 px-1 rounded border text-[10px] font-bold text-center transition-colors ${
                        paymentMethod === 'check' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      Chèque
                    </button>
                  </div>
                </div>

                {/* Cash Received calc input */}
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

                {/* Sub-totals calculations */}
                <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1 font-mono text-xs">
                  <div className="flex justify-between text-slate-600 text-[10px]">
                    <span>Total Brut HT:</span>
                    <span>{formatMad(totalHtBeforeGlobalDiscount)}</span>
                  </div>
                  {(cartDiscountPercent > 0 || cartDiscountFixed > 0) && (
                    <div className="flex justify-between text-rose-700 text-[10px] font-bold">
                      <span>Remise Globale:</span>
                      <span>-{formatMad(totalHtBeforeGlobalDiscount - subtotalHt)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600 text-[10px]">
                    <span>Total HT Net:</span>
                    <span>{formatMad(subtotalHt)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 text-[10px]">
                    <span>Total TVA:</span>
                    <span>{formatMad(totalTva)}</span>
                  </div>
                  {droitDeTimbre > 0 && (
                    <div className="flex justify-between text-amber-700 text-[9px] font-bold">
                      <span>Droit de Timbre (0.25%):</span>
                      <span>{formatMad(droitDeTimbre)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-1.5 flex justify-between font-extrabold text-sm text-slate-950">
                    <span>TOTAL TTC:</span>
                    <span className="text-indigo-600 text-base">{formatMad(finalTotalTtc)}</span>
                  </div>
                </div>

                {/* Multi Split check out & Direct pay actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={openSplitPaymentModal}
                    disabled={cartItems.length === 0 || isCheckoutLoading}
                    className="py-2.5 rounded bg-slate-900 hover:bg-slate-950 disabled:opacity-40 text-white font-bold font-mono text-[11px] shadow-xs flex items-center justify-center gap-1 uppercase"
                    title="Fractionner le règlement en plusieurs modes"
                  >
                    <Calculator className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Split (F4)</span>
                  </button>

                  <button
                    onClick={handleCheckout}
                    disabled={cartItems.length === 0 || isCheckoutLoading}
                    className="py-2.5 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-[11px] shadow-xs flex items-center justify-center gap-1 uppercase"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Encaisser</span>
                  </button>
                </div>

                {/* Fast cash helper legend */}
                {cartItems.length > 0 && (
                  <div className="text-[10px] text-center text-slate-400 font-semibold italic flex items-center justify-center gap-1.5">
                    <Keyboard className="w-3.5 h-3.5" />
                    <span>Appuyez sur <b>F2</b> pour un encaissement direct espèces.</span>
                  </div>
                )}

              </div>
            </div>

          </div>
        </>
      )}

      {/* TICKET SUCCESS SUCCESSFUL SALE MODAL */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-full text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="text-center">
              <h3 className="font-extrabold text-base text-slate-950">Vente Encaissée !</h3>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">Ticket N° {completedSale.number}</p>
            </div>

            {/* Simulated Thermal Receipt Container */}
            <div id="pos-receipt-print" className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-[11px] font-mono space-y-3 shadow-inner">
              <div className="text-center border-b border-dashed border-slate-200 pb-2">
                <div className="font-extrabold uppercase tracking-wide text-xs">SahlBiz Sarl</div>
                <div className="text-[9px] text-slate-400 mt-0.5">Tél: 05-22-xx-xx-xx | Casablanca</div>
                <div className="text-[9px] text-slate-400">Date: {completedSale.date}</div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-bold text-slate-500 text-[10px]">
                  <span>Client:</span>
                  <span className="truncate max-w-[120px]">{completedSale.customerName}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-500 text-[10px]">
                  <span>Règlement:</span>
                  <span className="text-indigo-700">{completedSale.paymentMethod}</span>
                </div>
              </div>

              <table className="w-full text-left border-t border-dashed border-slate-200 pt-2 text-[10px]">
                <thead>
                  <tr className="border-b border-dashed border-slate-200 text-slate-500 font-bold">
                    <th className="pb-1">Art.</th>
                    <th className="pb-1 text-center">Qté</th>
                    <th className="pb-1 text-right">TTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[9px]">
                  {completedSale.items.map((item, idx) => (
                    <tr key={idx} className="text-slate-800">
                      <td className="py-1 max-w-[120px] truncate">{item.productName}</td>
                      <td className="py-1 text-center">{item.quantity}</td>
                      <td className="py-1 text-right">{formatMad(item.totalTtc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-dashed border-slate-200 pt-2 space-y-1 text-right">
                <div className="flex justify-between text-slate-600">
                  <span>Total Brut:</span>
                  <span>{formatMad(completedSale.totalTtc)}</span>
                </div>
                {completedSale.changeDue > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Monnaie Rendue:</span>
                    <span>{formatMad(completedSale.changeDue)}</span>
                  </div>
                )}
              </div>

              <div className="text-center border-t border-dashed border-slate-200 pt-3 text-[9px] text-slate-400">
                Merci de votre visite et à bientôt !
              </div>
            </div>

            <div className="flex justify-center gap-2 pt-1.5">
              <button
                onClick={() => window.print()}
                className="bg-slate-900 hover:bg-slate-950 text-white text-xs px-4 py-2 rounded-lg font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Imprimer Ticket
              </button>
              <button
                onClick={() => setCompletedSale(null)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-5 py-2 rounded-lg font-bold"
              >
                Nouvelle vente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SPLIT PAYMENT DIALOG MODAL */}
      {isSplitPaymentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl text-slate-900 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Règlement Fractionné (Split)</h3>
                  <p className="text-[10px] text-slate-500">Divisez le total TTC entre plusieurs modes de paiement</p>
                </div>
              </div>
              <button
                onClick={() => setIsSplitPaymentOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSplitCheckout} className="p-4 space-y-4 text-xs">
              
              <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg flex justify-between font-mono font-bold text-sm text-indigo-950">
                <span>Total Requis TTC:</span>
                <span>{formatMad(finalTotalTtc)}</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Espèces (MAD)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={splitCash}
                    onChange={e => setSplitCash(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Carte CMI (MAD)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={splitCard}
                    onChange={e => setSplitCard(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Chèque (MAD)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={splitCheck}
                    onChange={e => setSplitCheck(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Carnet Kreddy (MAD)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={splitKreddy}
                    onChange={e => setSplitKreddy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono font-bold text-slate-900"
                    disabled={selectedCustomerId === 'passage'}
                  />
                  {selectedCustomerId === 'passage' && (
                    <p className="text-[9px] text-rose-600 mt-0.5">Sélectionnez un client identifié pour activer Kreddy.</p>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setIsSplitPaymentOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded shadow-xs"
                >
                  Enregistrer & Encaisser
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ITEM EDITOR PRICE & DISCOUNT OVERRIDES MODAL */}
      {editingCartItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-2xl text-slate-900 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-extrabold text-sm text-slate-900">Ajuster l'article: {editingCartItem.product.name}</h3>
              <button onClick={() => setEditingCartItem(null)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItemEdit} className="p-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Forcer un Prix de Vente HT (MAD)</label>
                <input
                  type="number"
                  placeholder={(editingCartItem.selectedVariant ? editingCartItem.selectedVariant.sellingPrice : editingCartItem.product.sellingPrice).toString()}
                  value={editingItemCustomPrice}
                  onChange={e => setEditingItemCustomPrice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Remise (%)</label>
                  <input
                    type="number"
                    max="100"
                    min="0"
                    value={editingItemDiscountPercent || ''}
                    onChange={e => setEditingItemDiscountPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Remise Fixe (MAD)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItemDiscountFixed || ''}
                    onChange={e => setEditingItemDiscountFixed(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Quantité demandée *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editingItemQuantity}
                  onChange={e => setEditingItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setEditingCartItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded shadow-xs"
                >
                  Appliquer
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CART DISCOUNT SYSTEM (PROPORTIONAL COUPLING) */}
      {isCartDiscountOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xs shadow-2xl text-slate-900 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-extrabold text-sm text-slate-900">Remise Globale Panier</h3>
              <button onClick={() => setIsCartDiscountOpen(false)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Remise en Pourcentage (%)</label>
                <input
                  type="number"
                  max="100"
                  min="0"
                  value={cartDiscountPercent || ''}
                  onChange={e => {
                    setCartDiscountPercent(Math.max(0, parseFloat(e.target.value) || 0));
                    setCartDiscountFixed(0);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono font-bold"
                  placeholder="0 %"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Remise Fixe (MAD)</label>
                <input
                  type="number"
                  min="0"
                  value={cartDiscountFixed || ''}
                  onChange={e => {
                    setCartDiscountFixed(Math.max(0, parseFloat(e.target.value) || 0));
                    setCartDiscountPercent(0);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono font-bold"
                  placeholder="0.00 MAD"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => {
                    setCartDiscountPercent(0);
                    setCartDiscountFixed(0);
                    setIsCartDiscountOpen(false);
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded"
                >
                  Réinitialiser
                </button>
                <button
                  onClick={() => setIsCartDiscountOpen(false)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded shadow-xs"
                >
                  Appliquer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUSPEND CART / NAME INPUT MODAL */}
      {isSuspendConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xs shadow-2xl text-slate-900 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-extrabold text-sm text-slate-900">Mettre le Panier en Attente</h3>
              <button onClick={() => setIsSuspendConfirmOpen(false)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSuspendCart} className="p-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Libellé / Identifiant du Caddie *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Table 5, Ahmed, VIP..."
                  value={suspendCartName}
                  onChange={e => setSuspendCartName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setIsSuspendConfirmOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded shadow-xs"
                >
                  Suspendre (F7)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RETRIEVE SUSPENDED CARTS LIST MODAL */}
      {isSuspendedCartsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl text-slate-900 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <span>Panier suspendus en attente</span>
              </h3>
              <button onClick={() => setIsSuspendedCartsOpen(false)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-[360px] overflow-y-auto space-y-2 text-xs">
              {suspendedCarts.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  Aucun panier mis en attente pour le moment.
                </div>
              ) : (
                suspendedCarts.map(cart => (
                  <div
                    key={cart.id}
                    onClick={() => handleResumeCart(cart)}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-colors cursor-pointer flex justify-between items-center"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{cart.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {cart.items.length} articles | Heure: {cart.date}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-indigo-600 font-bold flex items-center gap-0.5 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded">
                        <span>Reprendre</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                      <button
                        onClick={e => handleDeleteSuspendedCart(cart.id, e)}
                        className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* QUICK NEW CUSTOMER CREATION MODAL */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xs shadow-2xl text-slate-900 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>Nouveau Client POS</span>
              </h3>
              <button onClick={() => setIsAddCustomerOpen(false)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nom Complet *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ahmed El Idrissi"
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Téléphone *</label>
                <input
                  type="tel"
                  required
                  placeholder="Ex: 06 61 xx xx xx"
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Limite de crédit (Kreddy) MAD</label>
                <input
                  type="number"
                  required
                  value={newCustLimit}
                  onChange={e => setNewCustLimit(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded shadow-xs"
                >
                  Enregistrer Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CASH-IN (MANUAL ADD) MODAL */}
      {isCashInOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xs shadow-2xl text-slate-900 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <FolderDown className="w-4 h-4 text-emerald-600" />
                <span>Entrée de Caisse (Cash-In)</span>
              </h3>
              <button onClick={() => setIsCashInOpen(false)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Montant à ajouter (MAD) *</label>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={cashInAmount}
                  onChange={e => setCashInAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Justificatif / Commentaire *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Ex: Fond additionnel, recharge..."
                  value={cashInReason}
                  onChange={e => setCashInReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setIsCashInOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    const amt = parseFloat(cashInAmount);
                    if (amt > 0 && cashInReason.trim()) {
                      addCashToSession(amt, cashInReason);
                      setCashInAmount('');
                      setCashInReason('');
                      setIsCashInOpen(false);
                      alert("Montant de caisse augmenté avec succès.");
                    }
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-xs"
                >
                  Valider
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CASH-OUT (MANUAL WITHDRAWAL) MODAL */}
      {isCashOutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xs shadow-2xl text-slate-900 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <FolderUp className="w-4 h-4 text-rose-600" />
                <span>Sortie de Caisse (Cash-Out)</span>
              </h3>
              <button onClick={() => setIsCashOutOpen(false)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Montant à retirer (MAD) *</label>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={cashOutAmount}
                  onChange={e => setCashOutAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Justificatif / Commentaire *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Ex: Achat fournitures, dépôt banque..."
                  value={cashOutReason}
                  onChange={e => setCashOutReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setIsCashOutOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    const amt = parseFloat(cashOutAmount);
                    if (amt > 0 && cashOutReason.trim()) {
                      if (amt > cashSession.expectedCash) {
                        alert("Le montant de retrait demandé dépasse le solde d'espèces disponible.");
                        return;
                      }
                      withdrawCashFromSession(amt, cashOutReason);
                      setCashOutAmount('');
                      setCashOutReason('');
                      setIsCashOutOpen(false);
                      alert("Retrait de caisse enregistré avec succès.");
                    }
                  }}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-750 text-white font-bold rounded shadow-xs"
                >
                  Valider
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CLOSING SESSION & RECONCILIATION MODAL */}
      {isClosingOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl text-slate-900 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-rose-600" />
                <span>Clôture et Réconciliation de Caisse</span>
              </h3>
              <button onClick={() => setIsClosingOpen(false)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">Espèces Attendues</span>
                  <span className="font-extrabold text-slate-900">{formatMad(cashSession.expectedCash)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">Carte Attendue</span>
                  <span className="font-extrabold text-slate-900">{formatMad(cashSession.totalSalesCard)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Espèces comptées réelles (MAD) *</label>
                  <input
                    type="number"
                    required
                    value={countedCash}
                    onChange={e => setCountedCash(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Montant Carte CMI compté réel (MAD) *</label>
                  <input
                    type="number"
                    required
                    value={countedCard}
                    onChange={e => setCountedCard(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Notes de clôture / Observations</label>
                  <textarea
                    rows={2}
                    placeholder="Saisissez des commentaires si écart de caisse constaté..."
                    value={closingNotes}
                    onChange={e => setClosingNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Variance calculator info */}
              <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg text-[10px] text-rose-900 font-mono">
                {(() => {
                  const variance = (parseFloat(countedCash) || 0) - cashSession.expectedCash;
                  if (variance === 0) return <div className="text-emerald-700 font-bold">✓ Caisse équilibrée. Aucun écart de caisse.</div>;
                  return (
                    <div className={variance > 0 ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                      ⚠️ Écart détecté: {variance > 0 ? `Bénéfice de +${variance} MAD` : `Perte de ${variance} MAD`}
                    </div>
                  );
                })()}
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setIsClosingOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    const actual = parseFloat(countedCash) || 0;
                    closeCashSession(actual);
                    setIsClosingOpen(false);
                    alert("Session de caisse clôturée avec succès.");
                  }}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded shadow-xs"
                >
                  Confirmer Clôture Caisse
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* SALES RETURNS & PAST RECEIPT SEARCH MODAL */}
      {isReturnsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl text-slate-900 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Undo2 className="w-5 h-5 text-rose-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Retours et remboursements de ventes</h3>
              </div>
              <button
                onClick={() => {
                  setIsReturnsOpen(false);
                  setSelectedReturnDoc(null);
                  setReturnQuantities({});
                }}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs">
              
              {/* Receipt lookup */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Saisir N° de Ticket (ex: FAC-POS-1234)"
                  value={returnSearchTerm}
                  onChange={e => setReturnSearchTerm(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono font-bold"
                />
                <button
                  onClick={handleReturnDocSearch}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded font-bold"
                >
                  Rechercher
                </button>
              </div>

              {/* Display items when receipt is found */}
              {selectedReturnDoc ? (
                <div className="space-y-3">
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-150 space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>Ticket: {selectedReturnDoc.number}</span>
                      <span>Client: {selectedReturnDoc.customerName}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 font-mono text-[10px]">
                      <span>Montant total: {formatMad(selectedReturnDoc.totalTtc)}</span>
                      <span>Méthode: {selectedReturnDoc.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="max-h-[180px] overflow-y-auto divide-y divide-slate-100 pr-1">
                    {selectedReturnDoc.items.map(item => (
                      <div key={item.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-950">{item.productName}</span>
                          <span className="block text-[10px] text-slate-500 font-mono">
                            Acheté: {item.quantity} | Prix: {formatMad(item.unitPriceHt)} (HT)
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-slate-500">Retourner:</label>
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={returnQuantities[item.id] || 0}
                            onChange={e => {
                              const val = Math.min(item.quantity, Math.max(0, parseInt(e.target.value) || 0));
                              setReturnQuantities(prev => ({ ...prev, [item.id]: val }));
                            }}
                            className="w-14 bg-slate-50 border border-slate-200 rounded text-center py-1 font-mono font-black"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Motif du retour / Justification</label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Produit défectueux, mauvaise taille..."
                      value={returnNotes}
                      onChange={e => setReturnNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="border-t border-slate-150 pt-3 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setSelectedReturnDoc(null);
                        setReturnQuantities({});
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded"
                    >
                      Retour
                    </button>
                    <button
                      onClick={handleSaveReturn}
                      className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded"
                    >
                      Enregistrer le retour
                    </button>
                  </div>
                </div>
              ) : (
                /* Recent receipts list to reprint */
                <div className="space-y-2">
                  <div className="font-bold text-xs text-slate-500 mb-1">Tickets de caisse récents :</div>
                  <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded bg-white">
                    {posSalesInvoices.length === 0 ? (
                      <div className="p-4 text-center text-slate-400">Aucun ticket récent.</div>
                    ) : (
                      posSalesInvoices.map(doc => (
                        <div key={doc.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="font-mono text-xs">
                            <span className="font-bold text-slate-900">{doc.number}</span>
                            <span className="block text-[10px] text-slate-500">{doc.date} | {doc.customerName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="text-slate-900 font-mono mr-2">{formatMad(doc.totalTtc)}</span>
                            <button
                              onClick={() => {
                                setCompletedSale({
                                  totalTtc: doc.totalTtc,
                                  changeDue: 0,
                                  number: doc.number,
                                  items: doc.items,
                                  customerName: doc.customerName,
                                  paymentMethod: doc.paymentMethod || 'Espèces',
                                  date: doc.date
                                });
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-700 flex items-center gap-1"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Réimprimer</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* BARCODE SCANNER Camera launch Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        products={products}
        onItemScanned={(product, variant) => {
          addItemToCart(product, variant);
        }}
      />

      {/* PRODUCT VARIANT SELECTOR */}
      <VariantSelectorModal
        product={variantModalProduct}
        onClose={() => setVariantModalProduct(null)}
        onSelectVariant={(product, variant) => {
          addItemToCart(product, variant);
        }}
      />

    </div>
  );
};
