import React, { useState } from "react";
import { useListBookings, useUpdateBookingStatus } from "@workspace/api-client-react";
import { BookingStatusUpdateStatus, ListBookingsStatus } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Zap, Clock, MapPin, User, Plus } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:     { label: "PENDING",     color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10", icon: <Clock className="w-3 h-3" /> },
  accepted:    { label: "ACCEPTED",    color: "text-blue-400 border-blue-400/30 bg-blue-400/10",       icon: <CheckCircle className="w-3 h-3" /> },
  in_progress: { label: "IN PROGRESS", color: "text-primary border-primary/30 bg-primary/10",          icon: <Zap className="w-3 h-3" /> },
  completed:   { label: "COMPLETED",   color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10", icon: <CheckCircle className="w-3 h-3" /> },
  cancelled:   { label: "CANCELLED",   color: "text-red-400 border-red-400/30 bg-red-400/10",          icon: <XCircle className="w-3 h-3" /> },
};

const FILTER_OPTIONS = [
  { label: "All",         value: "" },
  { label: "Pending",     value: ListBookingsStatus.pending },
  { label: "Accepted",    value: ListBookingsStatus.accepted },
  { label: "In Progress", value: ListBookingsStatus.in_progress },
  { label: "Completed",   value: ListBookingsStatus.completed },
  { label: "Cancelled",   value: ListBookingsStatus.cancelled },
] as const;

const NEXT_STATUS: Record<string, { label: string; next: BookingStatusUpdateStatus }> = {
  pending:     { label: "Accept Job",    next: BookingStatusUpdateStatus.accepted },
  accepted:    { label: "Start Job",     next: BookingStatusUpdateStatus.in_progress },
  in_progress: { label: "Mark Complete", next: BookingStatusUpdateStatus.completed },
};

export default function TechnicianBookings() {
  const [filter, setFilter] = useState<string>("");
  const { toast } = useToast();
  const { data: bookings, isLoading, refetch } = useListBookings(
    filter ? { status: filter as typeof ListBookingsStatus[keyof typeof ListBookingsStatus] } : undefined
  );
  const updateStatus = useUpdateBookingStatus();

  const handleStatusUpdate = async (id: number, status: BookingStatusUpdateStatus) => {
    try {
      await updateStatus.mutateAsync({ id, data: { status } });
      toast({ title: "Status Updated", description: `Job marked as ${status.replace("_", " ")}.` });
      refetch();
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message ?? "Try again.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <p className="text-primary font-mono text-sm uppercase tracking-widest">Job Management</p>
          <h1 className="text-3xl font-bold uppercase mt-1">My Jobs</h1>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1 text-xs font-mono uppercase rounded border transition-colors ${
                filter === f.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : bookings && bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((job) => {
              const cfg = STATUS_CONFIG[job.status ?? "pending"] ?? STATUS_CONFIG.pending;
              const nextAction = job.status ? NEXT_STATUS[job.status] : null;
              return (
                <div key={job.id} className="border border-border bg-card p-5 rounded-lg hover:border-primary/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold uppercase text-lg">{job.categoryName ?? "Service"}</span>
                        <span className={`text-xs font-mono border px-2 py-0.5 rounded flex items-center gap-1 ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground font-mono leading-relaxed">{job.issueDescription}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {job.estimatedCost != null && (
                        <p className="font-bold text-primary font-mono text-lg">${job.estimatedCost}</p>
                      )}
                      <p className="text-xs text-muted-foreground font-mono">
                        {job.scheduledAt ? new Date(job.scheduledAt).toLocaleDateString() : "ASAP"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs font-mono text-muted-foreground mb-4">
                    {job.customerName && (
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {job.customerName}</span>
                    )}
                    {job.address && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.address}</span>
                    )}
                    {job.scheduledAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(job.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>

                  {nextAction && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="uppercase font-mono text-xs"
                        onClick={() => handleStatusUpdate(job.id, nextAction.next)}
                        disabled={updateStatus.isPending}
                      >
                        {updateStatus.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                        {nextAction.label}
                      </Button>
                      {job.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="uppercase font-mono text-xs text-red-400 border-red-400/30 hover:bg-red-400/10"
                          onClick={() => handleStatusUpdate(job.id, BookingStatusUpdateStatus.cancelled)}
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Decline
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-border bg-card rounded-lg p-16 text-center">
            <Plus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-mono text-muted-foreground">No jobs found for this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
