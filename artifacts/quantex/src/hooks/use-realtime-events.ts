import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getStoredToken } from "@/lib/token";

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
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const params = new URLSearchParams();
    if (bookingId != null) params.set("bookingId", String(bookingId));
    if (technicianId != null) params.set("technicianId", String(technicianId));

    const token = getStoredToken();
    if (token) params.set("_token", token);

    const url = `/api/events?${params.toString()}`;
    const es = new EventSource(url);
    esRef.current = es;

    const handleBookingStatus = (e: MessageEvent) => {
      try {
        const { payload } = JSON.parse(e.data) as { payload: BookingStatusChangedPayload };
        // Use URL-based keys that match what Orval-generated hooks register
        queryClient.invalidateQueries({ queryKey: [`/api/bookings/${payload.bookingId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/bookings/${payload.bookingId}/tracking`] });
        queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/customer"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/technician"] });
        onEvent?.("booking_status_changed", payload);
      } catch {}
    };

    const handleLocationUpdated = (e: MessageEvent) => {
      try {
        const { payload } = JSON.parse(e.data) as { payload: TechnicianLocationUpdatedPayload };
        if (bookingId != null) {
          queryClient.invalidateQueries({ queryKey: [`/api/bookings/${bookingId}/tracking`] });
        }
        queryClient.invalidateQueries({ queryKey: [`/api/technicians/${payload.technicianId}`] });
        onEvent?.("technician_location_updated", payload);
      } catch {}
    };

    const handleStatusChanged = (e: MessageEvent) => {
      try {
        const { payload } = JSON.parse(e.data) as { payload: TechnicianStatusChangedPayload };
        // Invalidate all technician list and detail queries (URL-prefix match)
        queryClient.invalidateQueries({ queryKey: ["/api/technicians"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/technician"] });
        onEvent?.("technician_status_changed", payload);
      } catch {}
    };

    es.addEventListener("booking_status_changed", handleBookingStatus);
    es.addEventListener("technician_location_updated", handleLocationUpdated);
    es.addEventListener("technician_status_changed", handleStatusChanged);

    // Do NOT close on error — let the browser auto-reconnect (SSE default behavior).
    // Closing here would permanently stop reconnections after a transient network hiccup.
    es.onerror = () => {
      // intentionally left empty: browser will reconnect automatically
    };

    return () => {
      es.removeEventListener("booking_status_changed", handleBookingStatus);
      es.removeEventListener("technician_location_updated", handleLocationUpdated);
      es.removeEventListener("technician_status_changed", handleStatusChanged);
      es.close();
      esRef.current = null;
    };
  }, [enabled, bookingId, technicianId]);
}
