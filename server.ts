import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini SDK with User-Agent header as required
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is missing. SahlBiz AI assistant will operate in simulation mode.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "dummy_key",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. Health check route
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "SahlBiz", environment: process.env.NODE_ENV || "development" });
});

// 2. AI Business Assistant Endpoint ("L'Mawoun" / الماعون)
app.post("/api/ai/assistant", async (req, res) => {
  try {
    const { prompt, language = "dar", contextData } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Fallback simulation if no API key provided in environment yet
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      const lowerPrompt = prompt.toLowerCase();
      let responseText = "";
      let suggestedAction = null;

      if (lowerPrompt.includes("kreddy") || lowerPrompt.includes("credit") || lowerPrompt.includes("youssef")) {
        responseText = "Salam! Youssef (Café Atlas) 3ndo 1,450 MAD f l'kreddy. Bghiti nsift lih rappel f WhatsApp daba?";
        suggestedAction = { type: "SEND_WHATSAPP", customerName: "Youssef El Amrani", amount: 1450 };
      } else if (lowerPrompt.includes("caisse") || lowerPrompt.includes("l'mbi'at") || lowerPrompt.includes("sales")) {
        responseText = "L'caisse dial l'yoam fiha 1,640 MAD f l'espèces + 450 MAD f l'Carte CMI. Total d l'mbi'at: 2,010 MAD.";
      } else if (lowerPrompt.includes("stock") || lowerPrompt.includes("the") || lowerPrompt.includes("sultan")) {
        responseText = "L'Thé Vert Sultan Al Kawtar bqat fih ghir 6 dyal les pièces f l'magasin (Alerte stock bas!). Bghiti tdir Bon de Commande l l'fournisseur?";
        suggestedAction = { type: "CREATE_PURCHASE_ORDER", item: "Thé Vert Sultan", qty: 20 };
      } else {
        responseText = `Salam! Anaa L'Mawoun, l'assistant dialk f SahlBiz. Qrit le message dialk: "${prompt}". Kifesh n'qder n'3awnk f l'kreddy, l'factures, stock, wla l'caisse?`;
      }

      return res.json({
        text: responseText,
        action: suggestedAction,
        simulated: true,
      });
    }

    const ai = getAiClient();
    const systemInstruction = `
You are "L'Mawoun" (الماعون), the intelligent Moroccan business assistant inside SahlBiz — the Moroccan-first operating system for small businesses (TPMEs).
You speak fluent Moroccan Darija (in Arabizi/Latin or Arabic script), French, Arabic, and English.

Rules:
1. Provide concise, friendly, practical advice for Moroccan business owners (e.g. hanouts, boutiques, cafes, artisans, wholesalers).
2. Answer queries regarding customer Kreddy balances, sales, stock, expenses, and Moroccan fiscal rules (ICE 15 digits, 20%/14%/10%/7% TVA, Droit de Timbre 0.25%, CNSS).
3. Current Context Data provided by app:
${JSON.stringify(contextData || {})}

4. Keep response under 3 sentences unless detailed breakdown requested. Always end with a helpful Darija phrase like "Khassk shi haja khoriya f l'mahal?" or "Shukran!".
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const outputText = response.text || "Semha lia, ma qdertsh n'fhem le message. A3wd m3aya mra khoriya!";

    return res.json({
      text: outputText,
      simulated: false,
    });
  } catch (error: any) {
    console.error("AI Assistant Endpoint Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error?.message || "Failed to process AI prompt",
    });
  }
});

// 3. AI Receipt OCR Scanner Endpoint
app.post("/api/ai/ocr", async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Image base64 data required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      // Return simulated OCR extraction
      return res.json({
        title: "Facture Carburant Afriquia",
        category: "transport",
        supplierName: "Station Afriquia Casablanca",
        supplierIce: "001829381000019",
        amountHt: 350.0,
        tvaRate: 14,
        tvaAmount: 49.0,
        amountTtc: 399.0,
        simulated: true,
      });
    }

    const ai = getAiClient();
    const imagePart = {
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
      },
    };

    const promptText = `
Analyze this receipt image from Morocco. Extract the following JSON object:
{
  "title": "Short title describing receipt",
  "category": "loyer" | "salaires" | "matieres" | "transport" | "electricite" | "impots" | "entretiens" | "divers",
  "supplierName": "Name of vendor/supplier if present",
  "supplierIce": "15 digit ICE if present",
  "amountHt": number (amount without tax in MAD),
  "tvaRate": 20 | 14 | 10 | 7 | 0,
  "tvaAmount": number (TVA amount in MAD),
  "amountTtc": number (Total TTC in MAD)
}
Return strictly valid JSON only.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: { parts: [imagePart, { text: promptText }] },
      config: {
        responseMimeType: "application/json",
      },
    });

    const jsonStr = response.text || "{}";
    const parsed = JSON.parse(jsonStr);

    return res.json(parsed);
  } catch (error: any) {
    console.error("OCR Endpoint Error:", error);
    return res.status(500).json({
      error: "Failed to scan receipt",
      details: error?.message,
    });
  }
});

// 4. Background Sync Endpoint for Offline PWA Sales & Inventory
app.post("/api/sync", async (req, res) => {
  try {
    const { sales = [], inventoryUpdates = [] } = req.body;

    console.log(`[Sync] Processing ${sales.length} offline sales and ${inventoryUpdates.length} inventory updates.`);

    // In a production backend with database (e.g. Postgres / Firestore),
    // this would persist batch documents and adjust inventory levels atomically.
    
    return res.json({
      success: true,
      syncedSalesCount: sales.length,
      syncedInventoryCount: inventoryUpdates.length,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Sync Endpoint Error:", error);
    return res.status(500).json({ error: "Failed to sync offline data" });
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SahlBiz Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
