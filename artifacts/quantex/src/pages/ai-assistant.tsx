import React, { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useAnalyzeIssue, IssueAnalysisResult } from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";
import { MicButton } from "@/components/mic-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Send, Sparkles, ArrowRight, Cpu, RotateCcw, AlertTriangle,
  ShieldAlert, CheckCircle, XCircle, Camera, Clock, DollarSign, Wrench,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  analysis?: IssueAnalysisResult;
  imagePreview?: string;
}

const QUICK_PROMPTS_EN = [
  "My laptop won't turn on",
  "WiFi keeps dropping constantly",
  "Blue screen of death error",
  "Phone screen is cracked",
  "Smart TV won't connect",
  "Computer is extremely slow",
];

const SEVERITY_COLOR: Record<string, string> = {
  low:      "text-emerald-400 border-emerald-400/40 bg-emerald-400/10",
  medium:   "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  high:     "text-orange-400 border-orange-400/40 bg-orange-400/10",
  critical: "text-red-400 border-red-400/40 bg-red-400/10",
};

const CONFIDENCE_COLOR = (n: number) =>
  n >= 80 ? "bg-emerald-400" : n >= 60 ? "bg-yellow-400" : "bg-orange-400";

const EMERGENCY_TYPES: Record<string, string> = {
  "Electrical Hazard": "⚡ Electrical Hazard — POWER OFF IMMEDIATELY",
  "Gas Leakage":       "💨 Gas Leakage — EVACUATE & CALL EMERGENCY",
  "Fire Hazard":       "🔥 Fire Hazard — EVACUATE NOW",
  "Water Damage":      "💧 Water Damage — SHUT OFF MAIN VALVE",
  "Short Circuit":     "⚡ Short Circuit — DO NOT TOUCH WIRING",
  "Smoke Detected":    "🚨 Smoke Detected — CHECK FIRE ALARM",
};

