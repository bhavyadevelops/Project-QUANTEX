import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type RealtimeEventType =
  | "booking_status_changed"
  | "technician_location_updated"
  | "technician_status_changed";

export interface BookingStatusChangedPayload {
  bookingId: number;
  status: string;
  technicianId: number;
  customerId: number;
}

export interface TechnicianLocationUpdatedPayload {
  technicianId: number;
  latitude: number;
  longitude: number;
  etaMinutes?: number | null;
  distanceKm?: number | null;
  lastLocationAt: string;
}

export interface TechnicianStatusChangedPayload {
  technicianId: number;
  currentStatus: string;
}

export type RealtimePayload =
  | BookingStatusChangedPayload
  | TechnicianLocationUpdatedPayload
  | TechnicianStatusChangedPayload;

interface UseRealtimeEventsOptions {
  bookingId?: number;
  technicianId?: number;
  onEvent?: (type: RealtimeEventType, payload: RealtimePayload) => void;
  enabled?: boolean;
}

export function useRealtimeEvents({
  bookingId,
  technicianId,
  onEvent,
  enabled = true,
}: UseRealtimeEventsOptions = {}) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel("realtime-events")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          ...(bookingId ? { filter: `id=eq.${bookingId}` } : {}),
        },
        (payload) => {
          const booking = payload.new as Record<string, unknown>;
          const bookingId = booking.id as number;

          queryClient.invalidateQueries({ queryKey: [`/api/bookings/${bookingId}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/bookings/${bookingId}/tracking`] });
          queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/customer"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/technician"] });

          onEvent?.("booking_status_changed", {
            bookingId,
            status: booking.status as string,
            technicianId: booking.technician_id as number,
            customerId: booking.customer_id as number,
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "technicians",
          ...(technicianId ? { filter: `id=eq.${technicianId}` } : {}),
        },
        (payload) => {
          const tech = payload.new as Record<string, unknown>;
          const techId = tech.id as number;

          queryClient.invalidateQueries({ queryKey: ["/api/technicians"] });
          queryClient.invalidateQueries({ queryKey: [`/api/technicians/${techId}`] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/technician"] });

          onEvent?.("technician_status_changed", {
            technicianId: techId,
            currentStatus: tech.current_status as string,
          });
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, bookingId, technicianId, queryClient, onEvent]);
}
