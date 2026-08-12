import express from "express";
import { z } from "zod";
import { Product, Supplier } from "../types";
import { validateRequest } from "../middleware/validation";
import { requireIdempotency } from "../middleware/idempotency";

export const catalogRouter = express.Router();

// Product & Purchase Zod Schemas
const productSchema = z.object({
  name: z.string().min(1, "Product name is required").max(150),
  sku: z.string().max(50),
  barcode: z.string().max(50).optional(),
  category: z.string().max(50).optional().default("general"),
  unit: z.enum(["piece", "kg", "liter", "box", "carton", "service"]),
  costPrice: z.number().nonnegative("Cost price cannot be negative"),
  sellingPrice: z.number().nonnegative("Selling price cannot be negative"),
  tvaRate: z.union([z.literal(20), z.literal(14), z.literal(10), z.literal(7), z.literal(0)]),
  stockQty: z.number().default(0),
  minStockAlert: z.number().default(5),
  location: z.enum(["magasin", "depot", "all"]).default("magasin")
});

const stockAdjustSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  delta: z.number()
});

const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  phone: z.string().max(30),
  category: z.string().max(50).optional().default("General"),
  outstandingDebt: z.number().default(0)
});

const purchaseReceiveSchema = z.object({
  supplierId: z.string().min(1, "Supplier ID is required"),
  items: z.array(z.object({
    productId: z.string().min(1, "Product ID is required"),
    quantity: z.number().positive("Quantity must be positive"),
    purchasePrice: z.number().nonnegative("Purchase price cannot be negative")
  })).min(1, "At least one item must be received")
});

// Catalog & Inventory Service Boundary
export class CatalogService {
  private static products: Map<string, Product[]> = new Map();
  private static suppliers: Map<string, Supplier[]> = new Map();
  private static receivedPurchases: Map<string, any[]> = new Map();

  static async getProducts(orgId: string): Promise<Product[]> {
    if (!this.products.has(orgId)) {
      // Seed default Moroccan inventory items
      this.products.set(orgId, [
        { id: "prod_1", name: "Thé Vert Sultan Al Kawtar", sku: "SUL-001", barcode: "6111242312019", category: "Épicerie", unit: "piece", costPrice: 12.5, sellingPrice: 16.0, tvaRate: 14, stockQty: 6, minStockAlert: 10, location: "magasin", orgId },
        { id: "prod_2", name: "Huile Lesieur 1L", sku: "LES-001", barcode: "6111242314051", category: "Huiles", unit: "piece", costPrice: 18.0, sellingPrice: 21.5, tvaRate: 7, stockQty: 45, minStockAlert: 5, location: "magasin", orgId }
      ]);
    }
    return this.products.get(orgId) || [];
  }

  static async createProduct(orgId: string, data: Partial<Product>): Promise<Product> {
    const list = await this.getProducts(orgId);
    const newProduct: Product = {
      id: `prod_${Math.random().toString(36).substring(2, 9)}`,
      name: data.name || "Product",
      sku: data.sku || `SKU-${Date.now().toString().slice(-4)}`,
      barcode: data.barcode || "",
      category: data.category || "General",
      unit: data.unit || "piece",
      costPrice: data.costPrice || 0,
      sellingPrice: data.sellingPrice || 0,
      tvaRate: data.tvaRate || 20,
      stockQty: data.stockQty || 0,
      minStockAlert: data.minStockAlert || 5,
      location: data.location || "magasin",
      orgId
    };
    list.push(newProduct);
    this.products.set(orgId, list);
    return newProduct;
  }

  static async adjustStock(orgId: string, productId: string, delta: number): Promise<Product | null> {
    const list = await this.getProducts(orgId);
    const product = list.find(p => p.id === productId);
    if (product) {
      product.stockQty += delta;
      this.products.set(orgId, list);
      return product;
    }
    return null;
  }

  static async getSuppliers(orgId: string): Promise<Supplier[]> {
    if (!this.suppliers.has(orgId)) {
      this.suppliers.set(orgId, [
        { id: "supp_1", name: "Centrale Danone S.A.", phone: "+212522400000", category: "Laitages", outstandingDebt: 4500, orgId },
        { id: "supp_2", name: "Cosumar Casablanca", phone: "+212522678100", category: "Sucre", outstandingDebt: 0, orgId }
      ]);
    }
    return this.suppliers.get(orgId) || [];
  }

