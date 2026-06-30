import React from "react";
import { Link, useParams } from "wouter";
import { useGetTechnician, useGetTechnicianReviews } from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star, MapPin, Clock, Shield, CheckCircle, AlertTriangle, Zap,
  Briefcase, Globe, DollarSign, Calendar, Award, ChevronLeft
} from "lucide-react";

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <Star
          key={i}
          className={`w-4 h-4 ${i <= Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
      <span className="text-sm font-mono text-muted-foreground ml-1">
        {rating > 0 ? Number(rating).toFixed(1) : "New"} ({count} reviews)
      </span>
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; dotColor: string; bg: string; textColor: string }> = {
  online:         { label: "ONLINE",    dotColor: "bg-primary animate-pulse", bg: "bg-primary/10 border-primary/30",   textColor: "text-primary" },
  offline:        { label: "OFFLINE",   dotColor: "bg-muted-foreground",       bg: "bg-muted/30 border-border",        textColor: "text-muted-foreground" },
  busy:           { label: "BUSY",      dotColor: "bg-yellow-400",             bg: "bg-yellow-400/10 border-yellow-400/30", textColor: "text-yellow-400" },
  on_break:       { label: "ON BREAK",  dotColor: "bg-orange-400",             bg: "bg-orange-400/10 border-orange-400/30", textColor: "text-orange-400" },
  emergency_only: { label: "EMERGENCY", dotColor: "bg-red-400",                bg: "bg-red-400/10 border-red-400/30",   textColor: "text-red-400" },
};

export default function TechnicianDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const { user } = useAuth();

  const techId = Number(id);
  const { data: tech, isLoading } = useGetTechnician(techId, { query: { enabled: !isNaN(techId) } as any });
  const { data: reviews = [] } = useGetTechnicianReviews(techId, { query: { enabled: !isNaN(techId) } as any });

  const isCustomer = user?.role === "customer";
  const BOOKABLE_STATUSES = new Set(["online", "emergency_only"]);
  const isBookable = tech?.isAvailable && BOOKABLE_STATUSES.has(tech?.currentStatus ?? "offline");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-4 w-32 mb-6" />
          <div className="border border-border rounded-lg p-6 space-y-4">
            <div className="flex gap-4">
              <Skeleton className="w-20 h-20 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tech) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-muted-foreground mb-4">Technician not found.</p>
          <Button asChild variant="outline" size="sm" className="font-mono uppercase text-xs">
            <Link href="/marketplace">{t("tech_d_back")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[tech.currentStatus ?? "offline"] ?? STATUS_CONFIG.offline;
  const isVerified = (tech.verificationBadges ?? []).length > 0;
  const services = tech.servicesOffered ?? {};
  const serviceKeys = Object.keys(services);

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Breadcrumb */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-3">
          <Link href="/marketplace" className="text-xs font-mono text-muted-foreground hover:text-primary flex items-center gap-1 w-fit">
            <ChevronLeft className="w-3.5 h-3.5" /> {t("tech_d_back")}
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <p className="text-primary font-mono text-xs uppercase tracking-widest mb-4">{t("tech_d_label")}</p>

        {/* Profile header */}
        <div className="border border-border bg-card rounded-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-5">
            {/* Avatar */}
            <div className="relative shrink-0 self-start">
              <div className="w-20 h-20 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center overflow-hidden">
                {tech.avatarUrl ? (
                  <img src={tech.avatarUrl} alt={(tech as any).name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-primary font-mono">
                    {(tech as any).name?.charAt(0)?.toUpperCase() ?? "T"}
                  </span>
                )}
              </div>
              {isVerified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                  <CheckCircle className="w-3.5 h-3.5 text-black" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div>
                  <h1 className="text-2xl font-bold uppercase">{(tech as any).name}</h1>
                  {(tech.profession ?? []).length > 0 && (
                    <p className="text-primary font-mono text-sm mt-0.5">{tech.profession!.join(" · ")}</p>
                  )}
                </div>
                <span className={`text-xs font-mono border px-3 py-1 rounded flex items-center gap-2 ${statusCfg.bg} ${statusCfg.textColor}`}>
                  <span className={`w-2 h-2 rounded-full ${statusCfg.dotColor}`} />
                  {statusCfg.label}
                </span>
              </div>

              <StarRating rating={tech.rating ?? 0} count={tech.reviewCount ?? 0} />

              {(tech.serviceCity || (tech as any).distance != null) && (
                <p className="text-xs font-mono text-muted-foreground mt-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {tech.serviceCity && <span>{tech.serviceCity}</span>}
                  {tech.serviceRadius && <span>· {tech.serviceRadius} km radius</span>}
                  {(tech as any).distance != null && <span>· {(tech as any).distance} km away</span>}
                </p>
              )}

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {isVerified && (
                  <span className="text-[10px] font-mono border border-primary/40 px-2 py-0.5 rounded text-primary bg-primary/10 flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5" /> VERIFIED
                  </span>
                )}
                {tech.emergencyAvailable && (
                  <span className="text-[10px] font-mono border border-yellow-400/40 px-2 py-0.5 rounded text-yellow-400 bg-yellow-400/10 flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" /> 24/7 EMERGENCY
                  </span>
                )}
                {(tech.verificationBadges ?? []).map(badge => (
                  <span key={badge} className="text-[10px] font-mono border border-border px-2 py-0.5 rounded text-muted-foreground">
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-border">
            {[
              { label: t("tech_d_rate"),      value: `$${tech.hourlyRate}/hr`,          icon: <DollarSign className="w-4 h-4" /> },
              { label: t("tech_d_experience"), value: tech.yearsExperience != null ? `${tech.yearsExperience} yrs` : "—", icon: <Briefcase className="w-4 h-4" /> },
              { label: t("tech_d_completed"),  value: String(tech.completedJobs ?? 0),   icon: <CheckCircle className="w-4 h-4" /> },
              { label: t("tech_d_response"),   value: tech.responseTime ?? "—",          icon: <Clock className="w-4 h-4" /> },
            ].map(s => (
              <div key={s.label} className="flex flex-col">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">{s.icon}</div>
                <span className="text-lg font-bold font-mono text-primary">{s.value}</span>
                <span className="text-[10px] font-mono uppercase text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Book CTA */}
          {isCustomer && (
            <div className="mt-5 pt-5 border-t border-border">
              {isBookable ? (
                <Button asChild className="w-full sm:w-auto font-mono uppercase text-sm">
                  <Link href={`/book?technicianId=${tech.id}`}>
                    <Zap className="w-4 h-4 mr-2" /> {t("tech_d_book")}
                  </Link>
                </Button>
              ) : (
                <Button disabled className="w-full sm:w-auto font-mono uppercase text-sm">
                  Currently Unavailable
                </Button>
              )}
            </div>
          )}
          {!user && (
            <div className="mt-5 pt-5 border-t border-border">
              <Button asChild className="font-mono uppercase text-sm">
                <Link href="/register">Sign Up to Book</Link>
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: main info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Bio */}
            {tech.bio && (
              <div className="border border-border bg-card rounded-lg p-5">
                <h2 className="font-mono uppercase text-xs text-muted-foreground mb-3">{t("tech_d_about")}</h2>
                <p className="text-sm leading-relaxed text-foreground">{tech.bio}</p>
              </div>
            )}

            {/* Services & Skills */}
            <div className="border border-border bg-card rounded-lg p-5">
              <h2 className="font-mono uppercase text-xs text-muted-foreground mb-4">{t("tech_d_services")}</h2>

              {serviceKeys.length > 0 && (
                <div className="space-y-3 mb-4">
                  {serviceKeys.map(cat => (
                    <div key={cat}>
                      <p className="text-xs font-mono uppercase text-primary mb-1.5">{cat}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(services[cat] ?? []).map((s: string) => (
                          <span key={s} className="text-[11px] font-mono border border-border px-2 py-0.5 rounded text-muted-foreground">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(tech.skills ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-mono uppercase text-muted-foreground mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tech.skills!.map(s => (
                      <span key={s} className="text-[11px] font-mono border border-border px-2 py-0.5 rounded text-muted-foreground">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(tech.areasOfExpertise ?? []).length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-mono uppercase text-muted-foreground mb-2">{t("tech_d_areas")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tech.areasOfExpertise!.map(a => (
                      <span key={a} className="text-[11px] font-mono border border-primary/30 px-2 py-0.5 rounded text-primary bg-primary/5">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Certifications */}
            {(tech.certifications ?? []).length > 0 && (
              <div className="border border-border bg-card rounded-lg p-5">
                <h2 className="font-mono uppercase text-xs text-muted-foreground mb-3">{t("tech_d_certs")}</h2>
                <div className="flex flex-wrap gap-2">
                  {tech.certifications!.map(c => (
                    <span key={c} className="flex items-center gap-1.5 text-xs font-mono border border-primary/40 px-3 py-1.5 rounded text-primary bg-primary/5">
                      <Award className="w-3 h-3" /> {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="border border-border bg-card rounded-lg overflow-hidden">
              <div className="p-5 border-b border-border">
                <h2 className="font-mono uppercase text-xs text-muted-foreground">{t("tech_d_reviews")}</h2>
              </div>
              {reviews.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground font-mono text-sm">
                  {t("tech_d_no_reviews")}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {reviews.map(r => (
                    <div key={r.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-bold uppercase">{r.customerName ?? "Customer"}</p>
                          <p className="text-xs font-mono text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} className={`w-3 h-3 ${i <= r.rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column: sidebar details */}
          <div className="space-y-5">
            {/* Availability */}
            <div className="border border-border bg-card rounded-lg p-5">
              <h2 className="font-mono uppercase text-xs text-muted-foreground mb-3">Availability</h2>
              <div className="space-y-2.5 text-xs font-mono">
                {(tech.workingDays ?? []).length > 0 && (
                  <div>
                    <p className="text-muted-foreground uppercase text-[10px] mb-1">{t("tech_d_working_days")}</p>
                    <div className="flex flex-wrap gap-1">
                      {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(day => {
                        const active = tech.workingDays?.some(d => d.toLowerCase().startsWith(day.toLowerCase().substring(0,3)));
                        return (
                          <span key={day} className={`px-1.5 py-0.5 rounded text-[10px] border ${
                            active ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground/40"
                          }`}>{day}</span>
                        );
                      })}
                    </div>
                  </div>
                )}
                {tech.workingHoursStart && tech.workingHoursEnd && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{tech.workingHoursStart} – {tech.workingHoursEnd}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="border border-border bg-card rounded-lg p-5">
              <h2 className="font-mono uppercase text-xs text-muted-foreground mb-3">Pricing</h2>
              <div className="space-y-2 text-xs font-mono">
                {[
                  { label: "Hourly Rate",   val: tech.hourlyRate != null ? `$${tech.hourlyRate}/hr` : null },
                  { label: "Visit Fee",     val: tech.visitCharge != null ? `$${tech.visitCharge}` : null },
                  { label: "Per-Job Rate",  val: tech.perJobRate != null ? `$${tech.perJobRate}` : null },
                  { label: "Inspection",    val: tech.inspectionCharge != null ? `$${tech.inspectionCharge}` : null },
                  { label: "Emergency",     val: tech.emergencyCharge != null ? `$${tech.emergencyCharge}` : null },
                  { label: "Weekend",       val: tech.weekendCharge != null ? `$${tech.weekendCharge}` : null },
                  { label: "Night",         val: tech.nightCharge != null ? `$${tech.nightCharge}` : null },
                ].filter(p => p.val !== null).map(p => (
                  <div key={p.label} className="flex items-center justify-between">
                    <span className="text-muted-foreground uppercase text-[10px]">{p.label}</span>
                    <span className="text-foreground font-bold">{p.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Extra info */}
            {((tech.languagesSpoken ?? []).length > 0 || tech.previousCompany) && (
              <div className="border border-border bg-card rounded-lg p-5">
                <h2 className="font-mono uppercase text-xs text-muted-foreground mb-3">Background</h2>
                <div className="space-y-2 text-xs font-mono">
                  {(tech.languagesSpoken ?? []).length > 0 && (
                    <div className="flex items-start gap-2">
                      <Globe className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground mb-0.5">{t("tech_d_languages")}</p>
                        <p className="text-foreground">{tech.languagesSpoken!.join(", ")}</p>
                      </div>
                    </div>
                  )}
                  {tech.previousCompany && (
                    <div className="flex items-start gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground mb-0.5">Previous Company</p>
                        <p className="text-foreground">{tech.previousCompany}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sticky book button on mobile */}
            {isCustomer && (
              <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
                {isBookable ? (
                  <Button asChild className="w-full font-mono uppercase">
                    <Link href={`/book?technicianId=${tech.id}`}>
                      <Zap className="w-4 h-4 mr-2" /> {t("tech_d_book")}
                    </Link>
                  </Button>
                ) : (
                  <Button disabled className="w-full font-mono uppercase">Currently Unavailable</Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
