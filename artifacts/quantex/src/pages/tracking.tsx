import React, { useState, useCallback } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetBooking, useGetBookingTracking, useUpdateBookingStatus, BookingStatus } from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, MapPin, CheckCircle, Zap, Star, ArrowLeft, XCircle,
  Navigation, Phone, Clock, Car, Wrench, Package, CreditCard, Search,
} from "lucide-react";
import { useRealtimeEvents, type TechnicianLocationUpdatedPayload } from "@/hooks/use-realtime-events";
import { useQueryClient } from "@tanstack/react-query";

// Extended status order for the full lifecycle
const STATUS_ORDER: Record<string, number> = {
  searching: 0,
  assigned: 1,
  pending: 1,
  accepted: 2,
  travelling: 3,
  arriving: 4,
  reached: 5,
  in_progress: 6,
  waiting_for_parts: 6,
  completed: 7,
  payment_completed: 8,
  cancelled: -1,
};

const CANCELLABLE = new Set(["searching", "assigned", "pending", "accepted"]);

// Timeline steps for customer view
const TIMELINE_STEPS = [
  { key: "pending",     icon: Search,     label: "Booking Requested",    desc: "Your request has been sent" },
  { key: "accepted",   icon: CheckCircle, label: "Technician Assigned",   desc: "A technician accepted your job" },
  { key: "travelling", icon: Car,         label: "On The Way",            desc: "Technician is heading to you" },
  { key: "in_progress",icon: Wrench,      label: "Work In Progress",      desc: "Technician is working on your issue" },
  { key: "completed",  icon: CheckCircle, label: "Job Completed",         desc: "Your issue has been resolved" },
  { key: "payment_completed", icon: CreditCard, label: "Payment Confirmed", desc: "Payment processed successfully" },
];