  static async createSupplier(orgId: string, data: Partial<Supplier>): Promise<Supplier> {
    const list = await this.getSuppliers(orgId);
    const newSupplier: Supplier = {
      id: `supp_${Math.random().toString(36).substring(2, 9)}`,
      name: data.name || "Supplier",
      phone: data.phone || "",
      category: data.category || "General",
      outstandingDebt: data.outstandingDebt || 0,
      orgId
    };
    list.push(newSupplier);
    this.suppliers.set(orgId, list);
    return newSupplier;
  }

  static async receivePurchase(orgId: string, data: any): Promise<any> {
    const products = await this.getProducts(orgId);
    const suppliers = await this.getSuppliers(orgId);
    
    const supplier = suppliers.find(s => s.id === data.supplierId);
    if (!supplier) {
      throw new Error("SUPPLIER_NOT_FOUND");
    }

    let totalAmount = 0;
    const receivedItems = [];

    for (const item of data.items) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        // Increase stock based on purchase receiving
        product.stockQty += item.quantity;
        // Adjust product unit cost based on new purchase if applicable
        product.costPrice = item.purchasePrice;
        
        totalAmount += item.quantity * item.purchasePrice;
        receivedItems.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice
        });
      }
    }

    // Increase supplier's outstanding debt
    supplier.outstandingDebt += totalAmount;

    const receipt = {
      id: `rec_${Math.random().toString(36).substring(2, 9)}`,
      date: new Date().toISOString(),
      supplierId: supplier.id,
      supplierName: supplier.name,
      items: receivedItems,
      totalAmount,
      orgId
    };

    if (!this.receivedPurchases.has(orgId)) {
      this.receivedPurchases.set(orgId, []);
    }
    this.receivedPurchases.get(orgId)?.push(receipt);

    return receipt;
  }

  static async getReceivedPurchases(orgId: string): Promise<any[]> {
    return this.receivedPurchases.get(orgId) || [];
  }
}

// Routes
catalogRouter.get("/products", validateRequest({}), async (req: any, res) => {
  const products = await CatalogService.getProducts(req.user.orgId);
  return res.json({ success: true, data: products });
});

catalogRouter.post("/products", validateRequest({
  body: productSchema,
  businessConstraints: (req: any) => {
    const { sellingPrice, costPrice } = req.body;
    if (sellingPrice < costPrice) {
      return `MARGIN_VIOLATION: Product selling price (${sellingPrice} MAD) must be greater than or equal to its unit cost price (${costPrice} MAD).`;
    }
    return null;
  }
}), async (req: any, res) => {
  const product = await CatalogService.createProduct(req.user.orgId, req.body);
  return res.status(201).json({ success: true, data: product });
});

catalogRouter.post("/inventory/adjust", requireIdempotency(), validateRequest({
  body: stockAdjustSchema
}), async (req: any, res) => {
  const { productId, delta } = req.body;
  const product = await CatalogService.adjustStock(req.user.orgId, productId, delta);
  if (!product) {
    return res.status(404).json({
      success: false,
      error: {
        code: "PRODUCT_NOT_FOUND",
        message: `Product with ID ${productId} does not exist in your tenant portfolio.`,
        requestId: `req_${Math.random().toString(36).substring(2, 11)}`
      }
    });
  }
  return res.json({ success: true, data: product });
});

catalogRouter.get("/suppliers", validateRequest({}), async (req: any, res) => {
  const suppliers = await CatalogService.getSuppliers(req.user.orgId);
  return res.json({ success: true, data: suppliers });
});

catalogRouter.post("/suppliers", validateRequest({
  body: supplierSchema
}), async (req: any, res) => {
  const supplier = await CatalogService.createSupplier(req.user.orgId, req.body);
  return res.status(201).json({ success: true, data: supplier });
});

catalogRouter.get("/purchases", validateRequest({}), async (req: any, res) => {
  const receipts = await CatalogService.getReceivedPurchases(req.user.orgId);
  return res.json({ success: true, data: receipts });
});

catalogRouter.post("/purchases/receive", requireIdempotency(), validateRequest({
  body: purchaseReceiveSchema
}), async (req: any, res) => {
  try {
    const receipt = await CatalogService.receivePurchase(req.user.orgId, req.body);
    return res.status(201).json({ success: true, data: receipt });
  } catch (error: any) {
    if (error.message === "SUPPLIER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "The specified supplier was not found.",
          requestId: `req_${Math.random().toString(36).substring(2, 11)}`
        }
      });
    }
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An error occurred during purchase receiving.",
        requestId: `req_${Math.random().toString(36).substring(2, 11)}`
      }
    });
  }
});
