import React, { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useAnalyzeIssue, IssueAnalysisResult } from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";
import { MicButton } from "@/components/mic-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Sparkles, ArrowRight, Cpu, RotateCcw } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  analysis?: IssueAnalysisResult;
}

const QUICK_PROMPTS_EN = [
  "My laptop won't turn on",
  "WiFi keeps dropping constantly",
  "Blue screen of death error",
  "Phone screen is cracked",
  "Smart TV won't connect to network",
  "Computer is extremely slow",
];

const URGENCY_COLOR: Record<string, string> = {
  low:      "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  medium:   "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  high:     "text-orange-400 border-orange-400/30 bg-orange-400/10",
  critical: "text-red-400 border-red-400/30 bg-red-400/10",
};

export default function AIAssistant() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const analyzeIssue = useAnalyzeIssue();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (text?: string) => {
    const query = (text ?? input).trim();
    if (!query || isAnalyzing) return;

    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setInput("");
    setIsAnalyzing(true);

    try {
      const result = await analyzeIssue.mutateAsync({ data: { description: query } });
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
      <div className="border-b border-border bg-card py-6">
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
                <div className={`max-w-[80%] space-y-3 flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`px-4 py-3 rounded-lg text-sm font-mono leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                    {msg.content}
                  </div>

                  {msg.analysis && msg.role === "assistant" && (
                    <div className="w-full space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {msg.analysis.urgency && (
                          <span className={`text-xs font-mono border px-2 py-1 rounded ${URGENCY_COLOR[msg.analysis.urgency] ?? URGENCY_COLOR.medium}`}>
                            {t("ai_urgency")} {msg.analysis.urgency.toUpperCase()}
                          </span>
                        )}
                        {msg.analysis.category && (
                          <span className="text-xs font-mono border border-primary/30 bg-primary/10 text-primary px-2 py-1 rounded">
                            {msg.analysis.category}
                          </span>
                        )}
                        {msg.analysis.technicianType && (
                          <span className="text-xs font-mono border border-border px-2 py-1 rounded text-muted-foreground">
                            {msg.analysis.technicianType}
                          </span>
                        )}
                      </div>

                      {msg.analysis.troubleshootingSteps && msg.analysis.troubleshootingSteps.length > 0 && (
                        <div className="text-xs font-mono text-muted-foreground border border-border/50 p-3 rounded bg-muted/20 space-y-1">
                          <p className="text-primary font-bold mb-2">{t("ai_steps")}</p>
                          {msg.analysis.troubleshootingSteps.slice(0, 3).map((step, j) => (
                            <p key={j}>• {step}</p>
                          ))}
                        </div>
                      )}

                      <Button asChild size="sm" className="w-full uppercase font-mono text-xs" variant="outline">
                        <Link href="/book">{t("ai_book_btn")} <ArrowRight className="w-3 h-3 ml-1" /></Link>
                      </Button>
                    </div>
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
          <div className="flex gap-2 items-end">
            <Textarea
              placeholder={t("ai_placeholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              className="resize-none font-mono text-sm bg-background/50 flex-1"
              rows={2}
            />
            {/* Mic button for voice input */}
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
