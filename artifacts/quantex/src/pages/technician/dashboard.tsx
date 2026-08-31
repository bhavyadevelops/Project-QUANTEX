import React, { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  useGetTechnicianDashboard, useListBookings, useGetMyTechnicianProfile,
  useUpdateTechnicianLocation, useUpdateTechnicianStatus,
  TechnicianStatus,
} from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeEvents } from "@/hooks/use-realtime-events";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2, Zap, CheckCircle, Star, DollarSign, Clock, ArrowRight, AlertCircle,
  Wifi, WifiOff, MapPin, Navigation, Coffee, Shield,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  online:         { label: "ONLINE",          color: "text-emerald-400 border-emerald-400",   icon: <Wifi className="w-4 h-4" />,       description: "Accepting new bookings" },
  offline:        { label: "OFFLINE",         color: "text-muted-foreground border-border",   icon: <WifiOff className="w-4 h-4" />,    description: "Not accepting bookings" },
  busy:           { label: "BUSY",            color: "text-primary border-primary",            icon: <Zap className="w-4 h-4" />,        description: "Working on a job" },
  on_break:       { label: "ON BREAK",        color: "text-yellow-400 border-yellow-400",     icon: <Coffee className="w-4 h-4" />,     description: "Taking a short break" },
  emergency_only: { label: "EMERGENCY ONLY",  color: "text-red-400 border-red-400",           icon: <Shield className="w-4 h-4" />,     description: "Emergency jobs only" },
};

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading } = useGetTechnicianDashboard();
  const { data: pendingJobs } = useListBookings({ status: "pending" });
  const { data: activeJobs } = useListBookings({ status: "in_progress" });
  const { data: profile, refetch: refetchProfile } = useGetMyTechnicianProfile({
    query: {} as any
  });

  const updateLocation = useUpdateTechnicianLocation();
  const updateStatus = useUpdateTechnicianStatus();

  const [isTracking, setIsTracking] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // SSE: refresh dashboard on realtime events
  useRealtimeEvents({
    technicianId: profile?.id,
    enabled: !!profile?.id,
    onEvent: (type) => {
      if (type === "booking_status_changed") {
        queryClient.invalidateQueries({ queryKey: ["listBookings"] });
        queryClient.invalidateQueries({ queryKey: ["getTechnicianDashboard"] });
      }
    },
  });

  const currentStatus = profile?.currentStatus ?? "offline";

  const sendLocation = async (lat: number, lng: number) => {
    if (!profile?.id) return;
    try {
      await updateLocation.mutateAsync({
        id: profile.id,
        data: { latitude: lat, longitude: lng },
      });
    } catch {}
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      toast({ title: "GPS Unavailable", description: "Your browser does not support geolocation.", variant: "destructive" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentCoords({ lat: latitude, lng: longitude });
        await sendLocation(latitude, longitude);

        locationIntervalRef.current = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            async (p) => {
              setCurrentCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
              await sendLocation(p.coords.latitude, p.coords.longitude);
            },
            () => {},
            { enableHighAccuracy: true }
          );
        }, 30_000);

        setIsTracking(true);
        toast({ title: "GPS ACTIVE", description: "Your location is being shared with active customers." });
      },
      (err) => {
        toast({ title: "GPS Permission Denied", description: err.message, variant: "destructive" });
      },
      { enableHighAccuracy: true }
    );
  };

  const stopTracking = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    setIsTracking(false);
    setCurrentCoords(null);
    toast({ title: "GPS STOPPED", description: "Location sharing disabled." });
  };

  useEffect(() => {
    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, []);

  const handleStatusChange = async (newStatus: TechnicianStatus) => {
    if (!profile?.id) return;

    // Going online also starts GPS
    if (newStatus === TechnicianStatus.online && !isTracking) {
      startTracking();
    }
    // Going offline stops GPS
    if (newStatus === TechnicianStatus.offline && isTracking) {
      stopTracking();
    }

    try {
      await updateStatus.mutateAsync({ id: profile.id, data: { currentStatus: newStatus } });
      refetchProfile();
      toast({ title: "STATUS UPDATED", description: `Now: ${STATUS_CONFIG[newStatus]?.label ?? newStatus}` });
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message ?? "Please try again.", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const statusCfg = STATUS_CONFIG[currentStatus] ?? STATUS_CONFIG.offline;

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container mx-auto px-4">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-primary font-mono text-sm uppercase tracking-widest">{t("tech_portal")}</p>
            <h1 className="text-3xl font-bold uppercase mt-1">{t("tech_console")} {user?.name?.split(" ")[0]}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <div className={`flex items-center gap-1.5 border px-2.5 py-1 rounded text-xs font-mono font-bold ${statusCfg.color}`}>
                {statusCfg.icon}
                {statusCfg.label}
              </div>
              {isTracking && currentCoords && (
                <div className="flex items-center gap-1 text-xs font-mono text-primary">
                  <MapPin className="w-3 h-3 animate-pulse" />
                  {currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button asChild variant="outline" size="sm" className="uppercase font-mono">
              <Link href="/technician/bookings">{t("tech_view_jobs")}</Link>
            </Button>
            <Button asChild size="sm" className="uppercase font-mono">
              <Link href="/settings">{t("tech_settings")} <ArrowRight className="w-3 h-3 ml-1" /></Link>
            </Button>
          </div>
        </div>

        {/* Availability selector */}
        <div className="border border-border bg-card rounded-lg p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold uppercase font-mono text-sm">AVAILABILITY</h2>
            {isTracking ? (
              <button
                onClick={stopTracking}
                className="flex items-center gap-1.5 text-xs font-mono border border-primary/40 text-primary px-3 py-1.5 rounded hover:bg-primary/10 transition-colors"
              >
                <Navigation className="w-3 h-3 animate-pulse" />
                GPS ON — STOP
              </button>
            ) : (
              <button
                onClick={startTracking}
                className="flex items-center gap-1.5 text-xs font-mono border border-border text-muted-foreground px-3 py-1.5 rounded hover:border-primary/40 hover:text-primary transition-colors"
              >
                <Navigation className="w-3 h-3" />
                ENABLE GPS
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {(Object.entries(STATUS_CONFIG) as [TechnicianStatus, typeof STATUS_CONFIG[string]][]).map(([status, cfg]) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status as TechnicianStatus)}
                disabled={updateStatus.isPending || currentStatus === status}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all ${
                  currentStatus === status
                    ? `border-current bg-current/10 ${cfg.color}`
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {cfg.icon}
                <span className={`text-xs font-mono font-bold leading-tight ${currentStatus === status ? cfg.color : ""}`}>
                  {cfg.label}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs font-mono text-muted-foreground mt-3">{statusCfg.description}</p>
        </div>

        {/* Stats */}
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
                  {job.address && (
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-xs text-muted-foreground font-mono flex-1">{job.address}</p>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-mono text-primary border border-primary/30 px-2 py-0.5 rounded hover:bg-primary/10 transition-colors"
                      >
                        <Navigation className="w-3 h-3" /> NAV
                      </a>
                    </div>
                  )}
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
