/// <reference types="node" />
import type { VercelRequest, VercelResponse } from "@vercel/node";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const BRIEF_LANGUAGE_PROMPT = `You are QUANTEX AI assisting a field technician. Based on the job details, generate a pre-arrival brief. Respond ONLY with valid JSON.

CRITICAL LANGUAGE RULE:
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "AI service not configured" });
  }

  const { issueDescription, categoryName, customerName, address } = req.body ?? {};
  if (!issueDescription || typeof issueDescription !== "string" || issueDescription.length < 10) {
    return res.status(400).json({ error: "issueDescription must be a string with at least 10 characters" });
  }
  if (!categoryName || typeof categoryName !== "string") {
    return res.status(400).json({ error: "categoryName is required" });
  }

  const messages = [
    { role: "system", content: BRIEF_LANGUAGE_PROMPT },
    {
      role: "user",
      content: `Service: ${categoryName}\nIssue: ${issueDescription}\nCustomer: ${customerName ?? "Unknown"}\nAddress: ${address ?? "Not provided"}`,
    },
  ];

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        max_tokens: 800,
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

    return res.status(200).json(result);
  } catch (err) {
    console.error("Technician brief generation failed:", err);
    return res.status(500).json({ error: "AI brief generation failed" });
  }
}
