import React from "react";
import { useGetAnalyticsSummary } from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";
import { Loader2, Activity, CheckCircle, Clock, XCircle, Zap, Users, Star, DollarSign, Wrench } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const TOOLTIP_STYLE = {
  backgroundColor: "#0a0a0a",
  border: "1px solid #22c55e33",
  borderRadius: "6px",
  fontFamily: "monospace",
  fontSize: "11px",
  color: "#d1fae5",
};

export default function Analytics() {
  const { t } = useLanguage();
  const { data, isLoading } = useGetAnalyticsSummary({ query: { refetchInterval: 60_000 } as any });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusData = data ? [
    { name: "Completed", value: data.completedJobs,  fill: "#22c55e" },
    { name: "Pending",   value: data.pendingJobs,    fill: "#f59e0b" },
    { name: "Active",    value: data.activeJobs ?? 0, fill: "#3b82f6" },
    { name: "Cancelled", value: data.cancelledJobs,  fill: "#ef4444" },
  ].filter(s => s.value > 0) : [];

  const completionRate = data && data.totalRequests > 0
    ? Math.round((data.completedJobs / data.totalRequests) * 100)
    : 0;

  const KPI_CARDS = [
    { label: t("an_total"),     value: data?.totalRequests ?? 0,           icon: <Activity className="w-5 h-5" />,     color: "text-primary border-primary/30 bg-primary/5" },
    { label: t("an_completed"), value: data?.completedJobs ?? 0,           icon: <CheckCircle className="w-5 h-5" />,  color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/5" },
    { label: t("an_pending"),   value: data?.pendingJobs ?? 0,             icon: <Clock className="w-5 h-5" />,        color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5" },
    { label: t("an_active"),    value: data?.activeJobs ?? 0,              icon: <Zap className="w-5 h-5" />,          color: "text-blue-400 border-blue-400/30 bg-blue-400/5" },
    { label: t("an_cancelled"), value: data?.cancelledJobs ?? 0,           icon: <XCircle className="w-5 h-5" />,      color: "text-red-400 border-red-400/30 bg-red-400/5" },
    { label: t("an_avg_cost"),  value: `$${data?.averageRepairCost?.toFixed(0) ?? 0}`, icon: <DollarSign className="w-5 h-5" />, color: "text-primary border-primary/30 bg-primary/5" },
    { label: t("an_techs"),     value: data?.technicianCount ?? 0,         icon: <Wrench className="w-5 h-5" />,       color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/5" },
    { label: t("an_customers"), value: data?.customerCount ?? 0,           icon: <Users className="w-5 h-5" />,        color: "text-blue-400 border-blue-400/30 bg-blue-400/5" },
    { label: t("an_rating"),    value: data?.averageTechnicianRating?.toFixed(1) ?? "—", icon: <Star className="w-5 h-5" />, color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5" },
  ];

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-10">
          <p className="text-primary font-mono text-sm uppercase tracking-widest">{t("an_label")}</p>
          <h1 className="text-3xl font-bold uppercase mt-1">{t("an_title")}</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">{t("an_subtitle")}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
          {KPI_CARDS.map((kpi) => (
            <div key={kpi.label} className={`border rounded-lg p-4 ${kpi.color}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="opacity-70">{kpi.icon}</span>
                <span className="text-2xl font-bold font-mono">{kpi.value}</span>
              </div>
              <p className="text-xs font-mono uppercase opacity-70">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Completion rate banner */}
        <div className="border border-primary/30 bg-primary/5 rounded-lg p-5 mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase text-primary font-bold">{t("an_completion_rate")}</span>
            <span className="text-2xl font-bold font-mono text-primary">{completionRate}%</span>
          </div>
          <div className="w-full bg-border rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${completionRate}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Categories bar chart */}
          {data?.topCategories && data.topCategories.length > 0 && (
            <div className="border border-border bg-card rounded-lg p-5">
              <h2 className="font-bold uppercase font-mono text-sm text-primary mb-4">{t("an_top_cats")}</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.topCategories} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#22c55e10" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fontFamily: "monospace", fill: "#6b7280" }}
                    tickFormatter={(v) => v.split("/")[0].split(" ")[0]}
                  />
                  <YAxis tick={{ fontSize: 10, fontFamily: "monospace", fill: "#6b7280" }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="#22c55e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Status distribution pie chart */}
          {statusData.length > 0 && (
            <div className="border border-border bg-card rounded-lg p-5">
              <h2 className="font-bold uppercase font-mono text-sm text-primary mb-4">{t("an_status_dist")}</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    style={{ fontSize: 10, fontFamily: "monospace" }}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Tech performance summary */}
        <div className="border border-border bg-card rounded-lg p-5">
          <h2 className="font-bold uppercase font-mono text-sm text-primary mb-4">{t("an_platform_health")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: t("an_tech_count"),   value: data?.technicianCount ?? 0,                       badge: "text-primary" },
              { label: t("an_cust_count"),   value: data?.customerCount ?? 0,                         badge: "text-blue-400" },
              { label: t("an_avg_rating"),   value: `${data?.averageTechnicianRating?.toFixed(1) ?? "—"} ★`, badge: "text-yellow-400" },
              { label: t("an_avg_rev"),      value: `$${data?.averageRepairCost?.toFixed(0) ?? 0}`,  badge: "text-emerald-400" },
            ].map((s) => (
              <div key={s.label} className="text-center py-3 border border-border/50 rounded-lg">
                <p className={`text-2xl font-bold font-mono ${s.badge}`}>{s.value}</p>
                <p className="text-xs font-mono text-muted-foreground uppercase mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
