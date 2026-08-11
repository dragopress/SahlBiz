import express from "express";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

export const aiRouter = express.Router();

// Initialize Gemini Client
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
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

// Zod schemas
const assistantSchema = z.object({
  prompt: z.string().min(1, "Prompt cannot be empty"),
  language: z.enum(["dar", "fr", "ar", "en"]).optional().default("dar"),
  contextData: z.object({
    businessName: z.string().optional(),
    expectedCash: z.number().optional(),
    kreddyTotal: z.number().optional(),
    lowStockCount: z.number().optional(),
    invoicesCount: z.number().optional(),
  }).optional()
});

const ocrSchema = z.object({
  image: z.string().min(1, "Image base64 data is required"),
  mimeType: z.string().optional().default("image/jpeg")
});

// AI Service Boundary
export class AIService {
  static async processAssistantPrompt(prompt: string, userContext: any, contextData: any): Promise<any> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "dummy_key") {
      const lowerPrompt = prompt.toLowerCase();
      let responseText = "";
      let suggestedAction = null;

      if (lowerPrompt.includes("kreddy") || lowerPrompt.includes("credit") || lowerPrompt.includes("youssef")) {
        responseText = "Salam! Youssef (Café Atlas) 3ndo 1,450 MAD f l'kreddy. Bghiti nsift lih rappel f WhatsApp daba?";
        suggestedAction = {
          action: "SEND_WHATSAPP",
          arguments: { customerName: "Youssef El Amrani", amount: 1450, phone: "212600000000" },
          requiresConfirmation: true
        };
      } else if (lowerPrompt.includes("caisse") || lowerPrompt.includes("l'mbi'at") || lowerPrompt.includes("sales")) {
        responseText = "L'caisse dial l'yoam fiha 1,640 MAD f l'espèces + 450 MAD f l'Carte CMI. Total d l'mbi'at: 2,010 MAD.";
      } else if (lowerPrompt.includes("stock") || lowerPrompt.includes("the") || lowerPrompt.includes("sultan")) {
        responseText = "L'Thé Vert Sultan Al Kawtar bqat fih ghir 6 dyal les pièces f l'magasin (Alerte stock bas!). Bghiti tdir Bon de Commande l l'fournisseur?";
        suggestedAction = {
          action: "CREATE_PURCHASE_ORDER",
          arguments: { item: "Thé Vert Sultan", qty: 20 },
          requiresConfirmation: true
        };
      } else {
        responseText = `Salam! Anaa L'Mawoun, l'assistant dialk f SahlBiz. Qrit le message dialk: "${prompt}". Kifesh n'qder n'3awnk f l'kreddy, l'factures, stock, wla l'caisse?`;
      }

      return {
        response: responseText,
        action: suggestedAction,
        simulated: true,
        userContext
      };
    }

    const ai = getAiClient();
    const systemInstruction = `
You are "L'Mawoun" (الماعون), the intelligent Moroccan business assistant inside SahlBiz — the Moroccan-first operating system for small businesses (TPMEs).
You speak fluent Moroccan Darija (in Arabizi/Latin or Arabic script), French, Arabic, and English.

Rules:
1. Provide concise, friendly, practical advice for Moroccan business owners.
2. Answer queries regarding customer Kreddy balances, sales, stock, expenses, and Moroccan fiscal rules.
3. Current Context Data: ${JSON.stringify(contextData || {})}
Authorized User Email: ${userContext.userEmail}
Tenant OrgId: ${userContext.orgId}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return {
      response: response.text || "Semha lia, ma qdertsh n'fhem le message. A3wd m3aya mra khoriya!",
      simulated: false,
      userContext
    };
  }

  static async processReceiptOcr(imageBase64: string, mimeType: string): Promise<any> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "dummy_key") {
      return {
        data: {
          vendorName: "Station Afriquia Casablanca",
          vendorIce: "001829381000019",
          amountHt: 350.0,
          tvaRate: 14,
          tvaAmount: 49.0,
          amountTtc: 399.0
        },
        simulated: true
      };
    }

    const ai = getAiClient();
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
      },
    };

    const promptText = `
Analyze this receipt image from Morocco. Extract the following JSON object:
{
  "vendorName": "Name of vendor/supplier if present, otherwise default PAPETERIE",
  "vendorIce": "15 digit ICE if present, or null",
  "amountHt": number (amount without tax in MAD),
  "tvaRate": 20 | 14 | 10 | 7 | 0,
  "tvaAmount": number (TVA amount in MAD),
  "amountTtc": number (Total TTC in MAD)
}
Return strictly valid JSON only.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, { text: promptText }] },
      config: {
        responseMimeType: "application/json",
      },
    });

    const jsonStr = response.text || "{}";
    const parsed = JSON.parse(jsonStr);
    return {
      data: parsed,
      simulated: false
    };
  }
}

// Routes
aiRouter.post("/assistant", async (req: any, res) => {
  try {
    const parseResult = assistantSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: "VALIDATION_ERROR", details: parseResult.error.format() });
    }

    const { prompt, contextData } = parseResult.data;
    const userContext = {
      userEmail: req.user?.email || "unknown@sahlbiz.ma",
      orgId: req.user?.orgId || "org_unknown",
      role: req.user?.role || "owner"
    };

    const result = await AIService.processAssistantPrompt(prompt, userContext, contextData);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "AI_ERROR", message: error.message });
  }
});

aiRouter.post("/ocr", async (req: any, res) => {
  try {
    const normalizedBody = {
      image: req.body.image || req.body.imageBase64,
      mimeType: req.body.mimeType || "image/jpeg"
    };

    const parseResult = ocrSchema.safeParse(normalizedBody);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: "VALIDATION_ERROR", details: parseResult.error.format() });
    }

    const { image, mimeType } = parseResult.data;

    // MIME Validation
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
      return res.status(400).json({ success: false, error: "VALIDATION_ERROR", message: `Unsupported MIME type: ${mimeType}` });
    }

    // Size limit
    if (image.length > 14 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: "VALIDATION_ERROR", message: "File size exceeds limit of 10MB" });
    }

    const result = await AIService.processReceiptOcr(image, mimeType);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "OCR_ERROR", message: error.message });
  }
});
