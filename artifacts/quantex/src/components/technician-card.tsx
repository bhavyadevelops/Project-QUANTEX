import React from "react";
import { Link } from "wouter";
import { Star, MapPin, Clock, Zap, Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Technician } from "@workspace/api-client-react";

interface TechnicianCardProps {
  technician: Technician & { name: string };
  onBook?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; dotColor: string; textColor: string; bg: string }> = {
  online:         { label: "ONLINE",      dotColor: "bg-primary",      textColor: "text-primary",      bg: "bg-primary/10 border-primary/30" },
  offline:        { label: "OFFLINE",     dotColor: "bg-muted-foreground", textColor: "text-muted-foreground", bg: "bg-muted/30 border-border" },
  busy:           { label: "BUSY",        dotColor: "bg-yellow-400",   textColor: "text-yellow-400",   bg: "bg-yellow-400/10 border-yellow-400/30" },
  on_break:       { label: "ON BREAK",    dotColor: "bg-orange-400",   textColor: "text-orange-400",   bg: "bg-orange-400/10 border-orange-400/30" },
  emergency_only: { label: "EMERGENCY",   dotColor: "bg-red-400",      textColor: "text-red-400",      bg: "bg-red-400/10 border-red-400/30" },
};

function StatusDot({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.offline;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono border px-2 py-0.5 rounded ${cfg.bg} ${cfg.textColor}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor} ${status === "online" ? "animate-pulse" : ""}`} />
      {cfg.label}
    </span>
  );
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <Star
          key={i}
          className={`w-3 h-3 ${i <= Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
      <span className="text-xs font-mono text-muted-foreground ml-0.5">
        {rating > 0 ? Number(rating).toFixed(1) : "New"} ({count})
      </span>
    </div>
  );
}

function estimatedArrival(distance: number | null | undefined): string | null {
  if (distance == null) return null;
  const minutes = Math.round((distance / 30) * 60);
  if (minutes < 60) return `~${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `~${hrs}h ${rem}m` : `~${hrs}h`;
}

export function TechnicianCard({ technician: t, onBook }: TechnicianCardProps) {
  // Only truly online/emergency-available statuses allow booking
  const BOOKABLE_STATUSES = new Set(["online", "emergency_only"]);
  const isBookable = t.isAvailable && BOOKABLE_STATUSES.has(t.currentStatus ?? "offline");
  const isDimmed = !t.isAvailable || t.currentStatus === "offline" || t.currentStatus === "busy" || t.currentStatus === "on_break";
  const professions = (t.profession ?? []).slice(0, 2);
  const badges = t.verificationBadges ?? [];
  const isVerified = badges.length > 0;

  return (
    <div className={`border rounded-lg p-5 transition-all duration-200 hover:border-primary/50 group ${
      isDimmed ? "border-border/50 bg-card/60 opacity-60" : "border-border bg-card"
    }`}>
      {/* Top row: avatar + name + status */}
      <div className="flex items-start gap-3 mb-3">
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center overflow-hidden">
            {t.avatarUrl ? (
              <img src={t.avatarUrl} alt={t.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-primary font-mono">
                {t.name?.charAt(0)?.toUpperCase() ?? "T"}
              </span>
            )}
          </div>
          {isVerified && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center border border-background">
              <CheckCircle className="w-2.5 h-2.5 text-black" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold uppercase text-sm leading-tight truncate">{t.name}</h3>
              {professions.length > 0 && (
                <p className="text-xs font-mono text-primary mt-0.5 truncate">{professions.join(" · ")}</p>
              )}
            </div>
            <StatusDot status={t.currentStatus ?? "offline"} />
          </div>

          <div className="mt-1">
            <StarRating rating={t.rating ?? 0} count={t.reviewCount ?? 0} />
          </div>
        </div>
      </div>

      {/* Stats row: Rate | Experience | Est. Arrival (or Jobs Done) */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-xs font-mono">
        <div className="flex flex-col">
          <span className="text-primary font-bold text-base">${t.hourlyRate}<span className="text-[10px] text-muted-foreground">/hr</span></span>
          <span className="text-muted-foreground text-[10px] uppercase">Rate</span>
        </div>
        <div className="flex flex-col">
          {t.yearsExperience != null ? (
            <>
              <span className="text-foreground font-bold text-base">{t.yearsExperience}<span className="text-[10px] text-muted-foreground"> yrs</span></span>
              <span className="text-muted-foreground text-[10px] uppercase">Experience</span>
            </>
          ) : (
            <>
              <span className="text-muted-foreground font-bold text-base">—</span>
              <span className="text-muted-foreground text-[10px] uppercase">Experience</span>
            </>
          )}
        </div>
        <div className="flex flex-col">
          {t.distance != null ? (
            <>
              <span className="text-primary font-bold text-base">{estimatedArrival(t.distance) ?? "—"}</span>
              <span className="text-muted-foreground text-[10px] uppercase">Est. Arrival</span>
            </>
          ) : (
            <>
              <span className="text-foreground font-bold text-base">{t.completedJobs ?? 0}</span>
              <span className="text-muted-foreground text-[10px] uppercase">Jobs Done</span>
            </>
          )}
        </div>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-1.5 mb-3 min-h-[22px]">
        {t.emergencyAvailable && (
          <span className="text-[10px] font-mono border border-yellow-400/40 px-1.5 py-0.5 rounded text-yellow-400 bg-yellow-400/10 flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" /> 24/7
          </span>
        )}
        {isVerified && (
          <span className="text-[10px] font-mono border border-primary/40 px-1.5 py-0.5 rounded text-primary bg-primary/10 flex items-center gap-1">
            <Shield className="w-2.5 h-2.5" /> VERIFIED
          </span>
        )}
        {t.serviceCity && (
          <span className="text-[10px] font-mono border border-border px-1.5 py-0.5 rounded text-muted-foreground flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5" /> {t.serviceCity}
          </span>
        )}
        {(t.skills ?? []).slice(0, 2).map(s => (
          <span key={s} className="text-[10px] font-mono border border-border px-1.5 py-0.5 rounded text-muted-foreground">
            {s}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-border/40">
        <Button asChild variant="outline" size="sm" className="flex-1 text-xs font-mono uppercase h-8">
          <Link href={`/technicians/${t.id}`}>View Profile</Link>
        </Button>
        {isBookable ? (
          <Button asChild size="sm" className="flex-1 text-xs font-mono uppercase h-8">
            <Link href={`/book?technicianId=${t.id}`}>
              <Zap className="w-3 h-3 mr-1" /> Book Now
            </Link>
          </Button>
        ) : (
          <Button size="sm" disabled className="flex-1 text-xs font-mono uppercase h-8">
            Unavailable
          </Button>
        )}
      </div>
    </div>
  );
}
