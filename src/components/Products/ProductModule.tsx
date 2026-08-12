import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Product, ProductVariant, TvaRate } from '../../types';
import { formatMad } from '../../lib/moroccanTax';
import { BarcodeScannerModal } from '../Common/BarcodeScannerModal';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Barcode,
  Camera,
  Edit2,
  Trash2,
  X,
  MapPin,
  ChevronDown,
  ChevronRight,
  Layers,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export const ProductModule: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, isLoadingInitialData, isSaving } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<Product | null>(null);

  // Expanded variant rows state
  const [expandedProductIds, setExpandedProductIds] = useState<string[]>([]);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    sku: string;
    barcode: string;
    category: string;
    unit: Product['unit'];
    costPrice: number;
    sellingPrice: number;
    tvaRate: TvaRate;
    stockQty: number;
    minStockAlert: number;
    location: Product['location'];
    hasVariants: boolean;
    variantAttributes: string[];
    variants: ProductVariant[];
  }>({
    name: '',
    sku: '',
    barcode: '',
    category: 'Alimentation',
    unit: 'piece',
    costPrice: 0,
    sellingPrice: 0,
    tvaRate: 20,
    stockQty: 10,
    minStockAlert: 5,
    location: 'magasin',
    hasVariants: false,
    variantAttributes: ['Taille', 'Couleur'],
    variants: [],
  });

  // Variant generator state for modal
  const [newAttrInput, setNewAttrInput] = useState('');
  const [newVarForm, setNewVarForm] = useState<{
    sku: string;
    barcode: string;
    attributes: { [key: string]: string };
    costPrice: number;
    sellingPrice: number;
    stockQty: number;
  }>({
    sku: '',
    barcode: '',
    attributes: {},
    costPrice: 0,
    sellingPrice: 0,
    stockQty: 10,
  });

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
      v =>
        v.sku.toLowerCase().includes(term) ||
        v.barcode.includes(term) ||
        Object.values(v.attributes).some(attrVal => String(attrVal).toLowerCase().includes(term))
    );

    const matchesSearch = matchesName || matchesSku || matchesBarcode || matchesVariant;

    if (!matchesSearch) return false;
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    return true;
  });

  const lowStockCount = products.filter(p => {
    if (p.hasVariants && p.variants) {
      return p.variants.some(v => v.stockQty <= (v.minStockAlert ?? p.minStockAlert));
    }
    return p.stockQty <= p.minStockAlert;
  }).length;

  const toggleExpand = (id: string) => {
    setExpandedProductIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const openAddModal = (prod?: Product) => {
    if (prod) {
      setEditingProd(prod);
      setFormData({
        name: prod.name,
        sku: prod.sku,
        barcode: prod.barcode,
        category: prod.category,
        unit: prod.unit,
        costPrice: prod.costPrice,
        sellingPrice: prod.sellingPrice,
        tvaRate: prod.tvaRate,
        stockQty: prod.stockQty,
        minStockAlert: prod.minStockAlert,
        location: prod.location,
        hasVariants: !!prod.hasVariants,
        variantAttributes: prod.variantAttributes || ['Taille', 'Couleur'],
        variants: prod.variants ? [...prod.variants] : [],
      });
    } else {
      setEditingProd(null);
      const randSeq = Math.floor(1000 + Math.random() * 9000);
      setFormData({
        name: '',
        sku: `ART-${randSeq}`,
        barcode: `6111${Math.floor(100000000 + Math.random() * 900000000)}`,
        category: 'Alimentation',
        unit: 'piece',
        costPrice: 0,
        sellingPrice: 0,
        tvaRate: 20,
        stockQty: 10,
        minStockAlert: 5,
        location: 'magasin',
        hasVariants: false,
        variantAttributes: ['Taille', 'Couleur'],
        variants: [],
      });
    }
    setIsAddModalOpen(true);
  };

  const handleAddAttribute = () => {
    if (!newAttrInput.trim()) return;
    if (!formData.variantAttributes.includes(newAttrInput.trim())) {
      setFormData(prev => ({
        ...prev,
        variantAttributes: [...prev.variantAttributes, newAttrInput.trim()],
      }));
    }
    setNewAttrInput('');
  };

  const handleRemoveAttribute = (attrName: string) => {
    setFormData(prev => ({
      ...prev,
      variantAttributes: prev.variantAttributes.filter(a => a !== attrName),
    }));
  };

  const handleAddVariantItem = () => {
    // Ensure all required attributes have a value
    const missing = formData.variantAttributes.find(a => !newVarForm.attributes[a]);
    if (missing) {
      alert(`Veuillez renseigner l'attribut "${missing}" pour cette déclinaison.`);
      return;
    }

    const varId = `var-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const randCode = `6111${Math.floor(100000000 + Math.random() * 900000000)}`;
    const attrValuesStr = Object.values(newVarForm.attributes).join('-').toUpperCase();

    const newVariant: ProductVariant = {
      id: varId,
      sku: newVarForm.sku || `${formData.sku || 'SKU'}-${attrValuesStr}`,
      barcode: newVarForm.barcode || randCode,
      attributes: { ...newVarForm.attributes },
      costPrice: newVarForm.costPrice || formData.costPrice,
      sellingPrice: newVarForm.sellingPrice || formData.sellingPrice,
      stockQty: newVarForm.stockQty,
      minStockAlert: formData.minStockAlert,
    };

    const updatedVariants = [...formData.variants, newVariant];
    const totalVariantStock = updatedVariants.reduce((s, v) => s + v.stockQty, 0);

    setFormData(prev => ({
      ...prev,
      variants: updatedVariants,
      stockQty: totalVariantStock,
    }));

    // Reset new var form
    setNewVarForm({
      sku: '',
      barcode: '',
      attributes: {},
      costPrice: formData.costPrice,
      sellingPrice: formData.sellingPrice,
      stockQty: 10,
    });
  };

  const handleRemoveVariantItem = (varId: string) => {
    const updatedVariants = formData.variants.filter(v => v.id !== varId);
    const totalVariantStock = updatedVariants.reduce((s, v) => s + v.stockQty, 0);

    setFormData(prev => ({
      ...prev,
      variants: updatedVariants,
      stockQty: totalVariantStock,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const calculatedStock = formData.hasVariants && formData.variants.length > 0
      ? formData.variants.reduce((s, v) => s + v.stockQty, 0)
      : formData.stockQty;

    const payload: Product = {
      id: editingProd ? editingProd.id : `p-${Date.now()}`,
      name: formData.name,
      sku: formData.sku || `PROD-${Date.now().toString().slice(-4)}`,
      barcode: formData.barcode || `6111${Math.floor(100000000 + Math.random() * 900000000)}`,
      category: formData.category,
      unit: formData.unit,
      costPrice: Number(formData.costPrice),
      sellingPrice: Number(formData.sellingPrice),
      tvaRate: formData.tvaRate,
      stockQty: Number(calculatedStock),
      minStockAlert: Number(formData.minStockAlert),
      location: formData.location,
      hasVariants: formData.hasVariants,
      variantAttributes: formData.hasVariants ? formData.variantAttributes : undefined,
      variants: formData.hasVariants ? formData.variants : undefined,
    };

    if (editingProd) {
      updateProduct(payload);
    } else {
      addProduct(payload);
    }
    setIsAddModalOpen(false);
  };

  // Quick variant stock adjustment directly in table
  const handleAdjustVariantStock = (product: Product, variantId: string, delta: number) => {
    if (!product.variants) return;
    const updatedVariants = product.variants.map(v => {
      if (v.id === variantId) {
        return { ...v, stockQty: Math.max(0, v.stockQty + delta) };
      }
      return v;
    });

    const totalStock = updatedVariants.reduce((s, v) => s + v.stockQty, 0);

    updateProduct({
      ...product,
      stockQty: totalStock,
      variants: updatedVariants,
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-slate-900">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>Catalogue Produits & Variantes Stock</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestion centralisée des articles, déclinaisons (taille, couleur, poids), SKU et codes-barres.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold px-3.5 py-2.5 rounded transition-all"
          >
            <Camera className="w-4 h-4 text-emerald-600" />
            <span>Recherche Code-Barres</span>
          </button>
          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Produit</span>
          </button>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockCount > 0 && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded text-rose-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-medium">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>
              <b>Alerte Réapprovisionnement:</b> {lowStockCount} référence(s) sous le seuil d'alerte de stock.
            </span>
          </div>
        </div>
      )}

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher article, SKU, code-barres ou variante..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap transition-colors ${
              selectedCategory === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Toutes Catégories
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

      {/* Products Table with Expandable Variants Rows */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4">Produit / SKU</th>
                <th className="py-3 px-4">Code-Barres</th>
                <th className="py-3 px-4">Catégorie</th>
                <th className="py-3 px-4 text-right">Prix Achat HT</th>
                <th className="py-3 px-4 text-right">Prix Vente HT</th>
                <th className="py-3 px-4 text-center">TVA</th>
                <th className="py-3 px-4 text-center">Stock Total</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoadingInitialData ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="py-4 px-4 w-10">
                      <div className="h-4 bg-slate-200 rounded w-4"></div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 bg-slate-200 rounded w-40 mb-1"></div>
                      <div className="h-3 bg-slate-100 rounded w-20"></div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 bg-slate-200 rounded w-24"></div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 bg-slate-200 rounded w-16"></div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-4 bg-slate-200 rounded w-16 ml-auto"></div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-4 bg-slate-200 rounded w-16 ml-auto"></div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-4 bg-slate-200 rounded w-10 mx-auto"></div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-4 bg-slate-200 rounded w-12 mx-auto"></div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-8 bg-slate-200 rounded w-20 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">
                    Aucun produit ne correspond à votre recherche.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(prod => {
                  const isExpanded = expandedProductIds.includes(prod.id);
                  const hasVars = prod.hasVariants && prod.variants && prod.variants.length > 0;
                  const isLowStock = prod.stockQty <= prod.minStockAlert;

                  return (
                    <React.Fragment key={prod.id}>
                      {/* Main Product Row */}
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          {hasVars && (
                            <button
                              onClick={() => toggleExpand(prod.id)}
                              className="p-1 rounded hover:bg-slate-200 text-indigo-600 transition-colors"
                              title={isExpanded ? 'Réduire variantes' : 'Voir variantes'}
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          )}
                        </td>

                        <td className="py-3 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                <span>{prod.name}</span>
                                {hasVars && (
                                  <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Layers className="w-3 h-3" />
                                    {prod.variants!.length} Déclinaisons
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">SKU: {prod.sku}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                          <div className="flex items-center gap-1">
                            <Barcode className="w-3.5 h-3.5 text-slate-400" />
                            <span>{prod.barcode}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded text-[11px]">
                            {prod.category}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          {formatMad(prod.costPrice)}
                        </td>

                        <td className="py-3 px-4 text-right font-black font-mono text-indigo-600 text-sm">
                          {formatMad(prod.sellingPrice)}
                        </td>

                        <td className="py-3 px-4 text-center font-mono text-slate-600">
                          {prod.tvaRate}%
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-xs inline-block ${
                              isLowStock
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {prod.stockQty} {prod.unit}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openAddModal(prod)}
                              className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                              title="Modifier produit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Supprimer l'article ${prod.name} ?`)) {
                                  deleteProduct(prod.id);
                                }
                              }}
                              className="p-1.5 rounded hover:bg-rose-50 text-rose-600 transition-colors"
                              title="Supprimer produit"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Variants Sub-Table */}
                      {hasVars && isExpanded && (
                        <tr className="bg-indigo-50/30">
                          <td></td>
                          <td colSpan={8} className="p-3">
                            <div className="bg-white border border-indigo-100 rounded-lg p-3 space-y-2 shadow-2xs">
                              <div className="flex items-center justify-between text-xs font-bold text-indigo-900 border-b border-indigo-100 pb-2">
                                <span className="flex items-center gap-1.5">
                                  <Layers className="w-4 h-4 text-indigo-600" />
                                  Déclinaisons & Variantes de {prod.name}
                                </span>
                                <span className="text-[11px] text-slate-500 font-normal">
                                  Ajustement du stock directement par variante
                                </span>
                              </div>

                              <div className="grid grid-cols-1 divide-y divide-slate-100 text-xs">
                                {prod.variants!.map(v => {
                                  const attrStr = Object.entries(v.attributes)
                                    .map(([k, val]) => `${k}: ${val}`)
                                    .join(' • ');

                                  return (
                                    <div
                                      key={v.id}
                                      className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 px-2 rounded"
                                    >
                                      <div className="space-y-0.5">
                                        <div className="font-bold text-slate-900">{attrStr}</div>
                                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-3">
                                          <span>SKU: {v.sku}</span>
                                          <span>Code-Barres: {v.barcode}</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-4 text-right">
                                        <div className="font-mono text-slate-600 text-xs">
                                          Achat: <b>{formatMad(v.costPrice ?? prod.costPrice)}</b>
                                        </div>
                                        <div className="font-black font-mono text-indigo-600 text-xs">
                                          Vente: <b>{formatMad(v.sellingPrice)}</b>
                                        </div>

                                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded border border-slate-200">
                                          <button
                                            onClick={() => handleAdjustVariantStock(prod, v.id, -1)}
                                            className="w-5 h-5 bg-white border border-slate-300 rounded font-bold text-slate-700 hover:bg-slate-200 flex items-center justify-center text-xs"
                                          >
                                            -
                                          </button>
                                          <span className="font-mono font-bold px-2 text-xs text-slate-900">
                                            {v.stockQty}
                                          </span>
                                          <button
                                            onClick={() => handleAdjustVariantStock(prod, v.id, 1)}
                                            className="w-5 h-5 bg-white border border-slate-300 rounded font-bold text-slate-700 hover:bg-slate-200 flex items-center justify-center text-xs"
                                          >
                                            +
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal with Variants Builder */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl text-slate-900 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {editingProd ? 'Modifier le Produit' : 'Ajouter un Nouveau Produit'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Définissez le nom, le prix HT, la TVA et les déclinaisons (variantes)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
              
              {/* Product Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Désignation / Nom du Produit *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Thé Vert Sultan, T-Shirt Coton..."
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 font-medium text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">SKU / Référence</label>
                  <input
                    type="text"
                    placeholder="ex: THE-001"
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Code-Barres EAN-13</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="6111000000000"
                      value={formData.barcode}
                      onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 font-bold flex items-center gap-1"
                      title="Scanner avec la caméra"
                    >
                      <Camera className="w-4 h-4 text-indigo-600" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Catégorie</label>
                  <input
                    type="text"
                    placeholder="ex: Alimentation, Textile, Boissons"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Unité de Vente</label>
                  <select
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-600"
                  >
                    <option value="piece">Pièce (Unité)</option>
                    <option value="kg">Kilogramme (kg)</option>
                    <option value="liter">Litre (L)</option>
                    <option value="box">Boîte / Pack</option>
                    <option value="carton">Carton</option>
                    <option value="service">Prestation Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Prix d'Achat HT (PUMP MAD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Prix de Vente HT (MAD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.sellingPrice}
                    onChange={e => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 font-mono font-bold text-indigo-600 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Taux TVA Maroc (%)</label>
                  <select
                    value={formData.tvaRate}
                    onChange={e => setFormData({ ...formData, tvaRate: parseInt(e.target.value) as TvaRate })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                  >
                    <option value={20}>20% (Taux Normal - Électronique/Services)</option>
                    <option value={14}>14% (Transport, Café, Thé)</option>
                    <option value={10}>10% (Hôtellerie, Restauration, Banques)</option>
                    <option value={7}>7% (Eau, Sucre, Farine, Produits de base)</option>
                    <option value={0}>0% (Exonéré)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Seuil Alerte Stock Minimum</label>
                  <input
                    type="number"
                    value={formData.minStockAlert}
                    onChange={e => setFormData({ ...formData, minStockAlert: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Product Variants Toggle */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between bg-indigo-50/60 p-3 rounded border border-indigo-100">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-600" />
                    <div>
                      <div className="font-bold text-indigo-950 text-xs">Ce produit possède des déclinaisons (variantes)</div>
                      <div className="text-[11px] text-indigo-700">Taille, couleur, format, poids avec leurs propres prix et stocks</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.hasVariants}
                    onChange={e => setFormData({ ...formData, hasVariants: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                </div>

                {!formData.hasVariants ? (
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Quantité en Stock Unique</label>
                    <input
                      type="number"
                      value={formData.stockQty}
                      onChange={e => setFormData({ ...formData, stockQty: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                ) : (
                  /* Variants Builder Panel */
                  <div className="bg-slate-50 p-3.5 rounded border border-slate-200 space-y-4">
                    
                    {/* Attributes Definition */}
                    <div>
                      <label className="block font-bold text-slate-900 text-xs mb-1">
                        Attributs de déclinaison (ex: Taille, Couleur, Format)
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {formData.variantAttributes.map(attr => (
                          <span
                            key={attr}
                            className="bg-white border border-slate-300 text-slate-800 font-bold px-2.5 py-1 rounded-full text-[11px] flex items-center gap-1.5 shadow-2xs"
                          >
                            <span>{attr}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttribute(attr)}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Ajouter un attribut (ex: Pointure)"
                          value={newAttrInput}
                          onChange={e => setNewAttrInput(e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                        />
                        <button
                          type="button"
                          onClick={handleAddAttribute}
                          className="px-3 py-1.5 bg-slate-800 text-white font-bold rounded text-xs"
                        >
                          + Attribut
                        </button>
                      </div>
                    </div>

                    {/* Add New Variant Row */}
                    <div className="border-t border-slate-200 pt-3 space-y-2">
                      <div className="font-bold text-xs text-slate-900">
                        Ajouter une nouvelle variante :
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {formData.variantAttributes.map(attr => (
                          <div key={attr}>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase">{attr} *</label>
                            <input
                              type="text"
                              placeholder={`ex: ${attr === 'Taille' ? 'XL' : attr === 'Couleur' ? 'Noir' : 'Valeur'}`}
                              value={newVarForm.attributes[attr] || ''}
                              onChange={e =>
                                setNewVarForm({
                                  ...newVarForm,
                                  attributes: { ...newVarForm.attributes, [attr]: e.target.value },
                                })
                              }
                              className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                            />
                          </div>
                        ))}

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase">Code-Barres Variante</label>
                          <input
                            type="text"
                            placeholder="6111000..."
                            value={newVarForm.barcode}
                            onChange={e => setNewVarForm({ ...newVarForm, barcode: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded px-2 py-1 font-mono text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase">Prix Vente HT (MAD)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={newVarForm.sellingPrice}
                            onChange={e => setNewVarForm({ ...newVarForm, sellingPrice: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-white border border-slate-200 rounded px-2 py-1 font-mono text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase">Stock Initial</label>
                          <input
                            type="number"
                            value={newVarForm.stockQty}
                            onChange={e => setNewVarForm({ ...newVarForm, stockQty: parseInt(e.target.value) || 0 })}
                            className="w-full bg-white border border-slate-200 rounded px-2 py-1 font-mono text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddVariantItem}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs transition-colors flex items-center justify-center gap-1.5 mt-2"
                      >
                        <Plus className="w-4 h-4" /> Ajouter cette Variante
                      </button>
                    </div>

                    {/* Existing Variants List in Modal */}
                    {formData.variants.length > 0 && (
                      <div className="border-t border-slate-200 pt-3 space-y-1.5">
                        <div className="font-bold text-xs text-slate-900 flex justify-between">
                          <span>Variantes créées ({formData.variants.length}) :</span>
                          <span className="text-indigo-700 font-mono">
                            Stock total combiné: {formData.variants.reduce((s, v) => s + v.stockQty, 0)}
                          </span>
                        </div>

                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                          {formData.variants.map(v => {
                            const attrStr = Object.entries(v.attributes)
                              .map(([k, val]) => `${k}: ${val}`)
                              .join(' • ');

                            return (
                              <div
                                key={v.id}
                                className="bg-white p-2 rounded border border-slate-200 flex items-center justify-between text-xs"
                              >
                                <div>
                                  <div className="font-bold text-slate-900">{attrStr}</div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    Barcode: {v.barcode} • SKU: {v.sku}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="font-mono font-black text-indigo-600">
                                    {formatMad(v.sellingPrice)}
                                  </span>
                                  <span className="font-mono bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-bold">
                                    Stk: {v.stockQty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveVariantItem(v.id)}
                                    className="text-rose-500 hover:text-rose-700 p-1"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving && (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  <span>
                    {isSaving 
                      ? (editingProd ? 'Enregistrement...' : 'Création...') 
                      : (editingProd ? 'Enregistrer les Modifications' : 'Créer le Produit')}
                  </span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Barcode Scanner Modal for Search / Form Auto-fill */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        products={products}
        onItemScanned={(product, variant) => {
          setSearchTerm(variant ? variant.barcode : product.barcode);
          setIsScannerOpen(false);
        }}
      />

    </div>
  );
};
