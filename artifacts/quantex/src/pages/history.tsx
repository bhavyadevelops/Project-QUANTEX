import React, { useState } from "react";
import { Link } from "wouter";
import { useListBookings, useUpdateBookingStatus, ListBookingsStatus, BookingStatusUpdateStatus } from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, Clock, Zap, XCircle, AlertCircle, MapPin, Star, Plus } from "lucide-react";

const CANCELLABLE = new Set(["pending", "accepted"]);

export default function History() {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<string>("");
  const { toast } = useToast();

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending:     { label: t("st_pending"),     color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",    icon: <Clock className="w-3 h-3" /> },
    accepted:    { label: t("st_accepted"),    color: "text-blue-400 border-blue-400/30 bg-blue-400/10",          icon: <AlertCircle className="w-3 h-3" /> },
    in_progress: { label: t("st_in_progress"), color: "text-primary border-primary/30 bg-primary/10",             icon: <Zap className="w-3 h-3" /> },
    completed:   { label: t("st_completed"),   color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10", icon: <CheckCircle className="w-3 h-3" /> },
    cancelled:   { label: t("st_cancelled"),   color: "text-red-400 border-red-400/30 bg-red-400/10",             icon: <XCircle className="w-3 h-3" /> },
  };

  const FILTER_OPTIONS = [
    { label: t("hist_all"),       value: "" },
    { label: t("hist_pending"),   value: ListBookingsStatus.pending },
    { label: t("hist_accepted"),  value: ListBookingsStatus.accepted },
    { label: t("hist_inprog"),    value: ListBookingsStatus.in_progress },
    { label: t("hist_completed"), value: ListBookingsStatus.completed },
    { label: t("hist_cancelled"), value: ListBookingsStatus.cancelled },
  ] as const;

  const { data: bookings, isLoading, refetch } = useListBookings(
    filter ? { status: filter as typeof ListBookingsStatus[keyof typeof ListBookingsStatus] } : undefined
  );
  const updateStatus = useUpdateBookingStatus();

  const handleCancel = async (id: number) => {
    try {
      await updateStatus.mutateAsync({ id, data: { status: BookingStatusUpdateStatus.cancelled } });
      toast({ title: t("cancel_success"), description: t("cancel_success_desc") });
      refetch();
    } catch (err: any) {
      toast({ title: "Cancellation Failed", description: err.message ?? "Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-primary font-mono text-sm uppercase tracking-widest">{t("hist_label")}</p>
            <h1 className="text-3xl font-bold uppercase mt-1">{t("hist_title")}</h1>
          </div>
          <Button asChild size="sm" className="uppercase font-mono">
            <Link href="/book"><Plus className="w-3 h-3 mr-1" /> {t("hist_new")}</Link>
          </Button>
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
            {bookings.map((booking) => {
              const cfg = STATUS_CONFIG[booking.status ?? "pending"] ?? STATUS_CONFIG.pending;
              const canCancel = CANCELLABLE.has(booking.status ?? "");
              return (
                <div key={booking.id} className="border border-border bg-card p-5 rounded-lg hover:border-primary/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold uppercase">{booking.categoryName ?? "Service"}</span>
                        <span className={`text-xs font-mono border px-2 py-0.5 rounded flex items-center gap-1 ${cfg.color}`}>{cfg.icon}{cfg.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground font-mono">{booking.issueDescription}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {booking.finalCost != null ? (
                        <p className="font-bold text-primary font-mono">${booking.finalCost}</p>
                      ) : booking.estimatedCost != null ? (
                        <p className="text-muted-foreground font-mono text-sm">~${booking.estimatedCost}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground font-mono">{booking.scheduledAt ? new Date(booking.scheduledAt).toLocaleDateString() : ""}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground mb-4">
                    {booking.technicianName && <span className="flex items-center gap-1"><Star className="w-3 h-3 text-primary" /> {booking.technicianName}</span>}
                    {booking.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {booking.address}</span>}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(booking.status === "in_progress" || booking.status === "accepted") && (
                      <Button asChild size="sm" variant="outline" className="text-xs font-mono uppercase">
                        <Link href={`/tracking/${booking.id}`}><MapPin className="w-3 h-3 mr-1" /> {t("hist_track")}</Link>
                      </Button>
                    )}

                    {canCancel && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs font-mono uppercase text-red-400 border-red-400/30 hover:bg-red-400/10 hover:border-red-400/60"
                            disabled={updateStatus.isPending}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            {t("cancel_btn")}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-mono uppercase">{t("cancel_title")}</AlertDialogTitle>
                            <AlertDialogDescription className="font-mono text-sm">{t("cancel_desc")}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="font-mono uppercase text-xs">{t("cancel_abort")}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleCancel(booking.id)}
                              className="font-mono uppercase text-xs bg-red-500 hover:bg-red-600 text-white"
                            >
                              {t("cancel_confirm")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-border bg-card rounded-lg p-16 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-mono text-muted-foreground mb-4">{t("hist_empty")}</p>
            <Button asChild size="sm" className="uppercase font-mono">
              <Link href="/book">{t("hist_book_first")}</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
