import { Router, type IRouter } from "express";
import { z } from "zod";
import { AnalyzeIssueBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Configurable model name via environment variable
const AI_MODEL = process.env["OPENAI_MODEL"] || "gpt-4o-mini";

// Input validation for technician-brief endpoint
const TechnicianBriefBody = z.object({
  issueDescription: z.string().min(10).max(5000),
  categoryName: z.string().min(1).max(200),
  customerName: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
});

const ANALYZE_LANGUAGE_PROMPT = `You are QUANTEX AI, an expert technical support analyzer. Analyze the user's technical issue and respond ONLY with valid JSON.

CRITICAL LANGUAGE RULE — READ CAREFULLY:
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

const BRIEF_LANGUAGE_PROMPT = `You are QUANTEX AI assisting a field technician. Based on the job details, generate a pre-arrival brief. Respond ONLY with valid JSON.

CRITICAL LANGUAGE RULE — READ CAREFULLY:
1. Detect the language of the incoming issueDescription field.
2. ALL descriptive text fields (issueSummary, suggestedParts, safetyRecommendations, estimatedDuration, toolsNeeded, customerTips) MUST be written in the EXACT SAME language as the issueDescription.
3. If the issueDescription is in English → respond entirely in English.
4. If the issueDescription is in Spanish → respond entirely in Spanish.
5. If the issueDescription is in Hindi (Devanagari script) → respond entirely in Hindi.
6. If the issueDescription is in Gujarati (Gujarati script) → respond entirely in Gujarati.
7. If the issueDescription is mixed Hinglish → respond in the same Hinglish style.
8. If the input language is ambiguous, default to English.
9. NEVER switch languages mid-response.
10. Keep ALL JSON keys in English always.
11. difficultyLevel must always remain one of the fixed English values: "Easy" | "Moderate" | "Complex" | "Advanced".

{
  "issueSummary": "concise 2-3 sentence technical summary of what to expect",
  "suggestedParts": ["part1", "part2"] (2-4 likely parts/components needed),
  "safetyRecommendations": ["safety tip 1", "safety tip 2"] (2-3 relevant safety precautions),
  "estimatedDuration": "e.g. 45-90 minutes",
  "toolsNeeded": ["tool1", "tool2"] (3-5 tools/equipment to bring),
  "difficultyLevel": "Easy | Moderate | Complex | Advanced",
  "customerTips": "brief tip on how to interact with the customer or manage expectations"
}
No markdown. Only JSON.`;

router.post("/ai/analyze-issue", async (req, res): Promise<void> => {
  const body = AnalyzeIssueBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  try {
    const userContent: any[] = [
      { type: "text", text: body.data.description },
    ];

    if (body.data.imageBase64) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${body.data.imageBase64}` },
      });
    }

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      max_completion_tokens: 1024,
      messages: [
        {
          role: "system",
          content: ANALYZE_LANGUAGE_PROMPT,
        },
        {
          role: "user",
          content: body.data.imageBase64 ? userContent : body.data.description,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";

    let result;
    try {
      result = JSON.parse(content);
    } catch {
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

    res.json(result);
  } catch (err) {
    logger.error({ err }, "AI analysis failed");
    res.status(500).json({ error: "AI analysis failed" });
  }
});

router.post("/ai/technician-brief", async (req, res): Promise<void> => {
  const parsed = TechnicianBriefBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { issueDescription, categoryName, customerName, address } = parsed.data;

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      max_completion_tokens: 800,
      messages: [
        {
          role: "system",
          content: BRIEF_LANGUAGE_PROMPT,
        },
        {
          role: "user",
          content: `Service: ${categoryName}\nIssue: ${issueDescription}\nCustomer: ${customerName ?? "Unknown"}\nAddress: ${address ?? "Not provided"}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      result = {
        issueSummary: "Review the customer's issue description and prepare standard diagnostic tools.",
        suggestedParts: ["Replacement components for category", "Diagnostic tools"],
        safetyRecommendations: ["Wear protective gloves", "Disconnect power before inspection"],
        estimatedDuration: "60-90 minutes",
        toolsNeeded: ["Multimeter", "Screwdriver set", "Diagnostic software"],
        difficultyLevel: "Moderate",
        customerTips: "Explain each step clearly and set realistic expectations.",
      };
    }

    res.json(result);
  } catch (err) {
    logger.error({ err }, "Technician brief generation failed");
    res.status(500).json({ error: "AI brief generation failed" });
  }
});

export default router;
