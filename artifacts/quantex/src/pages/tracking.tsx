import React, { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { useGetBooking, useGetBookingTracking } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Clock, CheckCircle, Zap, Star, ArrowLeft } from "lucide-react";

const TIMELINE_STEPS = [
  { key: "pending",     label: "Booking Received",    desc: "Your request has been submitted" },
  { key: "accepted",    label: "Technician Assigned",  desc: "A tech has accepted your job" },
  { key: "in_progress", label: "Tech En Route",        desc: "Your technician is on the way" },
  { key: "completed",   label: "Job Complete",          desc: "Issue resolved successfully" },
];

const STATUS_ORDER: Record<string, number> = {
  pending: 0, accepted: 1, in_progress: 2, completed: 3, cancelled: -1,
};

export default function Tracking() {
  const { id } = useParams<{ id: string }>();
  const bookingId = parseInt(id ?? "0");
  const [simEta, setSimEta] = useState(Math.floor(Math.random() * 20) + 5);
  const [simProgress, setSimProgress] = useState(10);

  const { data: booking, isLoading } = useGetBooking(bookingId, {
    query: { enabled: !!bookingId, refetchInterval: 15_000 } as any
  });

  const { data: tracking } = useGetBookingTracking(bookingId, {
    query: { enabled: !!bookingId, refetchInterval: 10_000 } as any
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setSimEta((prev) => Math.max(0, prev - 1));
      setSimProgress((prev) => Math.min(95, prev + 2));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const displayEta   = tracking?.etaMinutes  ?? simEta;
  const displayProg  = tracking?.progress    ?? simProgress;
  const displayLat   = tracking?.technicianLat;
  const displayLng   = tracking?.technicianLng;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="font-mono text-muted-foreground">Booking not found.</p>
        <Button asChild variant="outline"><Link href="/dashboard">← Dashboard</Link></Button>
      </div>
    );
  }

  const currentStepIdx = STATUS_ORDER[booking.status ?? "pending"] ?? 0;

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="font-mono text-xs mb-4">
            <Link href="/dashboard"><ArrowLeft className="w-3 h-3 mr-1" /> Dashboard</Link>
          </Button>
          <p className="text-primary font-mono text-sm uppercase tracking-widest">Live Tracking</p>
          <h1 className="text-2xl font-bold uppercase mt-1">Job #{bookingId}</h1>
        </div>

        {booking.status !== "completed" && booking.status !== "cancelled" && (
          <div className="border border-primary/40 bg-primary/5 p-6 rounded-lg mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-primary font-mono text-sm font-bold uppercase">
                  {booking.status === "in_progress" ? "Tech En Route" : "Processing"}
                </span>
              </div>
              {booking.status === "in_progress" && (
                <div className="text-right">
                  <p className="text-2xl font-bold font-mono text-primary">{displayEta} min</p>
                  <p className="text-xs text-muted-foreground font-mono">ETA</p>
                </div>
              )}
            </div>

            <div className="w-full bg-border rounded-full h-2 mb-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-1000"
                style={{ width: `${displayProg}%` }}
              />
            </div>
            <p className="text-xs font-mono text-muted-foreground text-right">{displayProg}%</p>

            {displayLat != null && displayLng != null && (
              <div className="mt-4 flex items-center gap-2 text-xs font-mono text-muted-foreground border border-border/50 px-3 py-2 rounded bg-background/30">
                <MapPin className="w-3 h-3 text-primary" />
                {displayLat.toFixed(4)}, {displayLng.toFixed(4)}
              </div>
            )}
          </div>
        )}

        {booking.status === "completed" && (
          <div className="border border-emerald-400/40 bg-emerald-400/5 p-6 rounded-lg mb-6 flex items-center gap-4">
            <CheckCircle className="w-10 h-10 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="font-bold uppercase text-emerald-400 font-mono">Job Completed</p>
              <p className="text-sm text-muted-foreground font-mono mt-1">Your issue has been resolved.</p>
            </div>
          </div>
        )}

        <div className="border border-border bg-card rounded-lg p-6 mb-6">
          <h2 className="font-bold uppercase font-mono text-sm mb-4 text-primary">Job Timeline</h2>
          <div className="space-y-0">
            {TIMELINE_STEPS.map((step, i) => {
              const done = i <= currentStepIdx;
              const active = i === currentStepIdx;
              return (
                <div key={step.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${done ? "bg-primary border-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`}>
                      {done ? (active && booking.status !== "completed" ? <Zap className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />) : <span className="text-xs font-mono">{i + 1}</span>}
                    </div>
                    {i < TIMELINE_STEPS.length - 1 && <div className={`w-0.5 h-8 ${done ? "bg-primary" : "bg-border"}`} />}
                  </div>
                  <div className="pb-6">
                    <p className={`font-bold text-sm uppercase ${done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                    <p className="text-xs font-mono text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {booking.technicianName && (
          <div className="border border-border bg-card rounded-lg p-6 mb-6">
            <h2 className="font-bold uppercase font-mono text-sm mb-4 text-primary">Your Technician</h2>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary font-mono">
                  {booking.technicianName.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-bold uppercase">{booking.technicianName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Star className="w-3 h-3 fill-primary text-primary" />
                  <span className="text-xs font-mono text-primary">Expert Technician</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="border border-border bg-card rounded-lg p-6">
          <h2 className="font-bold uppercase font-mono text-sm mb-4 text-primary">Job Details</h2>
          <div className="space-y-3">
            {[
              { label: "Service",   value: booking.categoryName },
              { label: "Address",   value: booking.address },
              { label: "Scheduled", value: booking.scheduledAt ? new Date(booking.scheduledAt).toLocaleString() : "ASAP" },
              { label: "Est. Cost", value: booking.estimatedCost ? `$${booking.estimatedCost}` : "TBD" },
              { label: "Final Cost", value: booking.finalCost ? `$${booking.finalCost}` : undefined },
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
