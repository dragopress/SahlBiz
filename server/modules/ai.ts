import express from "express";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { validateRequest } from "../middleware/validation";

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
  image: z.string().optional(),
  imageBase64: z.string().optional(),
  mimeType: z.string().optional().default("image/jpeg")
}).refine(data => !!(data.image || data.imageBase64), {
  message: "Either 'image' or 'imageBase64' containing raw base64 data is required",
  path: ["image"]
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

    try {
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
    } catch (apiError: any) {
      console.warn("Gemini API call failed, falling back to simulated engine:", apiError);
      
      const lowerPrompt = prompt.toLowerCase();
      let responseText = "";
      let suggestedAction = null;

      if (lowerPrompt.includes("kreddy") || lowerPrompt.includes("credit") || lowerPrompt.includes("youssef")) {
        responseText = "Salam! Youssef (Café Atlas) 3ndo 1,450 MAD f l'kreddy. Bghiti nsift lih rappel f WhatsApp daba? (Service l'Mawoun hors-ligne temporaire)";
        suggestedAction = {
          action: "SEND_WHATSAPP",
          arguments: { customerName: "Youssef El Amrani", amount: 1450, phone: "212600000000" },
          requiresConfirmation: true
        };
      } else if (lowerPrompt.includes("caisse") || lowerPrompt.includes("l'mbi'at") || lowerPrompt.includes("sales")) {
        responseText = "L'caisse dial l'yoam fiha 1,640 MAD f l'espèces + 450 MAD f l'Carte CMI. Total d l'mbi'at: 2,010 MAD. (Service l'Mawoun hors-ligne temporaire)";
      } else if (lowerPrompt.includes("stock") || lowerPrompt.includes("the") || lowerPrompt.includes("sultan")) {
        responseText = "L'Thé Vert Sultan Al Kawtar bqat fih ghir 6 dyal les pièces f l'magasin (Alerte stock bas!). Bghiti tdir Bon de Commande l l'fournisseur? (Service l'Mawoun hors-ligne temporaire)";
        suggestedAction = {
          action: "CREATE_PURCHASE_ORDER",
          arguments: { item: "Thé Vert Sultan", qty: 20 },
          requiresConfirmation: true
        };
      } else {
        responseText = `Salam! Anaa L'Mawoun, l'assistant dialk f SahlBiz (Mode hors-ligne). Qrit le message dialk: "${prompt}". Kifesh n'qder n'3awnk f l'kreddy, l'factures, stock, wla l'caisse?`;
      }

      return {
        response: responseText,
        action: suggestedAction,
        simulated: true,
        userContext
      };
    }
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

    try {
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
    } catch (apiError: any) {
      console.warn("Gemini OCR API call failed, falling back to simulated OCR engine:", apiError);
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
  }
}

// Routes
aiRouter.post("/assistant", validateRequest({
  body: assistantSchema
}), async (req: any, res) => {
  try {
    const { prompt, contextData } = req.body;
    const userContext = {
      userEmail: req.user?.email || "unknown@sahlbiz.ma",
      orgId: req.user?.orgId || "org_unknown",
      role: req.user?.role || "owner"
    };

    const result = await AIService.processAssistantPrompt(prompt, userContext, contextData);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: "AI_ERROR",
        message: error.message,
        requestId: `req_${Math.random().toString(36).substring(2, 11)}`
      }
    });
  }
});

aiRouter.post("/ocr", validateRequest({
  body: ocrSchema,
  businessConstraints: (req: any) => {
    const rawImage = req.body.image || req.body.imageBase64 || "";
    // Size constraints: Max 12MB raw string
    if (rawImage.length > 12 * 1024 * 1024) {
      return "PAYLOAD_TOO_LARGE: Uploaded image exceeds the maximum supported size constraint of 10MB.";
    }

    const mimeType = req.body.mimeType || "image/jpeg";
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
      return `UNSUPPORTED_MEDIA_TYPE: Supported formats are jpeg, png, webp, gif, and pdf. Found: ${mimeType}`;
    }

    return null;
  }
}), async (req: any, res) => {
  try {
    const image = req.body.image || req.body.imageBase64 || "";
    const mimeType = req.body.mimeType || "image/jpeg";

    const result = await AIService.processReceiptOcr(image, mimeType);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: "OCR_ERROR",
        message: error.message,
        requestId: `req_${Math.random().toString(36).substring(2, 11)}`
      }
    });
  }
});
