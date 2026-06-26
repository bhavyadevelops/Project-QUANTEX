import React, { useState } from "react";
import {
  useListBookings, useUpdateBookingStatus, useGetTechnicianBrief,
  BookingStatusUpdateStatus, ListBookingsStatus,
} from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, CheckCircle, XCircle, Zap, Clock, MapPin, User, Plus,
  Sparkles, ChevronDown, ChevronUp, Wrench, ShieldAlert, Package,
} from "lucide-react";

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
          {/* Summary */}
          <div>
            <p className="text-xs font-mono text-primary uppercase mb-1 font-bold">{t("tech_ai_summary")}</p>
            <p className="text-xs font-mono text-muted-foreground leading-relaxed">{brief.issueSummary}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Difficulty + Duration */}
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

            {/* Tools */}
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

          {/* Suggested Parts */}
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

          {/* Safety */}
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

          {/* Customer Tips */}
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

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending:     { label: t("st_pending"),     color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10", icon: <Clock className="w-3 h-3" /> },
    accepted:    { label: t("st_accepted"),    color: "text-blue-400 border-blue-400/30 bg-blue-400/10",       icon: <CheckCircle className="w-3 h-3" /> },
    in_progress: { label: t("st_in_progress"), color: "text-primary border-primary/30 bg-primary/10",          icon: <Zap className="w-3 h-3" /> },
    completed:   { label: t("st_completed"),   color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10", icon: <CheckCircle className="w-3 h-3" /> },
    cancelled:   { label: t("st_cancelled"),   color: "text-red-400 border-red-400/30 bg-red-400/10",          icon: <XCircle className="w-3 h-3" /> },
  };

  const FILTER_OPTIONS = [
    { label: t("hist_all"),       value: "" },
    { label: t("hist_pending"),   value: ListBookingsStatus.pending },
    { label: t("hist_accepted"),  value: ListBookingsStatus.accepted },
    { label: t("hist_inprog"),    value: ListBookingsStatus.in_progress },
    { label: t("hist_completed"), value: ListBookingsStatus.completed },
    { label: t("hist_cancelled"), value: ListBookingsStatus.cancelled },
  ] as const;

  const NEXT_STATUS: Record<string, { label: string; next: BookingStatusUpdateStatus }> = {
    pending:     { label: t("tech_b_accept"),   next: BookingStatusUpdateStatus.accepted },
    accepted:    { label: t("tech_b_start"),    next: BookingStatusUpdateStatus.in_progress },
    in_progress: { label: t("tech_b_complete"), next: BookingStatusUpdateStatus.completed },
  };

  const { data: bookings, isLoading, refetch } = useListBookings(
    filter ? { status: filter as typeof ListBookingsStatus[keyof typeof ListBookingsStatus] } : undefined
  );
  const updateStatus = useUpdateBookingStatus();

  const handleStatusUpdate = async (id: number, status: BookingStatusUpdateStatus) => {
    try {
      await updateStatus.mutateAsync({ id, data: { status } });
      toast({ title: "Status Updated", description: `Job marked as ${status.replace("_", " ")}.` });
      refetch();
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message ?? "Try again.", variant: "destructive" });
    }
  };

  const AI_BRIEF_STATUSES = new Set(["pending", "accepted", "in_progress"]);

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
              const cfg = STATUS_CONFIG[job.status ?? "pending"] ?? STATUS_CONFIG.pending;
              const nextAction = job.status ? NEXT_STATUS[job.status] : null;
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

                  {nextAction && (
                    <div className="flex gap-2 mb-1">
                      <Button size="sm" className="uppercase font-mono text-xs" onClick={() => handleStatusUpdate(job.id, nextAction.next)} disabled={updateStatus.isPending}>
                        {updateStatus.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                        {nextAction.label}
                      </Button>
                      {job.status === "pending" && (
                        <Button size="sm" variant="outline" className="uppercase font-mono text-xs text-red-400 border-red-400/30 hover:bg-red-400/10"
                          onClick={() => handleStatusUpdate(job.id, BookingStatusUpdateStatus.cancelled)}>
                          <XCircle className="w-3 h-3 mr-1" /> {t("tech_b_decline")}
                        </Button>
                      )}
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
