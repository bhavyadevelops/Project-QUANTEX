import React, { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListServiceCategories, useListTechnicians, useCreateBooking, useAnalyzeIssue
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Cpu, Wifi, Smartphone, Monitor, Home, Package, Wrench, Star, ChevronRight, Sparkles } from "lucide-react";

const CAT_ICONS: Record<string, React.ReactNode> = {
  "Computer Repair": <Cpu className="w-5 h-5" />,
  "PC/Laptop Repair": <Cpu className="w-5 h-5" />,
  "Network & WiFi": <Wifi className="w-5 h-5" />,
  "WiFi/Network": <Wifi className="w-5 h-5" />,
  "Mobile Devices": <Smartphone className="w-5 h-5" />,
  "Device Setup": <Smartphone className="w-5 h-5" />,
  "Software Support": <Monitor className="w-5 h-5" />,
  "Smart Home": <Home className="w-5 h-5" />,
  "TV & Entertainment": <Monitor className="w-5 h-5" />,
  "Appliance Install": <Package className="w-5 h-5" />,
};

const bookSchema = z.object({
  categoryId:       z.number().min(1, "Select a service"),
  technicianId:     z.number().min(1, "Select a technician"),
  issueDescription: z.string().min(10, "Describe your issue (min 10 chars)"),
  address:          z.string().min(5, "Enter your address"),
  scheduledAt:      z.string().min(1, "Select a date/time"),
});

type Step = "category" | "technician" | "details" | "confirm";

