import React, { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListServiceCategories, useListTechnicians, useCreateBooking, useAnalyzeIssue
} from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";
import { MicButton } from "@/components/mic-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Cpu, Wifi, Smartphone, Monitor, Home, Package, Wrench, Star, ChevronRight, Sparkles } from "lucide-react";
import { TechnicianProfileCard } from "@/components/technician-profile-card";

const CAT_ICONS: Record<string, React.ReactNode> = {
  "PC/Laptop Repair": <Cpu className="w-5 h-5" />,
  "Computer Repair":  <Cpu className="w-5 h-5" />,
  "WiFi/Network":     <Wifi className="w-5 h-5" />,
  "Network & WiFi":   <Wifi className="w-5 h-5" />,
  "Device Setup":     <Smartphone className="w-5 h-5" />,
  "Mobile Devices":   <Smartphone className="w-5 h-5" />,
  "Software Support": <Monitor className="w-5 h-5" />,
  "Smart Home":       <Home className="w-5 h-5" />,
  "TV & Entertainment": <Monitor className="w-5 h-5" />,
  "Appliance Install": <Package className="w-5 h-5" />,
};

const bookSchema = z.object({
  categoryId:       z.number().min(1),
  technicianId:     z.number().min(1),
  issueDescription: z.string().min(10),
  address:          z.string().min(5),
  scheduledAt:      z.string().min(1),
});

type Step = "category" | "technician" | "details" | "confirm";
const STEPS: Step[] = ["category", "technician", "details", "confirm"];

