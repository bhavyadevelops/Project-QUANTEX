import { Router, type IRouter } from "express";
import { AnalyzeIssueBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/ai/analyze-issue", async (req, res): Promise<void> => {
  const body = AnalyzeIssueBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 1024,
      messages: [
        {
          role: "system",
          content: `You are QUANTEX AI, an expert technical support analyzer. Analyze the user's technical issue and respond with a JSON object containing:
- category: the service category (e.g., "PC/Laptop Repair", "WiFi/Network", "Device Setup", "Software Issues", "Appliance Installation", "Smart Device Setup", "Assembly & Installation")
- urgency: one of "low", "medium", "high"
- troubleshootingSteps: array of 2-4 actionable quick-fix steps the user can try themselves
- technicianType: the type of technician needed (e.g., "Network Specialist", "Hardware Technician", "Software Engineer")
- summary: a brief 1-2 sentence summary of the issue and recommended action
- suggestedCategoryId: a number 1-7 mapping to the category above (1=PC/Laptop, 2=WiFi/Network, 3=Device Setup, 4=Software, 5=Appliance, 6=Smart Device, 7=Assembly)

Respond ONLY with valid JSON, no markdown.`,
        },
        {
          role: "user",
          content: body.data.description,
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
        troubleshootingSteps: ["Restart the affected device", "Check all cable connections", "Update drivers/software if applicable"],
        technicianType: "General Technician",
        summary: "A technician can help diagnose and resolve this issue.",
        suggestedCategoryId: null,
      };
    }

    res.json(result);
  } catch (err) {
    logger.error({ err }, "AI analysis failed");
    res.status(500).json({ error: "AI analysis failed" });
  }
});

export default router;