function MapEmbed({ lat, lng }: { lat: number; lng: number }) {
  const src = `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
  return (
    <div className="w-full h-48 rounded-lg overflow-hidden border border-primary/30 mt-3">
      <iframe
        src={src}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Technician location"
      />
    </div>
  );
}

export default function Tracking() {
  const { id } = useParams<{ id: string }>();
  const [_, setLocation] = useLocation();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const bookingId = parseInt(id ?? "0");
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { data: booking, isLoading, refetch } = useGetBooking(bookingId, {
    query: { enabled: !!bookingId } as any
  });
  const { data: tracking } = useGetBookingTracking(bookingId, {
    query: { enabled: !!bookingId } as any
  });
  const updateStatus = useUpdateBookingStatus();

  // Subscribe to real-time events for this booking
  useRealtimeEvents({
    bookingId,
    technicianId: booking?.technicianId,
    enabled: !!bookingId,
    onEvent: (type, payload) => {
      if (type === "booking_status_changed") {
        refetch();
      }
      if (type === "technician_location_updated") {
        const p = payload as TechnicianLocationUpdatedPayload;
        setLiveLocation({ lat: p.latitude, lng: p.longitude });
      }
    },
  });

  const handleCancel = async () => {
    try {
      await updateStatus.mutateAsync({ id: bookingId, data: { status: BookingStatus.cancelled } });
      toast({ title: t("cancel_success"), description: t("cancel_success_desc") });
      refetch();
      setLocation("/history");
    } catch (err: any) {
      toast({ title: "Cancellation Failed", description: err.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const displayLat = liveLocation?.lat ?? tracking?.technicianLat ?? null;
  const displayLng = liveLocation?.lng ?? tracking?.technicianLng ?? null;
  const displayEta = tracking?.etaMinutes ?? 0;
  const displayProg = tracking?.progress ?? 0;
  const displayDist = (tracking as any)?.distanceKm ?? null;

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!booking) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="font-mono text-muted-foreground">{t("track_not_found")}</p>
      <Button asChild variant="outline"><Link href="/dashboard">← {t("track_dashboard")}</Link></Button>
    </div>
  );

  const currentStatus = booking.status ?? "pending";
  const currentStepIdx = STATUS_ORDER[currentStatus] ?? 0;
  const canCancel = CANCELLABLE.has(currentStatus);
  const isActive = !["completed", "payment_completed", "cancelled"].includes(currentStatus);

  const statusLabel: Record<string, string> = {
    searching: "SEARCHING",
    assigned: "ASSIGNED",
    pending: "PENDING",
    accepted: "ACCEPTED",
    travelling: "EN ROUTE",
    arriving: "ARRIVING",
    reached: "ARRIVED",
    in_progress: "IN PROGRESS",
    waiting_for_parts: "AWAITING PARTS",
    completed: "COMPLETED",
    payment_completed: "PAID",
    cancelled: "CANCELLED",
  };

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <Button asChild variant="ghost" size="sm" className="font-mono text-xs mb-3">
              <Link href="/dashboard"><ArrowLeft className="w-3 h-3 mr-1" /> {t("track_dashboard")}</Link>
            </Button>
            <p className="text-primary font-mono text-sm uppercase tracking-widest">{t("track_label")}</p>
            <h1 className="text-2xl font-bold uppercase mt-1">BOOKING #{bookingId}</h1>
            <div className="flex items-center gap-2 mt-2">
              {isActive && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
              <span className={`text-xs font-mono font-bold uppercase ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {statusLabel[currentStatus] ?? currentStatus.replace("_", " ").toUpperCase()}
              </span>
            </div>
          </div>

          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-mono uppercase mt-10 text-red-400 border-red-400/30 hover:bg-red-400/10 hover:border-red-400/60 flex-shrink-0"
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
                    onClick={handleCancel}
                    className="font-mono uppercase text-xs bg-red-500 hover:bg-red-600 text-white"
                  >
                    {updateStatus.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    {t("cancel_confirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Live status card */}
        {isActive && (
          <div className="border border-primary/40 bg-primary/5 p-6 rounded-lg mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-primary font-mono text-sm font-bold uppercase">
                  {["travelling", "arriving"].includes(currentStatus)
                    ? "TECHNICIAN EN ROUTE"
                    : currentStatus === "in_progress"
                      ? "WORK IN PROGRESS"
                      : "PROCESSING"}
                </span>
              </div>
              {displayEta > 0 && (
                <div className="text-right">
                  <p className="text-2xl font-bold font-mono text-primary">{displayEta} min</p>
                  <p className="text-xs text-muted-foreground font-mono">{t("track_eta")}</p>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full bg-border rounded-full h-2 mb-2">
              <div className="bg-primary h-2 rounded-full transition-all duration-1000" style={{ width: `${displayProg}%` }} />
            </div>
            <p className="text-xs font-mono text-muted-foreground text-right mb-4">{displayProg}%</p>

            {/* Distance */}
            {displayDist !== null && (
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-3">
                <Navigation className="w-3 h-3 text-primary" />
                <span>{displayDist} km away</span>
              </div>
            )}

            {/* Map */}
            {displayLat != null && displayLng != null ? (
              <div>
                <p className="text-xs font-mono text-muted-foreground mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-primary" />
                  TECHNICIAN LOCATION — {displayLat.toFixed(4)}, {displayLng.toFixed(4)}
                </p>
                <MapEmbed lat={displayLat} lng={displayLng} />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground border border-border/50 px-3 py-2 rounded bg-background/30">
                <MapPin className="w-3 h-3 text-primary" />
                Waiting for technician location update...
              </div>
            )}
          </div>
        )}

        {/* Cancelled banner */}
        {currentStatus === "cancelled" && (
          <div className="border border-red-400/40 bg-red-400/5 p-6 rounded-lg mb-6 flex items-center gap-4">
            <XCircle className="w-10 h-10 text-red-400 flex-shrink-0" />
            <div>
              <p className="font-bold uppercase text-red-400 font-mono">{t("cancel_success")}</p>
              <p className="text-sm text-muted-foreground font-mono mt-1">{t("cancel_success_desc")}</p>
            </div>
          </div>
        )}

        {/* Completed banner */}
        {(currentStatus === "completed" || currentStatus === "payment_completed") && (
          <div className="border border-emerald-400/40 bg-emerald-400/5 p-6 rounded-lg mb-6 flex items-center gap-4">
            <CheckCircle className="w-10 h-10 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="font-bold uppercase text-emerald-400 font-mono">{t("track_completed")}</p>
              <p className="text-sm text-muted-foreground font-mono mt-1">{t("track_resolved")}</p>
            </div>
          </div>
        )}

        {/* Lifecycle stepper */}
        <div className="border border-border bg-card rounded-lg p-6 mb-6">
          <h2 className="font-bold uppercase font-mono text-sm mb-4 text-primary">{t("track_timeline")}</h2>
          <div className="space-y-0">
            {TIMELINE_STEPS.map((step, i) => {
              const stepIdx = STATUS_ORDER[step.key] ?? i;
              const done = stepIdx <= currentStepIdx && currentStatus !== "cancelled";
              const active = stepIdx === currentStepIdx && currentStatus !== "cancelled";
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      done
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }`}>
                      {done
                        ? (active && !["completed", "payment_completed"].includes(currentStatus)
                            ? <Zap className="w-4 h-4" />
                            : <Icon className="w-4 h-4" />)
                        : <span className="text-xs font-mono">{i + 1}</span>}
                    </div>
                    {i < TIMELINE_STEPS.length - 1 && (
                      <div className={`w-0.5 h-8 ${done ? "bg-primary" : "bg-border"}`} />
                    )}
                  </div>
                  <div className="pb-6">
                    <p className={`font-bold text-sm uppercase ${done ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Technician card */}
        {booking.technicianName && (
          <div className="border border-border bg-card rounded-lg p-6 mb-6">
            <h2 className="font-bold uppercase font-mono text-sm mb-4 text-primary">{t("track_your_tech")}</h2>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary font-mono">{booking.technicianName.charAt(0)}</span>
              </div>
              <div className="flex-1">
                <p className="font-bold uppercase">{booking.technicianName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Star className="w-3 h-3 fill-primary text-primary" />
                  <span className="text-xs font-mono text-primary">{t("track_expert")}</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {displayLat != null && displayLng != null && (
                  <a
                    href={`https://maps.google.com/?q=${displayLat},${displayLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline" className="text-xs font-mono uppercase">
                      <Navigation className="w-3 h-3 mr-1" /> NAVIGATE
                    </Button>
                  </a>
                )}
                <a href="tel:+18005551234">
                  <Button size="sm" variant="outline" className="text-xs font-mono uppercase text-primary border-primary/40 hover:bg-primary/10">
                    <Phone className="w-3 h-3 mr-1" /> CALL SUPPORT
                  </Button>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Job details */}
        <div className="border border-border bg-card rounded-lg p-6">
          <h2 className="font-bold uppercase font-mono text-sm mb-4 text-primary">{t("track_details")}</h2>
          <div className="space-y-3">
            {[
              { label: t("track_service"),    value: booking.categoryName },
              { label: t("track_address"),    value: booking.address },
              { label: t("track_scheduled"),  value: booking.scheduledAt ? new Date(booking.scheduledAt).toLocaleString() : "ASAP" },
              { label: t("track_est_cost"),   value: booking.estimatedCost ? `$${booking.estimatedCost}` : "TBD" },
              { label: t("track_final_cost"), value: booking.finalCost ? `$${booking.finalCost}` : undefined },
            ].map((r) => r.value ? (
              <div key={r.label} className="flex justify-between py-1 border-b border-border/40">
                <span className="text-xs font-mono text-muted-foreground uppercase">{r.label}</span>
                <span className="text-xs font-mono font-bold">{r.value}</span>
              </div>
            ) : null)}
            <p className="text-xs font-mono text-muted-foreground pt-2">{booking.issueDescription}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
