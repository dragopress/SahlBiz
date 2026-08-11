import express from "express";
import { z } from "zod";
import { Product, Supplier, Purchase } from "../types";

export const catalogRouter = express.Router();

// Product & Purchase Zod Schemas
const productSchema = z.object({
  name: z.string().min(1).max(150),
  sku: z.string().max(50),
  barcode: z.string().max(50).optional(),
  category: z.string().max(50).optional().default("general"),
  unit: z.enum(["piece", "kg", "liter", "box", "carton", "service"]),
  costPrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  tvaRate: z.union([z.literal(20), z.literal(14), z.literal(10), z.literal(7), z.literal(0)]),
  stockQty: z.number().default(0),
  minStockAlert: z.number().default(5),
  location: z.enum(["magasin", "depot", "all"]).default("magasin")
});

const stockAdjustSchema = z.object({
  productId: z.string().min(1),
  delta: z.number()
});

const supplierSchema = z.object({
  name: z.string().min(1),
  phone: z.string().max(30),
  category: z.string().max(50).optional().default("General"),
  outstandingDebt: z.number().default(0)
});

// Catalog & Inventory Service Boundary
export class CatalogService {
  private static products: Map<string, Product[]> = new Map();
  private static suppliers: Map<string, Supplier[]> = new Map();
  private static purchases: Map<string, Purchase[]> = new Map();

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
}

// Routes
catalogRouter.get("/products", async (req: any, res) => {
  const products = await CatalogService.getProducts(req.user.orgId);
  res.json({ success: true, data: products });
});

catalogRouter.post("/products", async (req: any, res) => {
  const parseResult = productSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, details: parseResult.error.format() });
  }

  const product = await CatalogService.createProduct(req.user.orgId, parseResult.data);
  res.status(201).json({ success: true, data: product });
});

catalogRouter.post("/inventory/adjust", async (req: any, res) => {
  const parseResult = stockAdjustSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, details: parseResult.error.format() });
  }

  const { productId, delta } = parseResult.data;
  const product = await CatalogService.adjustStock(req.user.orgId, productId, delta);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found." });
  }
  res.json({ success: true, data: product });
});

catalogRouter.get("/suppliers", async (req: any, res) => {
  const suppliers = await CatalogService.getSuppliers(req.user.orgId);
  res.json({ success: true, data: suppliers });
});

catalogRouter.post("/suppliers", async (req: any, res) => {
  const parseResult = supplierSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, details: parseResult.error.format() });
  }

  const supplier = await CatalogService.createSupplier(req.user.orgId, parseResult.data);
  res.status(201).json({ success: true, data: supplier });
});
