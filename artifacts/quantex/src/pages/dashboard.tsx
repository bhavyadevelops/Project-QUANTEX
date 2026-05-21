import React from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useGetCustomerDashboard, useListBookings, useUpdateBookingStatus, BookingStatusUpdateStatus } from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { CalendarCheck, Zap, Star, Clock, ArrowRight, Loader2, AlertCircle, CheckCircle, XCircle, MapPin, DollarSign } from "lucide-react";

const CANCELLABLE = new Set(["pending", "accepted"]);

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: dashboard, isLoading } = useGetCustomerDashboard();
  const { data: bookings, refetch: refetchBookings } = useListBookings({ status: "in_progress" });
  const { data: pendingBookings, refetch: refetchPending } = useListBookings({ status: "pending" });
  const updateStatus = useUpdateBookingStatus();

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending:     { label: t("st_pending"),     color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",    icon: <Clock className="w-3 h-3" /> },
    accepted:    { label: t("st_accepted"),    color: "text-blue-400 border-blue-400/30 bg-blue-400/10",          icon: <AlertCircle className="w-3 h-3" /> },
    in_progress: { label: t("st_in_progress"), color: "text-primary border-primary/30 bg-primary/10",             icon: <Zap className="w-3 h-3" /> },
    completed:   { label: t("st_completed"),   color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10", icon: <CheckCircle className="w-3 h-3" /> },
    cancelled:   { label: t("st_cancelled"),   color: "text-red-400 border-red-400/30 bg-red-400/10",             icon: <XCircle className="w-3 h-3" /> },
  };

  const handleCancel = async (id: number) => {
    try {
      await updateStatus.mutateAsync({ id, data: { status: BookingStatusUpdateStatus.cancelled } });
      toast({ title: t("cancel_success"), description: t("cancel_success_desc") });
      refetchBookings();
      refetchPending();
    } catch (err: any) {
      toast({ title: "Cancellation Failed", description: err.message ?? "Please try again.", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const activeBooking = bookings?.[0];
  const pendingBooking = pendingBookings?.[0];
  const featuredBooking = activeBooking ?? pendingBooking;

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container mx-auto px-4">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-primary font-mono text-sm uppercase tracking-widest">{t("dash_portal")}</p>
            <h1 className="text-3xl font-bold uppercase mt-1">{t("dash_welcome")} {user?.name?.split(" ")[0]}</h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">{user?.email}</p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline" size="sm" className="uppercase font-mono">
              <Link href="/ai-assistant">{t("dash_ai_btn")}</Link>
            </Button>
            <Button asChild size="sm" className="uppercase font-mono">
              <Link href="/book">{t("dash_book_btn")} <ArrowRight className="w-3 h-3 ml-1" /></Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: t("dash_active"),    value: dashboard?.activeBookings ?? 0,    icon: <Zap className="w-5 h-5" /> },
            { label: t("dash_completed"), value: dashboard?.completedBookings ?? 0,  icon: <CheckCircle className="w-5 h-5" /> },
            { label: t("dash_upcoming"),  value: dashboard?.upcomingBookings ?? 0,   icon: <CalendarCheck className="w-5 h-5" /> },
            { label: t("dash_spent"),     value: dashboard?.totalSpent ? `$${dashboard.totalSpent}` : "$0", icon: <DollarSign className="w-5 h-5" /> },
          ].map((stat) => (
            <div key={stat.label} className="border border-border bg-card p-5 rounded-lg hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-muted-foreground">{stat.icon}</span>
                <span className="text-2xl font-bold font-mono text-primary">{stat.value}</span>
              </div>
              <p className="text-xs text-muted-foreground font-mono uppercase">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Active / Pending job card */}
        {featuredBooking && (
          <div className={`border p-6 rounded-lg mb-8 ${
            featuredBooking.status === "in_progress"
              ? "border-primary/40 bg-primary/5"
              : "border-yellow-400/30 bg-yellow-400/5"
          }`}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${featuredBooking.status === "in_progress" ? "bg-primary" : "bg-yellow-400"}`} />
                <h2 className={`font-bold uppercase font-mono text-sm ${featuredBooking.status === "in_progress" ? "text-primary" : "text-yellow-400"}`}>
                  {t("dash_active_job")}
                </h2>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {featuredBooking.status === "in_progress" && (
                  <Button asChild size="sm" variant="outline" className="text-xs font-mono uppercase">
                    <Link href={`/tracking/${featuredBooking.id}`}>
                      <MapPin className="w-3 h-3 mr-1" /> {t("dash_live_track")}
                    </Link>
                  </Button>
                )}

                {/* Cancel button for pending/accepted bookings on the dashboard */}
                {CANCELLABLE.has(featuredBooking.status ?? "") && (
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
                          onClick={() => handleCancel(featuredBooking.id)}
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
            </div>
            <p className="font-bold uppercase text-sm mb-1">{featuredBooking.categoryName ?? "Service"}</p>
            <p className="text-muted-foreground font-mono text-sm">{featuredBooking.issueDescription}</p>
            <p className="text-xs font-mono text-muted-foreground mt-2">{t("dash_tech_label")} {featuredBooking.technicianName ?? "Assigned"}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent bookings */}
          <div className="border border-border bg-card rounded-lg overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-bold uppercase font-mono text-sm">{t("dash_recent")}</h2>
              <Button asChild variant="ghost" size="sm" className="text-xs font-mono text-primary">
                <Link href="/history">{t("dash_view_all")}</Link>
              </Button>
            </div>
            <div className="divide-y divide-border">
              {dashboard?.recentBookings?.length ? dashboard.recentBookings.slice(0, 5).map((b) => {
                const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pending;
                return (
                  <div key={b.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold uppercase">{b.categoryName ?? "Service"}</span>
                      <span className={`text-xs font-mono border px-2 py-0.5 rounded flex items-center gap-1 ${cfg.color}`}>{cfg.icon}{cfg.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">{b.issueDescription}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">{b.scheduledAt ? new Date(b.scheduledAt).toLocaleDateString() : ""}</p>
                  </div>
                );
              }) : (
                <div className="p-8 text-center text-muted-foreground font-mono text-sm">
                  {t("dash_no_bookings")} <Link href="/book" className="text-primary hover:underline">{t("dash_book_now")}</Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="border border-border bg-card rounded-lg overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="font-bold uppercase font-mono text-sm">{t("dash_quick")}</h2>
            </div>
            <div className="p-5 flex flex-col gap-3">
              {[
                { href: "/book",         icon: <Zap className="w-4 h-4 mr-2 text-primary" />,          label: t("dash_act_book") },
                { href: "/ai-assistant", icon: <Star className="w-4 h-4 mr-2 text-primary" />,         label: t("dash_act_ai") },
                { href: "/history",      icon: <Clock className="w-4 h-4 mr-2 text-primary" />,        label: t("dash_act_history") },
                { href: "/settings",     icon: <CalendarCheck className="w-4 h-4 mr-2 text-primary" />, label: t("dash_act_settings") },
              ].map((a) => (
                <Button key={a.href} asChild className="justify-start uppercase font-mono" variant="outline">
                  <Link href={a.href}>{a.icon}{a.label}</Link>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
