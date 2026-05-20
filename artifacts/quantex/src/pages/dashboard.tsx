import React from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useGetCustomerDashboard, useListBookings } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck, Zap, Star, Clock, ArrowRight, Loader2, AlertCircle, CheckCircle, XCircle, MapPin, DollarSign
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:     { label: "PENDING",     color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",    icon: <Clock className="w-3 h-3" /> },
  accepted:    { label: "ACCEPTED",    color: "text-blue-400 border-blue-400/30 bg-blue-400/10",          icon: <AlertCircle className="w-3 h-3" /> },
  in_progress: { label: "IN PROGRESS", color: "text-primary border-primary/30 bg-primary/10",             icon: <Zap className="w-3 h-3" /> },
  completed:   { label: "COMPLETED",   color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10", icon: <CheckCircle className="w-3 h-3" /> },
  cancelled:   { label: "CANCELLED",   color: "text-red-400 border-red-400/30 bg-red-400/10",             icon: <XCircle className="w-3 h-3" /> },
};

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { data: dashboard, isLoading } = useGetCustomerDashboard();
  const { data: bookings } = useListBookings({ status: "in_progress" });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeBooking = bookings?.[0];

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container mx-auto px-4">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-primary font-mono text-sm uppercase tracking-widest">Customer Portal</p>
            <h1 className="text-3xl font-bold uppercase mt-1">Welcome, {user?.name?.split(" ")[0]}</h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">{user?.email}</p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline" size="sm" className="uppercase font-mono">
              <Link href="/ai-assistant">AI Diagnostics</Link>
            </Button>
            <Button asChild size="sm" className="uppercase font-mono">
              <Link href="/book">Book Tech <ArrowRight className="w-3 h-3 ml-1" /></Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Active Jobs",     value: dashboard?.activeBookings ?? 0,    icon: <Zap className="w-5 h-5" /> },
            { label: "Completed",       value: dashboard?.completedBookings ?? 0,  icon: <CheckCircle className="w-5 h-5" /> },
            { label: "Upcoming",        value: dashboard?.upcomingBookings ?? 0,   icon: <CalendarCheck className="w-5 h-5" /> },
            { label: "Total Spent",     value: dashboard?.totalSpent ? `$${dashboard.totalSpent}` : "$0", icon: <DollarSign className="w-5 h-5" /> },
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

        {activeBooking && (
          <div className="border border-primary/40 bg-primary/5 p-6 rounded-lg mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <h2 className="font-bold uppercase font-mono text-primary text-sm">Active Job</h2>
              </div>
              <Button asChild size="sm" variant="outline" className="text-xs font-mono uppercase">
                <Link href={`/tracking/${activeBooking.id}`}>
                  <MapPin className="w-3 h-3 mr-1" /> Live Track
                </Link>
              </Button>
            </div>
            <p className="font-bold uppercase text-sm mb-1">{activeBooking.categoryName ?? "Service"}</p>
            <p className="text-muted-foreground font-mono text-sm">{activeBooking.issueDescription}</p>
            <p className="text-xs font-mono text-muted-foreground mt-2">
              Technician: {activeBooking.technicianName ?? "Assigned"}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-border bg-card rounded-lg overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-bold uppercase font-mono text-sm">Recent Bookings</h2>
              <Button asChild variant="ghost" size="sm" className="text-xs font-mono text-primary">
                <Link href="/history">View All</Link>
              </Button>
            </div>
            <div className="divide-y divide-border">
              {dashboard?.recentBookings?.length ? dashboard.recentBookings.slice(0, 5).map((b) => {
                const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pending;
                return (
                  <div key={b.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold uppercase">{b.categoryName ?? "Service"}</span>
                      <span className={`text-xs font-mono border px-2 py-0.5 rounded flex items-center gap-1 ${cfg.color}`}>
                        {cfg.icon}{cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">{b.issueDescription}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {b.scheduledAt ? new Date(b.scheduledAt).toLocaleDateString() : ""}
                    </p>
                  </div>
                );
              }) : (
                <div className="p-8 text-center text-muted-foreground font-mono text-sm">
                  No bookings yet. <Link href="/book" className="text-primary hover:underline">Book one now</Link>
                </div>
              )}
            </div>
          </div>

          <div className="border border-border bg-card rounded-lg overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="font-bold uppercase font-mono text-sm">Quick Actions</h2>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <Button asChild className="justify-start uppercase font-mono" variant="outline">
                <Link href="/book"><Zap className="w-4 h-4 mr-2 text-primary" /> Book a Technician</Link>
              </Button>
              <Button asChild className="justify-start uppercase font-mono" variant="outline">
                <Link href="/ai-assistant"><Star className="w-4 h-4 mr-2 text-primary" /> AI Issue Diagnostics</Link>
              </Button>
              <Button asChild className="justify-start uppercase font-mono" variant="outline">
                <Link href="/history"><Clock className="w-4 h-4 mr-2 text-primary" /> Booking History</Link>
              </Button>
              <Button asChild className="justify-start uppercase font-mono" variant="outline">
                <Link href="/settings"><CalendarCheck className="w-4 h-4 mr-2 text-primary" /> Profile Settings</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
