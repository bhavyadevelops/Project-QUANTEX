import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Response as FetchResponse } from "undici-types";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const ANALYZE_LANGUAGE_PROMPT = `You are QUANTEX AI, an expert technical support analyzer. Analyze the user's technical issue and respond ONLY with valid JSON.

CRITICAL LANGUAGE RULE:
1. Detect the language of the user's input text.
2. ALL descriptive text fields in your response (category, summary, troubleshootingSteps, technicianType, safetyPrecautions, estimatedDuration) MUST be written in the EXACT SAME language as the user's input.
3. If the user writes in English → respond entirely in English.
4. If the user writes in Spanish → respond entirely in Spanish.
5. If the user writes in Hindi (Devanagari script) → respond entirely in Hindi.
6. If the user writes in Gujarati (Gujarati script) → respond entirely in Gujarati.
7. If the user writes in mixed Hinglish (Hindi words in Roman script mixed with English) → respond in the same Hinglish style.
8. If the user explicitly requests a different language (e.g. "respond in Spanish"), follow that instruction.
9. If the input language is ambiguous or unclear, default to English.
10. NEVER switch languages mid-response. NEVER mix languages unnecessarily.
11. Keep ALL JSON keys in English always.
12. emergencyType must always be one of the fixed English values: "Electrical Hazard" | "Gas Leakage" | "Fire Hazard" | "Water Damage" | "Short Circuit" | "Smoke Detected" — never translate it.

{
  "category": "service category (e.g. PC/Laptop Repair, WiFi/Network, Device Setup, Software Issues, Appliance Installation, Smart Device Setup, Assembly & Installation)",
  "urgency": "low | medium | high | critical",
  "severity": "low | medium | high | critical",
  "confidence": 0-100 (integer, how confident you are in this diagnosis),
  "troubleshootingSteps": ["step1", "step2", "step3"],
  "technicianType": "type of technician needed",
  "summary": "1-2 sentence summary of issue and recommended action",
  "suggestedCategoryId": 1-7 (1=PC/Laptop, 2=WiFi/Network, 3=Device Setup, 4=Software, 5=Appliance, 6=Smart Device, 7=Assembly) or null,
  "estimatedCostMin": minimum repair cost in USD (number) or null,
  "estimatedCostMax": maximum repair cost in USD (number) or null,
  "estimatedDuration": "e.g. 30-60 minutes" or null,
  "safetyPrecautions": ["precaution1", "precaution2"] (safety steps user should take immediately),
  "requiresTechnician": true | false,
  "isEmergency": true | false (true ONLY if: electrical sparks, gas leakage, fire hazard, water pipe burst, short circuit, smoke detection),
  "emergencyType": "Electrical Hazard | Gas Leakage | Fire Hazard | Water Damage | Short Circuit | Smoke Detected" or null
}
No markdown. No extra text. Only JSON.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "AI service not configured" });
  }

  const { description, imageBase64 } = req.body ?? {};
  if (!description || typeof description !== "string" || description.length < 10) {
    return res.status(400).json({ error: "description must be a string with at least 10 characters" });
  }

  // Build messages — image input not supported by Groq, text only
  const messages = [
    { role: "system", content: ANALYZE_LANGUAGE_PROMPT },
    { role: "user", content: description },
  ];

  try {
    const response: FetchResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Groq API error:", response.status, errBody);
      return res.status(502).json({ error: "AI service temporarily unavailable" });
    }

    const data: any = await response.json();
    const content: string = data.choices?.[0]?.message?.content ?? "{}";

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      // Fallback if AI returns non-JSON
      result = {
        category: "General Technical Support",
        urgency: "medium",
        severity: "medium",
        confidence: 70,
        troubleshootingSteps: ["Restart the affected device", "Check all cable connections", "Update drivers/software if applicable"],
        technicianType: "General Technician",
        summary: "A technician can help diagnose and resolve this issue.",
        suggestedCategoryId: null,
        estimatedCostMin: null,
        estimatedCostMax: null,
        estimatedDuration: null,
        safetyPrecautions: [],
        requiresTechnician: true,
        isEmergency: false,
        emergencyType: null,
      };
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("AI analysis failed:", err);
    return res.status(500).json({ error: "AI analysis failed" });
  }
}