export default function BookTechnician() {
  const [_, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("category");
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
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
      setAiSuggestion(result.summary ?? `Detected: ${result.category}.`);
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

  const STEPS: Step[] = ["category", "technician", "details", "confirm"];
  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-8">
          <p className="text-primary font-mono text-sm uppercase tracking-widest">Booking Flow</p>
          <h1 className="text-3xl font-bold uppercase mt-1">Deploy a Technician</h1>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 ${i <= stepIdx ? "text-primary" : "text-muted-foreground"}`}>
                <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold font-mono transition-colors ${i < stepIdx ? "bg-primary border-primary text-primary-foreground" : i === stepIdx ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
                  {i < stepIdx ? "✓" : i + 1}
                </div>
                <span className="text-xs font-mono uppercase hidden sm:inline">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < stepIdx ? "bg-primary" : "bg-border"}`} />}
            </React.Fragment>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {step === "category" && (
              <div className="border border-border bg-card rounded-lg p-6">
                <h2 className="font-bold uppercase font-mono text-sm mb-4 text-primary">Select Service Category</h2>
                {catsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : (
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {categories?.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => { field.onChange(cat.id); setStep("technician"); }}
                              className={`flex items-center gap-3 p-4 border rounded-lg text-left transition-all hover:border-primary/60 ${field.value === cat.id ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/20"}`}
                            >
                              <span className="text-primary">{CAT_ICONS[cat.name] ?? <Wrench className="w-5 h-5" />}</span>
                              <div>
                                <p className="font-bold text-sm uppercase">{cat.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">On-demand service</p>
                              </div>
                              <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {step === "technician" && (
              <div className="border border-border bg-card rounded-lg p-6">
                <h2 className="font-bold uppercase font-mono text-sm mb-1 text-primary">Select Technician</h2>
                <p className="text-xs text-muted-foreground font-mono mb-4">
                  Showing techs for: {selectedCat?.name ?? "All Categories"}
                </p>
                {techsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : (
                  <FormField
                    control={form.control}
                    name="technicianId"
                    render={({ field }) => (
                      <FormItem>
                        <div className="space-y-3">
                          {(filteredTechs.length > 0 ? filteredTechs : allTechs ?? []).map((tech) => (
                            <button
                              key={tech.id}
                              type="button"
                              onClick={() => { field.onChange(tech.id); setStep("details"); }}
                              className={`w-full flex items-center gap-4 p-4 border rounded-lg text-left transition-all hover:border-primary/60 ${field.value === tech.id ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/20"}`}
                            >
                              <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
                                <span className="text-primary font-bold font-mono">{tech.name?.charAt(0) ?? "T"}</span>
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-sm uppercase">{tech.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{tech.skills?.slice(0, 3).join(" · ")}</p>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-xs font-mono text-primary flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-primary" /> {tech.rating?.toFixed(1)} ({tech.reviewCount})
                                  </span>
                                  <span className="text-xs font-mono text-muted-foreground">${tech.hourlyRate}/hr</span>
                                  <span className="text-xs font-mono text-muted-foreground">~{tech.responseTime}</span>
                                </div>
                              </div>
                              <div className={`text-xs font-mono px-2 py-1 rounded ${tech.isAvailable ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                                {tech.isAvailable ? "AVAIL" : "BUSY"}
                              </div>
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <Button type="button" variant="ghost" size="sm" className="mt-4 font-mono text-xs" onClick={() => setStep("category")}>
                  ← Back
                </Button>
              </div>
            )}

            {step === "details" && (
              <div className="border border-border bg-card rounded-lg p-6 space-y-5">
                <h2 className="font-bold uppercase font-mono text-sm text-primary">Issue Details</h2>

                <FormField
                  control={form.control}
                  name="issueDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono uppercase text-xs">Describe Your Issue</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="My laptop won't turn on, the fan is spinning but there's no display..."
                          className="bg-background/50 border-input font-mono resize-none"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {issueDesc.length >= 10 && (
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAnalyze}
                      disabled={analyzeLoading}
                      className="font-mono text-xs uppercase text-primary border-primary/40"
                    >
                      {analyzeLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                      AI Pre-Diagnosis
                    </Button>
                    {aiSuggestion && (
                      <div className="mt-3 border border-primary/30 bg-primary/5 p-3 rounded text-xs font-mono text-muted-foreground">
                        <span className="text-primary font-bold">AI: </span>{aiSuggestion}
                      </div>
                    )}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono uppercase text-xs">Service Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St, San Francisco, CA" className="bg-background/50 border-input font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduledAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono uppercase text-xs">Preferred Date & Time</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          className="bg-background/50 border-input font-mono"
                          min={new Date().toISOString().slice(0, 16)}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3">
                  <Button type="button" variant="ghost" size="sm" className="font-mono text-xs" onClick={() => setStep("technician")}>
                    ← Back
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 uppercase font-bold font-mono"
                    onClick={async () => {
                      const valid = await form.trigger(["issueDescription", "address", "scheduledAt"]);
                      if (valid) setStep("confirm");
                    }}
                  >
                    Review Booking
                  </Button>
                </div>
              </div>
            )}

            {step === "confirm" && (
              <div className="border border-border bg-card rounded-lg p-6 space-y-5">
                <h2 className="font-bold uppercase font-mono text-sm text-primary">Confirm Deployment</h2>
                <div className="space-y-3">
                  {[
                    { label: "Service",    value: selectedCat?.name },
                    { label: "Technician", value: selectedTech?.name },
                    { label: "Address",    value: form.getValues("address") },
                    { label: "Scheduled",  value: new Date(form.getValues("scheduledAt")).toLocaleString() },
                    { label: "Est. Cost",  value: selectedTech?.hourlyRate ? `~$${selectedTech.hourlyRate}/hr` : "Quote on arrival" },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-xs font-mono text-muted-foreground uppercase">{r.label}</span>
                      <span className="text-sm font-mono font-bold">{r.value ?? "—"}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground font-mono border border-border/50 p-3 rounded bg-muted/20">
                  Issue: {form.getValues("issueDescription")}
                </p>

                <div className="flex gap-3">
                  <Button type="button" variant="ghost" size="sm" className="font-mono text-xs" onClick={() => setStep("details")}>
                    ← Back
                  </Button>
                  <Button type="submit" className="flex-1 uppercase font-bold font-mono" disabled={createBooking.isPending}>
                    {createBooking.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" />Deploying...</>
                    ) : "Confirm Deployment"}
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
