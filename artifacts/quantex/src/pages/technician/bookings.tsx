import React, { useState } from "react";
import {
  useListBookings, useUpdateBookingStatus, useGetTechnicianBrief, useGetMyTechnicianProfile,
  BookingStatus, ListBookingsStatus,
} from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeEvents } from "@/hooks/use-realtime-events";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2, CheckCircle, XCircle, Zap, Clock, MapPin, User, Plus,
  Sparkles, ChevronDown, ChevronUp, Wrench, ShieldAlert, Package, Navigation,
  Car, AlertTriangle, Coffee,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy:     "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  Moderate: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  Complex:  "text-orange-400 border-orange-400/30 bg-orange-400/10",
  Advanced: "text-red-400 border-red-400/30 bg-red-400/10",
};

function AIBriefPanel({ jobId, issueDescription, categoryName, customerName, address, t }: {
  jobId: number;
  issueDescription: string;
  categoryName: string;
  customerName: string | null | undefined;
  address: string | null | undefined;
  t: (k: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const getTechnicianBrief = useGetTechnicianBrief();
  const { toast } = useToast();

  const generate = async () => {
    if (brief) { setOpen(!open); return; }
    setLoading(true);
    setOpen(true);
    try {
      const result = await getTechnicianBrief.mutateAsync({
        data: { issueDescription, categoryName, customerName: customerName ?? null, address: address ?? null },
      });
      setBrief(result);
    } catch {
      toast({ title: "AI Brief Failed", description: "Could not generate brief. Try again.", variant: "destructive" });
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-primary/20 rounded-lg overflow-hidden mt-3">
      <button
        onClick={generate}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
      >
        <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <span className="text-xs font-mono text-primary uppercase font-bold flex-1">{t("tech_ai_brief")}</span>
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
        ) : open ? (
          <ChevronUp className="w-3.5 h-3.5 text-primary" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      {open && !loading && brief && (
        <div className="p-4 space-y-3 bg-card/50 border-t border-primary/20">
          <div>
            <p className="text-xs font-mono text-primary uppercase mb-1 font-bold">{t("tech_ai_summary")}</p>
            <p className="text-xs font-mono text-muted-foreground leading-relaxed">{brief.issueSummary}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              {brief.difficultyLevel && (
                <div>
                  <p className="text-xs font-mono text-muted-foreground uppercase mb-1">{t("tech_ai_difficulty")}</p>
                  <span className={`text-xs font-mono border px-2 py-0.5 rounded ${DIFFICULTY_COLOR[brief.difficultyLevel] ?? DIFFICULTY_COLOR.Moderate}`}>
                    {brief.difficultyLevel}
                  </span>
                </div>
              )}
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase mb-1">{t("tech_ai_duration")}</p>
                <p className="text-xs font-mono text-primary font-bold">{brief.estimatedDuration}</p>
              </div>
            </div>

            {brief.toolsNeeded?.length > 0 && (
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase mb-1 flex items-center gap-1">
                  <Wrench className="w-3 h-3" /> {t("tech_ai_tools")}
                </p>
                <ul className="space-y-0.5">
                  {brief.toolsNeeded.map((tool: string, i: number) => (
                    <li key={i} className="text-xs font-mono text-foreground flex items-center gap-1">
                      <span className="text-primary">•</span> {tool}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {brief.suggestedParts?.length > 0 && (
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase mb-1 flex items-center gap-1">
                <Package className="w-3 h-3" /> {t("tech_ai_parts")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {brief.suggestedParts.map((part: string, i: number) => (
                  <span key={i} className="text-xs font-mono border border-border px-2 py-0.5 rounded bg-muted/30 text-foreground">{part}</span>
                ))}
              </div>
            </div>
          )}

          {brief.safetyRecommendations?.length > 0 && (
            <div className="border border-yellow-400/30 bg-yellow-400/5 p-3 rounded">
              <p className="text-xs font-mono text-yellow-400 uppercase mb-1 font-bold flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> {t("tech_ai_safety")}
              </p>
              {brief.safetyRecommendations.map((rec: string, i: number) => (
                <p key={i} className="text-xs font-mono text-yellow-300/80 flex items-start gap-1">
                  <span className="text-yellow-400 flex-shrink-0">•</span> {rec}
                </p>
              ))}
            </div>
          )}

          {brief.customerTips && (
            <div className="border border-blue-400/20 bg-blue-400/5 p-3 rounded">
              <p className="text-xs font-mono text-blue-400 uppercase mb-1 font-bold">{t("tech_ai_tips")}</p>
              <p className="text-xs font-mono text-blue-300/80">{brief.customerTips}</p>
            </div>
          )}
        </div>
      )}

      {open && loading && (
        <div className="p-4 flex items-center gap-2 border-t border-primary/20 bg-card/50">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs font-mono text-muted-foreground">{t("tech_ai_generating")}</span>
        </div>
      )}
    </div>
  );
}

export default function TechnicianBookings() {
  const [filter, setFilter] = useState<string>("");
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: profile } = useGetMyTechnicianProfile({ query: {} as any });

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    searching:        { label: "SEARCHING",       color: "text-blue-300 border-blue-300/30 bg-blue-300/10",     icon: <Clock className="w-3 h-3" /> },
    assigned:         { label: "ASSIGNED",         color: "text-blue-400 border-blue-400/30 bg-blue-400/10",    icon: <CheckCircle className="w-3 h-3" /> },
    pending:          { label: "PENDING",          color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10", icon: <Clock className="w-3 h-3" /> },
    accepted:         { label: "ACCEPTED",         color: "text-blue-400 border-blue-400/30 bg-blue-400/10",    icon: <CheckCircle className="w-3 h-3" /> },
    travelling:       { label: "TRAVELLING",       color: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",    icon: <Car className="w-3 h-3" /> },
    arriving:         { label: "ARRIVING",         color: "text-cyan-300 border-cyan-300/30 bg-cyan-300/10",    icon: <Navigation className="w-3 h-3" /> },
    reached:          { label: "REACHED",          color: "text-emerald-300 border-emerald-300/30 bg-emerald-300/10", icon: <MapPin className="w-3 h-3" /> },
    in_progress:      { label: "IN PROGRESS",      color: "text-primary border-primary/30 bg-primary/10",      icon: <Zap className="w-3 h-3" /> },
    waiting_for_parts:{ label: "WAITING PARTS",   color: "text-orange-400 border-orange-400/30 bg-orange-400/10", icon: <Coffee className="w-3 h-3" /> },
    completed:        { label: "COMPLETED",        color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10", icon: <CheckCircle className="w-3 h-3" /> },
    payment_completed:{ label: "PAID",            color: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10", icon: <CheckCircle className="w-3 h-3" /> },
    cancelled:        { label: "CANCELLED",       color: "text-red-400 border-red-400/30 bg-red-400/10",       icon: <XCircle className="w-3 h-3" /> },
  };

  const FILTER_OPTIONS = [
    { label: t("hist_all"),       value: "" },
    { label: "PENDING",   value: ListBookingsStatus.pending },
    { label: "ACCEPTED",  value: ListBookingsStatus.accepted },
    { label: "IN PROGRESS", value: ListBookingsStatus.in_progress },
    { label: "COMPLETED", value: ListBookingsStatus.completed },
    { label: "CANCELLED", value: ListBookingsStatus.cancelled },
  ] as const;

  // Full next-step state machine for technicians
  // confirmRequired means a confirm dialog must be shown before the action fires
  const NEXT_STATUS: Record<string, { label: string; next: BookingStatus; confirmRequired: boolean; confirmTitle: string; confirmDesc: string; danger?: boolean }[]> = {
    pending: [
      { label: "ACCEPT JOB", next: BookingStatus.accepted, confirmRequired: true, confirmTitle: "ACCEPT JOB?", confirmDesc: "You will be marked busy and assigned to this customer. You cannot accept another job until this one is completed." },
      { label: "DECLINE", next: BookingStatus.cancelled, confirmRequired: true, confirmTitle: "DECLINE JOB?", confirmDesc: "This will cancel the booking. The customer will be notified.", danger: true },
    ],
    accepted: [
      { label: "START TRAVEL", next: BookingStatus.travelling, confirmRequired: true, confirmTitle: "START TRAVEL?", confirmDesc: "Confirm you are now heading to the customer's location." },
    ],
    travelling: [
      { label: "MARK ARRIVING", next: BookingStatus.arriving, confirmRequired: true, confirmTitle: "MARK ARRIVING?", confirmDesc: "Confirm you are close to the customer's location." },
    ],
    arriving: [
      { label: "I'VE ARRIVED", next: BookingStatus.reached, confirmRequired: true, confirmTitle: "CONFIRM ARRIVAL?", confirmDesc: "Confirm you have arrived at the customer's location." },
    ],
    reached: [
      { label: "START WORK", next: BookingStatus.in_progress, confirmRequired: true, confirmTitle: "START WORK?", confirmDesc: "Confirm you are beginning work on the customer's issue." },
    ],
    in_progress: [
      { label: "NEED PARTS", next: BookingStatus.waiting_for_parts, confirmRequired: true, confirmTitle: "PAUSE FOR PARTS?", confirmDesc: "This will mark the job as waiting for parts. Resume when you have them." },
      { label: "COMPLETE JOB", next: BookingStatus.completed, confirmRequired: true, confirmTitle: "COMPLETE JOB?", confirmDesc: "Mark the job as completed. The customer will be notified and payment will be processed." },
    ],
    waiting_for_parts: [
      { label: "RESUME WORK", next: BookingStatus.in_progress, confirmRequired: true, confirmTitle: "RESUME WORK?", confirmDesc: "Confirm you have the parts and are resuming work." },
      { label: "COMPLETE JOB", next: BookingStatus.completed, confirmRequired: true, confirmTitle: "COMPLETE JOB?", confirmDesc: "Mark the job as completed. The customer will be notified and payment will be processed." },
    ],
    completed: [
      { label: "CONFIRM PAYMENT", next: BookingStatus.payment_completed, confirmRequired: true, confirmTitle: "CONFIRM PAYMENT?", confirmDesc: "Confirm that payment has been collected from the customer." },
    ],
  };

  const { data: bookings, isLoading, refetch } = useListBookings(
    filter ? { status: filter as typeof ListBookingsStatus[keyof typeof ListBookingsStatus] } : undefined
  );
  const updateStatus = useUpdateBookingStatus();

  // SSE: auto-refresh booking list on events
  useRealtimeEvents({
    technicianId: profile?.id,
    enabled: !!profile?.id,
    onEvent: () => {
      queryClient.invalidateQueries({ queryKey: ["listBookings"] });
    },
  });

  const handleStatusUpdate = async (id: number, status: BookingStatus) => {
    try {
      await updateStatus.mutateAsync({ id, data: { status } });
      toast({ title: "STATUS UPDATED", description: `Job marked as ${status.replace(/_/g, " ")}.` });
      refetch();
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message ?? "Try again.", variant: "destructive" });
    }
  };

  const AI_BRIEF_STATUSES = new Set(["pending", "accepted", "travelling", "arriving", "reached", "in_progress", "waiting_for_parts"]);

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <p className="text-primary font-mono text-sm uppercase tracking-widest">{t("tech_b_label")}</p>
          <h1 className="text-3xl font-bold uppercase mt-1">{t("tech_b_title")}</h1>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1 text-xs font-mono uppercase rounded border transition-colors ${
                filter === f.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : bookings && bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((job) => {
              const cfg = STATUS_CONFIG[job.status ?? "pending"] ?? STATUS_CONFIG.pending!;
              const nextActions = job.status ? NEXT_STATUS[job.status] : null;
              const showAiBrief = AI_BRIEF_STATUSES.has(job.status ?? "");

              return (
                <div key={job.id} className="border border-border bg-card p-5 rounded-lg hover:border-primary/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold uppercase text-lg">{job.categoryName ?? "Service"}</span>
                        <span className={`text-xs font-mono border px-2 py-0.5 rounded flex items-center gap-1 ${cfg.color}`}>{cfg.icon}{cfg.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground font-mono leading-relaxed">{job.issueDescription}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {job.estimatedCost != null && <p className="font-bold text-primary font-mono text-lg">${job.estimatedCost}</p>}
                      <p className="text-xs text-muted-foreground font-mono">{job.scheduledAt ? new Date(job.scheduledAt).toLocaleDateString() : "ASAP"}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs font-mono text-muted-foreground mb-4">
                    {job.customerName && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {job.customerName}</span>}
                    {job.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.address}</span>}
                    {job.scheduledAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(job.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>

                  {/* Navigate button for accepted/travelling/arriving/reached */}
                  {job.address && ["accepted", "travelling", "arriving", "reached"].includes(job.status ?? "") && (
                    <div className="mb-4">
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-mono border border-primary/40 text-primary px-3 py-1.5 rounded hover:bg-primary/10 transition-colors"
                      >
                        <Navigation className="w-3 h-3" /> NAVIGATE TO CUSTOMER
                      </a>
                    </div>
                  )}

                  {/* Action buttons — all transitions require confirmation */}
                  {nextActions && nextActions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-1">
                      {nextActions.map((action) => (
                        <AlertDialog key={action.next}>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant={action.danger ? "outline" : "default"}
                              className={`uppercase font-mono text-xs ${action.danger ? "text-red-400 border-red-400/30 hover:bg-red-400/10" : ""}`}
                              disabled={updateStatus.isPending}
                            >
                              {action.danger
                                ? <XCircle className="w-3 h-3 mr-1" />
                                : <CheckCircle className="w-3 h-3 mr-1" />}
                              {action.label}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-mono uppercase">{action.confirmTitle}</AlertDialogTitle>
                              <AlertDialogDescription className="font-mono text-sm">{action.confirmDesc}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="font-mono uppercase text-xs">CANCEL</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleStatusUpdate(job.id, action.next)}
                                className={`font-mono uppercase text-xs ${action.danger ? "bg-red-500 hover:bg-red-600 text-white" : ""}`}
                              >
                                {updateStatus.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                CONFIRM
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ))}
                    </div>
                  )}

                  {/* AI Brief panel */}
                  {showAiBrief && (
                    <AIBriefPanel
                      jobId={job.id}
                      issueDescription={job.issueDescription ?? ""}
                      categoryName={job.categoryName ?? "Technical Issue"}
                      customerName={job.customerName}
                      address={job.address}
                      t={t}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-border bg-card rounded-lg p-16 text-center">
            <Plus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-mono text-muted-foreground">{t("tech_b_empty")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