export default function BookTechnician() {
  const [_, setLocation] = useLocation();
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>("category");
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [expandedTechId, setExpandedTechId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: categories, isLoading: catsLoading } = useListServiceCategories();
  const { data: allTechs, isLoading: techsLoading } = useListTechnicians();
  const createBooking = useCreateBooking();
  const analyzeIssue = useAnalyzeIssue();

  const form = useForm<z.infer<typeof bookSchema>>({
    resolver: zodResolver(bookSchema),
    defaultValues: { categoryId: 0, technicianId: 0, issueDescription: "", address: "", scheduledAt: "" },
  });

  const selectedCatId  = form.watch("categoryId");
  const selectedTechId = form.watch("technicianId");
  const issueDesc      = form.watch("issueDescription");

  const filteredTechs = allTechs?.filter((t) =>
    !selectedCatId || t.categoryIds?.includes(selectedCatId)
  ) ?? allTechs ?? [];

  const selectedCat  = categories?.find((c) => c.id === selectedCatId);
  const selectedTech = allTechs?.find((t) => t.id === selectedTechId);

  const handleAnalyze = async () => {
    if (!issueDesc || issueDesc.length < 10) return;
    setAnalyzeLoading(true);
    try {
      const result = await analyzeIssue.mutateAsync({ data: { description: issueDesc } });
      setAiSuggestion(result.summary ?? `${result.category}.`);
    } catch {
      setAiSuggestion("AI analysis unavailable. Proceeding with manual booking.");
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof bookSchema>) => {
    try {
      const booking = await createBooking.mutateAsync({
        data: {
          categoryId:       values.categoryId,
          technicianId:     values.technicianId,
          issueDescription: values.issueDescription,
          address:          values.address,
          scheduledAt:      new Date(values.scheduledAt).toISOString(),
          estimatedCost:    selectedTech?.hourlyRate ?? 80,
        }
      });
      toast({ title: "Booking Confirmed", description: "Your technician has been dispatched." });
      setLocation(`/tracking/${booking.id}`);
    } catch (err: any) {
      toast({ title: "Booking Failed", description: err.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-8">
          <p className="text-primary font-mono text-sm uppercase tracking-widest">{t("book_label")}</p>
          <h1 className="text-3xl font-bold uppercase mt-1">{t("book_title")}</h1>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 ${i <= stepIdx ? "text-primary" : "text-muted-foreground"}`}>
                <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold font-mono transition-colors ${
                  i < stepIdx ? "bg-primary border-primary text-primary-foreground"
                  : i === stepIdx ? "border-primary text-primary"
                  : "border-border text-muted-foreground"
                }`}>
                  {i < stepIdx ? "✓" : i + 1}
                </div>
                <span className="text-xs font-mono uppercase hidden sm:inline">
                  {t(`book_step_${s === "category" ? "category" : s === "technician" ? "technician" : s === "details" ? "details" : "confirm"}`)}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < stepIdx ? "bg-primary" : "bg-border"}`} />}
            </React.Fragment>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Step 1: Category */}
            {step === "category" && (
              <div className="border border-border bg-card rounded-lg p-6">
                <h2 className="font-bold uppercase font-mono text-sm mb-4 text-primary">{t("book_select_cat")}</h2>
                {catsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : (
                  <FormField control={form.control} name="categoryId" render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {categories?.map((cat) => (
                          <button key={cat.id} type="button"
                            onClick={() => { field.onChange(cat.id); setStep("technician"); }}
                            className={`flex items-center gap-3 p-4 border rounded-lg text-left transition-all hover:border-primary/60 ${
                              field.value === cat.id ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/20"
                            }`}>
                            <span className="text-primary">{CAT_ICONS[cat.name] ?? <Wrench className="w-5 h-5" />}</span>
                            <div>
                              <p className="font-bold text-sm uppercase">{cat.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{t("book_on_demand")}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </div>
            )}

            {/* Step 2: Technician */}
            {step === "technician" && (
              <div className="border border-border bg-card rounded-lg p-6">
                <h2 className="font-bold uppercase font-mono text-sm mb-1 text-primary">{t("book_select_tech")}</h2>
                <p className="text-xs text-muted-foreground font-mono mb-4">{t("book_showing_for")} {selectedCat?.name ?? t("book_all_cats")}</p>
                {techsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : (() => {
                  const list = filteredTechs.length > 0 ? filteredTechs : allTechs ?? [];
                  // Score: weighted by availability, rating, completedJobs, fast response
                  const scored = list.map((tech) => {
                    const ratingScore = (tech.rating ?? 0) * 20;
                    const jobScore = Math.min((tech.completedJobs ?? 0) / 2, 20);
                    const reviewScore = Math.min((tech.reviewCount ?? 0) / 5, 10);
                    const availBonus = tech.isAvailable ? 15 : 0;
                    const responseStr = tech.responseTime ?? "60 min";
                    const responseMin = parseInt(responseStr) || 60;
                    const responseScore = Math.max(0, 15 - responseMin / 10);
                    return { tech, score: ratingScore + jobScore + reviewScore + availBonus + responseScore };
                  }).sort((a, b) => b.score - a.score);
                  const recommendedId = scored[0]?.tech.id;

                  return (
                    <FormField control={form.control} name="technicianId" render={({ field }) => (
                      <FormItem>
                        <div className="space-y-3">
                          {scored.map(({ tech }, idx) => {
                            const isRecommended = tech.id === recommendedId && idx === 0;
                            return (
                              <div key={tech.id} className="space-y-1">
                                {isRecommended && (
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <Sparkles className="w-3 h-3 text-primary" />
                                    <span className="text-xs font-mono text-primary font-bold uppercase">{t("ai_recommended")}</span>
                                    <span className="text-xs font-mono text-muted-foreground">— Top rated · Fastest response · Most experienced</span>
                                  </div>
                                )}
                                <div className={`border rounded-lg transition-all ${
                                  field.value === tech.id
                                    ? "border-primary"
                                    : isRecommended
                                      ? "border-primary/50"
                                      : "border-border hover:border-primary/40"
                                }`}>
                                  {/* Compact summary row */}
                                  <div className={`flex items-center gap-4 p-4 rounded-lg cursor-pointer ${
                                    field.value === tech.id ? "bg-primary/10" : isRecommended ? "bg-primary/5" : "bg-background hover:bg-muted/20"
                                  }`}
                                    onClick={() => { field.onChange(tech.id); setStep("details"); }}>
                                    <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
                                      <span className="text-primary font-bold font-mono">{tech.name?.charAt(0) ?? "T"}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-bold text-sm uppercase">{tech.name}</p>
                                        {isRecommended && (
                                          <span className="text-xs font-mono bg-primary text-primary-foreground px-1.5 py-0.5 rounded">AI ★</span>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground font-mono truncate">{tech.skills?.slice(0, 3).join(" · ")}</p>
                                      <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs font-mono text-primary flex items-center gap-1">
                                          <Star className="w-3 h-3 fill-primary" /> {tech.rating?.toFixed(1)} ({tech.reviewCount})
                                        </span>
                                        <span className="text-xs font-mono text-muted-foreground">${tech.hourlyRate}/hr</span>
                                        <span className="text-xs font-mono text-muted-foreground">~{tech.responseTime}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <div className={`text-xs font-mono px-2 py-1 rounded ${tech.isAvailable ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                                        {tech.isAvailable ? "AVAIL" : "BUSY"}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setExpandedTechId(expandedTechId === tech.id ? null : tech.id); }}
                                        className="text-[10px] font-mono border border-border px-2 py-1 rounded hover:border-primary/60 hover:text-primary transition-colors"
                                      >
                                        {expandedTechId === tech.id ? "HIDE" : "PROFILE"}
                                      </button>
                                    </div>
                                  </div>
                                  {/* Full profile detail — expanded on demand */}
                                  {expandedTechId === tech.id && (
                                    <div className="border-t border-border/40 p-4 space-y-3 bg-muted/10 rounded-b-lg">
                                      <TechnicianProfileCard technician={tech as typeof tech & { name: string }} />
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="w-full uppercase font-bold font-mono"
                                        onClick={() => { field.onChange(tech.id); setStep("details"); }}
                                      >
                                        Select {tech.name} →
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                  );
                })()}
                <Button type="button" variant="ghost" size="sm" className="mt-4 font-mono text-xs" onClick={() => setStep("category")}>
                  {t("book_back")}
                </Button>
              </div>
            )}

            {/* Step 3: Details */}
            {step === "details" && (
              <div className="border border-border bg-card rounded-lg p-6 space-y-5">
                <h2 className="font-bold uppercase font-mono text-sm text-primary">{t("book_issue_title")}</h2>

                {/* Issue Description with Mic */}
                <FormField control={form.control} name="issueDescription" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono uppercase text-xs">{t("book_describe")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Textarea
                          placeholder={t("book_describe_ph")}
                          className="bg-background/50 border-input font-mono resize-none pr-12"
                          rows={4}
                          {...field}
                        />
                        <div className="absolute top-2 right-2">
                          <MicButton
                            onTranscript={(text) => field.onChange(field.value ? `${field.value} ${text}` : text)}
                            size="icon"
                          />
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {issueDesc.length >= 10 && (
                  <div>
                    <Button type="button" variant="outline" size="sm" onClick={handleAnalyze} disabled={analyzeLoading}
                      className="font-mono text-xs uppercase text-primary border-primary/40">
                      {analyzeLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                      {t("book_ai_prediag")}
                    </Button>
                    {aiSuggestion && (
                      <div className="mt-3 border border-primary/30 bg-primary/5 p-3 rounded text-xs font-mono text-muted-foreground">
                        <span className="text-primary font-bold">{t("book_ai_prediag")}: </span>{aiSuggestion}
                      </div>
                    )}
                  </div>
                )}

                {/* Address with Mic */}
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono uppercase text-xs">{t("book_address")}</FormLabel>
                    <FormControl>
                      <div className="relative flex items-center">
                        <Input
                          placeholder={t("book_address_ph")}
                          className="bg-background/50 border-input font-mono pr-12"
                          {...field}
                        />
                        <div className="absolute right-1">
                          <MicButton
                            onTranscript={(text) => field.onChange(text)}
                            size="icon"
                          />
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="scheduledAt" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono uppercase text-xs">{t("book_datetime")}</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" className="bg-background/50 border-input font-mono"
                        min={new Date().toISOString().slice(0, 16)} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex gap-3">
                  <Button type="button" variant="ghost" size="sm" className="font-mono text-xs" onClick={() => setStep("technician")}>
                    {t("book_back")}
                  </Button>
                  <Button type="button" className="flex-1 uppercase font-bold font-mono"
                    onClick={async () => {
                      const valid = await form.trigger(["issueDescription", "address", "scheduledAt"]);
                      if (valid) setStep("confirm");
                    }}>
                    {t("book_review")}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Confirm */}
            {step === "confirm" && (
              <div className="border border-border bg-card rounded-lg p-6 space-y-5">
                <h2 className="font-bold uppercase font-mono text-sm text-primary">{t("book_confirm_title")}</h2>

                {selectedTech && (
                  <TechnicianProfileCard technician={selectedTech as typeof selectedTech & { name: string }} compact />
                )}

                <div className="space-y-2">
                  {[
                    { label: t("book_confirm_service"),   value: selectedCat?.name },
                    { label: t("book_confirm_address"),   value: form.getValues("address") },
                    { label: t("book_confirm_scheduled"), value: new Date(form.getValues("scheduledAt")).toLocaleString() },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-xs font-mono text-muted-foreground uppercase">{r.label}</span>
                      <span className="text-sm font-mono font-bold">{r.value ?? "—"}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground font-mono border border-border/50 p-3 rounded bg-muted/20">
                  {form.getValues("issueDescription")}
                </p>
                <div className="flex gap-3">
                  <Button type="button" variant="ghost" size="sm" className="font-mono text-xs" onClick={() => setStep("details")}>
                    {t("book_back")}
                  </Button>
                  <Button type="submit" className="flex-1 uppercase font-bold font-mono" disabled={createBooking.isPending}>
                    {createBooking.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" />{t("book_deploying")}</>
                    ) : t("book_confirm_btn")}
                  </Button>
                </div>
              </div>
            )}

          </form>
        </Form>
      </div>
    </div>
  );
}
