import React from "react";
import { Star, MapPin, Zap, Shield, Clock, DollarSign, CheckCircle } from "lucide-react";
import type { Technician } from "@workspace/api-client-react";

interface TechnicianProfileCardProps {
  technician: Technician & { name: string };
  compact?: boolean;
}

export function TechnicianProfileCard({ technician: t, compact = false }: TechnicianProfileCardProps) {
  const certList = t.certifications ?? [];
  const skillList = t.skills ?? [];
  const langs = t.languagesSpoken ?? [];
  const professions = t.profession ?? [];

  return (
    <div className={`border border-primary/30 bg-primary/5 rounded-lg ${compact ? "p-4" : "p-5"} space-y-3`}>
      <div className="flex items-start gap-4">
        <div className={`${compact ? "w-12 h-12" : "w-14 h-14"} rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0`}>
          {t.avatarUrl ? (
            <img src={t.avatarUrl} alt={t.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className={`${compact ? "text-lg" : "text-xl"} font-bold text-primary font-mono`}>
              {t.name?.charAt(0) ?? "T"}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold uppercase text-base leading-tight">{t.name}</h3>
          {professions.length > 0 && (
            <p className="text-xs font-mono text-primary mt-0.5">{professions.join(" · ")}</p>
          )}
          {t.serviceCity && (
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              <MapPin className="w-3 h-3 inline mr-1" />{t.serviceCity}
              {t.serviceRadius ? ` · ${t.serviceRadius} km` : ""}
            </p>
          )}
        </div>
        <div className="text-right shrink-0 space-y-1">
          <p className={`${compact ? "text-lg" : "text-xl"} font-bold font-mono text-primary`}>
            ${t.hourlyRate}<span className="text-xs text-muted-foreground">/hr</span>
          </p>
          <div className="flex items-center gap-1 justify-end">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-mono text-muted-foreground">
              {t.rating ? Number(t.rating).toFixed(1) : "New"} ({t.reviewCount ?? 0})
            </span>
          </div>
          {t.emergencyAvailable && (
            <span className="text-[10px] font-mono bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 px-1.5 py-0.5 rounded block text-center">
              24/7
            </span>
          )}
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded block text-center ${
            t.isAvailable
              ? "bg-primary/15 text-primary border border-primary/30"
              : "bg-muted text-muted-foreground border border-border"
          }`}>
            {t.isAvailable ? "AVAILABLE" : "BUSY"}
          </span>
        </div>
      </div>

      {t.bio && !compact && (
        <p className="text-sm text-muted-foreground border-t border-border/40 pt-3 leading-relaxed">
          {t.bio}
        </p>
      )}

      <div className={`grid ${compact ? "grid-cols-2" : "grid-cols-3"} gap-2 text-xs font-mono border-t border-border/40 pt-3`}>
        {t.yearsExperience != null && (
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3 h-3 text-primary shrink-0" />
            <span className="text-muted-foreground">{t.yearsExperience} yrs exp</span>
          </div>
        )}
        {t.responseTime && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-primary shrink-0" />
            <span className="text-muted-foreground">~{t.responseTime}</span>
          </div>
        )}
        {t.visitCharge != null && (
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-3 h-3 text-primary shrink-0" />
            <span className="text-muted-foreground">${t.visitCharge} visit fee</span>
          </div>
        )}
        {t.workingDays && t.workingDays.length > 0 && (
          <div className="flex items-center gap-1.5 col-span-2">
            <Zap className="w-3 h-3 text-primary shrink-0" />
            <span className="text-muted-foreground">{t.workingDays.join(", ")}</span>
          </div>
        )}
        {langs.length > 0 && (
          <div className="flex items-center gap-1.5 col-span-2">
            <span className="text-muted-foreground">🗣 {langs.join(", ")}</span>
          </div>
        )}
      </div>

      {(skillList.length > 0 || certList.length > 0) && (
        <div className="border-t border-border/40 pt-3 space-y-2">
          {skillList.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {skillList.slice(0, compact ? 5 : 10).map(s => (
                <span key={s} className="text-[10px] font-mono border border-border px-2 py-0.5 rounded text-muted-foreground">
                  {s}
                </span>
              ))}
            </div>
          )}
          {certList.length > 0 && !compact && (
            <div className="flex flex-wrap gap-1.5">
              {certList.map(c => (
                <span key={c} className="text-[10px] font-mono border border-primary/40 px-2 py-0.5 rounded text-primary bg-primary/10">
                  <Shield className="w-2.5 h-2.5 inline mr-0.5" />{c}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {t.completedJobs > 0 && (
        <div className="flex items-center gap-3 border-t border-border/40 pt-3">
          <span className="text-xs font-mono text-muted-foreground">
            <span className="text-primary font-bold">{t.completedJobs}</span> jobs completed
          </span>
        </div>
      )}
    </div>
  );
}
