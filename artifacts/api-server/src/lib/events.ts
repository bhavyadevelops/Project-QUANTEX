import { EventEmitter } from "events";

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

export interface RealtimeEvent {
  type: RealtimeEventType;
  payload: RealtimePayload;
}

class EventBus extends EventEmitter {
  emit(event: RealtimeEventType, payload: RealtimePayload): boolean {
    return super.emit(event, payload);
  }

  on(event: RealtimeEventType, listener: (payload: RealtimePayload) => void): this {
    return super.on(event, listener);
  }

  off(event: RealtimeEventType, listener: (payload: RealtimePayload) => void): this {
    return super.off(event, listener);
  }

  publish(type: RealtimeEventType, payload: RealtimePayload): void {
    this.emit(type, payload);
  }
}

export const eventBus = new EventBus();
eventBus.setMaxListeners(500);