export default function AIAssistant() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyzeIssue = useAnalyzeIssue();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64);
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (text?: string) => {
    const query = (text ?? input).trim();
    if (!query || isAnalyzing) return;

    const currentPreview = imagePreview;
    setMessages((prev) => [...prev, { role: "user", content: query, imagePreview: currentPreview ?? undefined }]);
    setInput("");
    setImageBase64(null);
    setImagePreview(null);
    setIsAnalyzing(true);

    try {
      const result = await analyzeIssue.mutateAsync({
        data: { description: query, imageBase64: imageBase64 ?? undefined },
      });
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: result.summary ?? `Detected: ${result.category}.`,
        analysis: result,
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "I'm having trouble connecting to the AI right now. Please try again or book a technician directly.",
      }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card py-5">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold uppercase font-mono">{t("ai_title")}</h1>
              <p className="text-xs text-muted-foreground font-mono">{t("ai_subtitle")}</p>
            </div>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" className="ml-auto font-mono text-xs" onClick={() => setMessages([])}>
                <RotateCcw className="w-3 h-3 mr-1" /> {t("ai_reset")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          {messages.length === 0 && (
            <div className="space-y-8">
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                  <Cpu className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold uppercase mb-2">{t("ai_describe_title")}</h2>
                <p className="text-muted-foreground font-mono text-sm max-w-md mx-auto">{t("ai_describe_sub")}</p>
              </div>
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase mb-3">{t("ai_quick_prompts")}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {QUICK_PROMPTS_EN.map((p) => (
                    <button key={p} onClick={() => handleSubmit(p)}
                      className="text-left p-3 border border-border bg-card rounded-lg text-xs font-mono hover:border-primary/50 hover:bg-primary/5 transition-all">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-3 flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  {/* User image preview */}
                  {msg.imagePreview && (
                    <img src={msg.imagePreview} alt="Uploaded" className="w-40 h-28 object-cover rounded-lg border border-border" />
                  )}

                  <div className={`px-4 py-3 rounded-lg text-sm font-mono leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                    {msg.content}
                  </div>

                  {msg.analysis && msg.role === "assistant" && (
                    <DiagnosisCard analysis={msg.analysis} t={t} />
                  )}
                </div>
              </div>
            ))}

            {isAnalyzing && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                </div>
                <div className="bg-card border border-border px-4 py-3 rounded-lg flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm font-mono text-muted-foreground">{t("ai_analyzing")}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t border-border bg-card/50 py-4">
        <div className="container mx-auto px-4 max-w-3xl">
          {imagePreview && (
            <div className="mb-2 flex items-center gap-2">
              <img src={imagePreview} alt="Preview" className="w-12 h-10 object-cover rounded border border-primary/40" />
              <span className="text-xs font-mono text-primary">Image attached</span>
              <button onClick={() => { setImageBase64(null); setImagePreview(null); }} className="text-muted-foreground hover:text-red-400 text-xs font-mono ml-auto">✕ remove</button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 flex-shrink-0 self-end"
              onClick={() => fileInputRef.current?.click()}
              title={t("ai_upload_img")}
            >
              <Camera className="w-4 h-4" />
            </Button>
            <Textarea
              placeholder={t("ai_placeholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              className="resize-none font-mono text-sm bg-background/50 flex-1"
              rows={2}
            />
            <MicButton
              onTranscript={(text) => setInput((prev) => prev ? `${prev} ${text}` : text)}
              size="icon"
              className="h-10 w-10 flex-shrink-0 self-end"
            />
            <Button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || isAnalyzing}
              size="icon"
              className="self-end h-10 w-10 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-2">{t("ai_hint")}</p>
        </div>
      </div>
    </div>
  );
}

function DiagnosisCard({ analysis, t }: { analysis: IssueAnalysisResult; t: (k: string) => string }) {
  const sev = analysis.severity ?? analysis.urgency ?? "medium";
  const conf = analysis.confidence ?? null;
  const isEmergency = analysis.isEmergency;

  return (
    <div className="w-full space-y-3">
      {/* Emergency banner */}
      {isEmergency && analysis.emergencyType && (
        <div className="border-2 border-red-500 bg-red-500/10 rounded-lg p-4 animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <span className="font-bold uppercase font-mono text-red-400 text-sm">{t("ai_emergency")}</span>
          </div>
          <p className="text-sm font-mono text-red-300">
            {EMERGENCY_TYPES[analysis.emergencyType] ?? analysis.emergencyType}
          </p>
          <p className="text-xs text-red-400/80 font-mono mt-2">Call emergency services if needed: 911</p>
        </div>
      )}

      {/* Main diagnosis card */}
      <div className="border border-primary/30 bg-primary/5 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono text-primary uppercase font-bold">AI Diagnosis</span>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-2">
          <span className={`text-xs font-mono border px-2 py-1 rounded flex items-center gap-1 ${SEVERITY_COLOR[sev] ?? SEVERITY_COLOR.medium}`}>
            <AlertTriangle className="w-3 h-3" />
            {t("ai_severity")} {sev.toUpperCase()}
          </span>
          <span className="text-xs font-mono border border-primary/30 bg-primary/10 text-primary px-2 py-1 rounded">
            {analysis.category}
          </span>
          <span className="text-xs font-mono border border-border px-2 py-1 rounded text-muted-foreground">
            {analysis.technicianType}
          </span>
          {analysis.requiresTechnician ? (
            <span className="text-xs font-mono border border-yellow-400/30 bg-yellow-400/10 text-yellow-400 px-2 py-1 rounded flex items-center gap-1">
              <Wrench className="w-3 h-3" /> {t("ai_needs_tech")}
            </span>
          ) : (
            <span className="text-xs font-mono border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 px-2 py-1 rounded flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> {t("ai_no_tech")}
            </span>
          )}
        </div>

        {/* Confidence meter */}
        {conf !== null && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-mono text-muted-foreground uppercase">{t("ai_confidence")}</span>
              <span className="text-xs font-mono font-bold text-primary">{conf}%</span>
            </div>
            <div className="w-full bg-border rounded-full h-1.5">
              <div className={`h-1.5 rounded-full transition-all ${CONFIDENCE_COLOR(conf)}`} style={{ width: `${conf}%` }} />
            </div>
          </div>
        )}

        {/* Cost + Duration */}
        {(analysis.estimatedCostMin != null || analysis.estimatedDuration) && (
          <div className="flex flex-wrap gap-4">
            {analysis.estimatedCostMin != null && analysis.estimatedCostMax != null && (
              <div className="flex items-center gap-1 text-xs font-mono">
                <DollarSign className="w-3 h-3 text-primary" />
                <span className="text-muted-foreground uppercase">{t("ai_est_cost")}</span>
                <span className="text-primary font-bold">${analysis.estimatedCostMin}–${analysis.estimatedCostMax}</span>
              </div>
            )}
            {analysis.estimatedDuration && (
              <div className="flex items-center gap-1 text-xs font-mono">
                <Clock className="w-3 h-3 text-primary" />
                <span className="text-muted-foreground uppercase">{t("ai_duration")}</span>
                <span className="text-primary font-bold">{analysis.estimatedDuration}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Troubleshooting steps */}
      {analysis.troubleshootingSteps && analysis.troubleshootingSteps.length > 0 && (
        <div className="border border-border/50 p-3 rounded bg-muted/10 space-y-1.5">
          <p className="text-xs font-mono text-primary font-bold mb-2">{t("ai_steps")}</p>
          {analysis.troubleshootingSteps.slice(0, 4).map((step, j) => (
            <p key={j} className="text-xs font-mono text-muted-foreground flex items-start gap-2">
              <span className="text-primary font-bold flex-shrink-0">{j + 1}.</span> {step}
            </p>
          ))}
        </div>
      )}

      {/* Safety precautions */}
      {analysis.safetyPrecautions && analysis.safetyPrecautions.length > 0 && (
        <div className="border border-yellow-400/30 bg-yellow-400/5 p-3 rounded space-y-1.5">
          <p className="text-xs font-mono text-yellow-400 font-bold mb-2 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> {t("ai_safety")}
          </p>
          {analysis.safetyPrecautions.map((prec, j) => (
            <p key={j} className="text-xs font-mono text-yellow-300/80 flex items-start gap-2">
              <span className="text-yellow-400 flex-shrink-0">•</span> {prec}
            </p>
          ))}
        </div>
      )}

      {/* Book Now */}
      <Button asChild size="sm" className="w-full uppercase font-mono text-xs" variant={isEmergency ? "destructive" : "outline"}>
        <Link href="/book">{t("ai_book_btn")} <ArrowRight className="w-3 h-3 ml-1" /></Link>
      </Button>
    </div>
  );
}
