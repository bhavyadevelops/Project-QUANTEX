import React from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useGetTechnicianDashboard, useListBookings } from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, CheckCircle, Star, DollarSign, Clock, ArrowRight, AlertCircle } from "lucide-react";

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: dashboard, isLoading } = useGetTechnicianDashboard();
  const { data: pendingJobs } = useListBookings({ status: "pending" });
  const { data: activeJobs } = useListBookings({ status: "in_progress" });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container mx-auto px-4">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-primary font-mono text-sm uppercase tracking-widest">{t("tech_portal")}</p>
            <h1 className="text-3xl font-bold uppercase mt-1">{t("tech_console")} {user?.name?.split(" ")[0]}</h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-mono text-primary uppercase">{t("tech_active_op")}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline" size="sm" className="uppercase font-mono">
              <Link href="/technician/bookings">{t("tech_view_jobs")}</Link>
            </Button>
            <Button asChild size="sm" className="uppercase font-mono">
              <Link href="/settings">{t("tech_settings")} <ArrowRight className="w-3 h-3 ml-1" /></Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: t("tech_completed"), value: dashboard?.completedJobs ?? 0,      icon: <CheckCircle className="w-5 h-5" />, color: "text-emerald-400" },
            { label: t("tech_active"),    value: dashboard?.activeJobs ?? 0,          icon: <Zap className="w-5 h-5" />,        color: "text-primary" },
            { label: t("tech_rating"),    value: dashboard?.rating ? `${Number(dashboard.rating).toFixed(1)}★` : "N/A", icon: <Star className="w-5 h-5" />, color: "text-yellow-400" },
            { label: t("tech_earned"),    value: dashboard?.totalEarnings ? `$${dashboard.totalEarnings}` : "$0", icon: <DollarSign className="w-5 h-5" />, color: "text-emerald-400" },
          ].map((stat) => (
            <div key={stat.label} className="border border-border bg-card p-5 rounded-lg hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className={stat.color}>{stat.icon}</span>
                <span className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</span>
              </div>
              <p className="text-xs text-muted-foreground font-mono uppercase">{stat.label}</p>
            </div>
          ))}
        </div>

        {pendingJobs && pendingJobs.length > 0 && (
          <div className="border border-yellow-400/30 bg-yellow-400/5 rounded-lg mb-8">
            <div className="p-5 border-b border-yellow-400/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <h2 className="font-bold uppercase font-mono text-sm text-yellow-400">
                  {pendingJobs.length} {pendingJobs.length > 1 ? t("tech_pending_reqs") : t("tech_pending_req")}
                </h2>
              </div>
              <Button asChild size="sm" variant="outline" className="text-xs font-mono uppercase border-yellow-400/40 text-yellow-400">
                <Link href="/technician/bookings">{t("tech_accept_jobs")}</Link>
              </Button>
            </div>
            <div className="divide-y divide-yellow-400/10">
              {pendingJobs.slice(0, 3).map((job) => (
                <div key={job.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm uppercase">{job.categoryName ?? "Service"}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{job.issueDescription?.slice(0, 60)}...</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">{job.address}</p>
                    </div>
                    <span className="text-xs font-mono text-primary">{job.estimatedCost ? `~$${job.estimatedCost}` : "Quote"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-border bg-card rounded-lg overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-bold uppercase font-mono text-sm">{t("tech_active_title")}</h2>
              <Button asChild variant="ghost" size="sm" className="text-xs font-mono text-primary">
                <Link href="/technician/bookings">{t("tech_view_all")}</Link>
              </Button>
            </div>
            <div className="divide-y divide-border">
              {activeJobs?.length ? activeJobs.map((job) => (
                <div key={job.id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm uppercase">{job.categoryName ?? "Service"}</span>
                    <span className="text-xs font-mono border px-2 py-0.5 rounded text-primary border-primary/30 bg-primary/10 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> {t("tech_in_progress")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{job.issueDescription?.slice(0, 80)}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{job.address}</p>
                </div>
              )) : (
                <div className="p-8 text-center">
                  <p className="text-xs font-mono text-muted-foreground">{t("tech_no_active")}</p>
                </div>
              )}
            </div>
          </div>

          <div className="border border-border bg-card rounded-lg overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="font-bold uppercase font-mono text-sm">{t("tech_perf")}</h2>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: t("tech_acceptance"), value: dashboard?.acceptanceRate ? `${dashboard.acceptanceRate}%` : "N/A",   icon: <CheckCircle className="w-4 h-4 text-emerald-400" /> },
                { label: t("tech_pending"),    value: dashboard?.pendingRequests ?? 0, icon: <Clock className="w-4 h-4 text-yellow-400" /> },
                { label: t("tech_month"),      value: dashboard?.thisMonthEarnings ? `$${dashboard.thisMonthEarnings}` : "$0", icon: <DollarSign className="w-4 h-4 text-primary" /> },
                { label: t("tech_rating"),     value: dashboard?.rating ? `${Number(dashboard.rating).toFixed(1)} / 5.0` : "N/A", icon: <Star className="w-4 h-4 text-yellow-400" /> },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between py-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    {r.icon}
                    <span className="text-xs font-mono text-muted-foreground uppercase">{r.label}</span>
                  </div>
                  <span className="text-sm font-mono font-bold">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
