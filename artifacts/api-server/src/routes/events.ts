import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db, techniciansTable, bookingsTable } from "@workspace/db";
import { eventBus, type RealtimeEventType, type RealtimePayload } from "../lib/events";
import { getAuthUser } from "./auth";

const router: IRouter = Router();

router.get("/events", async (req: Request, res: Response): Promise<void> => {
  // Auth: accept Bearer header OR ?_token= query param (SSE cannot set custom headers)
  const headerToken = req.headers.authorization?.replace("Bearer ", "") ?? undefined;
  const queryToken = req.query._token as string | undefined;
  const token = headerToken ?? queryToken;

  const user = await getAuthUser(token);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Resolve technician row for technician-role users.
  // A technician-role account without a profile row is not allowed to subscribe
  // (it cannot own any booking or tech stream, so granting access would be unscoped).
  let callerTechId: number | null = null;
  if (user.role === "technician") {
    const [tech] = await db
      .select({ id: techniciansTable.id })
      .from(techniciansTable)
      .where(eq(techniciansTable.userId, user.id));
    if (!tech) {
      res.status(403).json({ error: "No technician profile found — cannot subscribe" });
      return;
    }
    callerTechId = tech.id;
  }
  // callerTechId is either a valid technician ID (for technician role) or null (for customers).

  const reqBookingId = req.query.bookingId ? parseInt(req.query.bookingId as string) : null;
  const reqTechId = req.query.technicianId ? parseInt(req.query.technicianId as string) : null;

  // --- Validate any explicit ?technicianId= filter ---
  if (reqTechId !== null) {
    if (callerTechId !== null) {
      // Technician: must be their own profile only
      if (reqTechId !== callerTechId) {
        res.status(403).json({ error: "Cannot subscribe to another technician's events" });
        return;
      }
    } else {
      // Customer: must have at least one booking with that technician
      const [sharedBooking] = await db
        .select({ id: bookingsTable.id })
        .from(bookingsTable)
        .where(and(
          eq(bookingsTable.customerId, user.id),
          eq(bookingsTable.technicianId, reqTechId)
        ))
        .limit(1);
      if (!sharedBooking) {
        res.status(403).json({ error: "No booking relationship with this technician" });
        return;
      }
    }
  }

  // --- Validate any explicit ?bookingId= filter ---
  if (reqBookingId !== null) {
    const [booking] = await db
      .select({ customerId: bookingsTable.customerId, technicianId: bookingsTable.technicianId })
      .from(bookingsTable)
      .where(eq(bookingsTable.id, reqBookingId))
      .limit(1);
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    const isOwner = booking.customerId === user.id || booking.technicianId === callerTechId;
    if (!isOwner) {
      res.status(403).json({ error: "Forbidden — not a participant of this booking" });
      return;
    }
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendEvent = (type: RealtimeEventType, payload: RealtimePayload) => {
    const data = JSON.stringify({ type, payload });
    res.write(`event: ${type}\ndata: ${data}\n\n`);
  };

  // --- booking_status_changed ---
  const onBookingStatus = (payload: RealtimePayload) => {
    const p = payload as { bookingId: number; technicianId: number; customerId: number };

    // Every caller must be a participant of the booking
    if (callerTechId !== null) {
      // Technician: only their own bookings
      if (p.technicianId !== callerTechId) return;
    } else {
      // Customer: only their own bookings
      if (p.customerId !== user.id) return;
    }

    // Optional explicit filter
    if (reqBookingId !== null && p.bookingId !== reqBookingId) return;
    sendEvent("booking_status_changed", payload);
  };

  // --- technician_location_updated ---
  const onLocationUpdated = (payload: RealtimePayload) => {
    const p = payload as { technicianId: number };

    if (callerTechId !== null) {
      // Technician: only their own stream
      if (p.technicianId !== callerTechId) return;
    } else {
      // Customer: only allowed if they explicitly subscribed with a matching technicianId
      // (verified to be a shared booking above). Without an explicit reqTechId, skip.
      if (reqTechId === null || p.technicianId !== reqTechId) return;
    }

    sendEvent("technician_location_updated", payload);
  };

  // --- technician_status_changed ---
  const onStatusChanged = (payload: RealtimePayload) => {
    const p = payload as { technicianId: number };

    if (callerTechId !== null) {
      // Technician: only their own stream
      if (p.technicianId !== callerTechId) return;
    } else {
      // Customer: technician currentStatus is public marketplace availability info,
      // so broadcast to all authenticated customers (not sensitive GPS data).
      // If a specific technicianId filter is set, honour it.
      if (reqTechId !== null && p.technicianId !== reqTechId) return;
    }

    sendEvent("technician_status_changed", payload);
  };

  eventBus.on("booking_status_changed", onBookingStatus);
  eventBus.on("technician_location_updated", onLocationUpdated);
  eventBus.on("technician_status_changed", onStatusChanged);

  res.write(`: connected\n\n`);

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 25_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    eventBus.off("booking_status_changed", onBookingStatus);
    eventBus.off("technician_location_updated", onLocationUpdated);
    eventBus.off("technician_status_changed", onStatusChanged);
  });
});

export default router;
