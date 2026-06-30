import { Router, type IRouter } from "express";
import { eq, and, ne, sql } from "drizzle-orm";
import { db, bookingsTable, usersTable, techniciansTable, serviceCategoriesTable } from "@workspace/db";
import {
  ListBookingsQueryParams,
  CreateBookingBody,
  GetBookingParams,
  UpdateBookingStatusParams,
  UpdateBookingStatusBody,
} from "@workspace/api-zod";
import { getAuthUser } from "./auth";
import { eventBus } from "../lib/events";

const router: IRouter = Router();

// Valid state machine transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  searching: ["assigned", "cancelled"],
  assigned: ["pending", "cancelled"],
  pending: ["accepted", "cancelled"],
  accepted: ["travelling", "in_progress", "cancelled"],
  travelling: ["arriving", "reached", "in_progress", "cancelled"],
  arriving: ["reached", "in_progress", "cancelled"],
  reached: ["in_progress", "cancelled"],
  in_progress: ["waiting_for_parts", "completed"],
  waiting_for_parts: ["in_progress", "completed"],
  completed: ["payment_completed"],
  payment_completed: [],
  cancelled: [],
};

// Statuses that count as "active" for booking lock
const ACTIVE_STATUSES = new Set(["accepted", "travelling", "arriving", "reached", "in_progress", "waiting_for_parts"]);

// Straight-line haversine distance in km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function enrichBooking(booking: typeof bookingsTable.$inferSelect) {
  const [customer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, booking.customerId));
  const [technician] = await db.select({ name: usersTable.name })
    .from(techniciansTable)
    .innerJoin(usersTable, eq(techniciansTable.userId, usersTable.id))
    .where(eq(techniciansTable.id, booking.technicianId));
  const [category] = await db.select({ name: serviceCategoriesTable.name }).from(serviceCategoriesTable).where(eq(serviceCategoriesTable.id, booking.categoryId));

  return {
    ...booking,
    scheduledAt: booking.scheduledAt.toISOString(),
    createdAt: booking.createdAt.toISOString(),
    customerName: customer?.name ?? null,
    technicianName: technician?.name ?? null,
    categoryName: category?.name ?? null,
  };
}

router.get("/bookings", async (req, res): Promise<void> => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getAuthUser(token);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const query = ListBookingsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let conditions = [];
  const role = query.data.role ?? (user.role === "technician" ? "technician" : "customer");

  if (role === "technician") {
    const [tech] = await db.select().from(techniciansTable).where(eq(techniciansTable.userId, user.id));
    if (!tech) {
      res.json([]);
      return;
    }
    conditions.push(eq(bookingsTable.technicianId, tech.id));
  } else {
    conditions.push(eq(bookingsTable.customerId, user.id));
  }

  if (query.data.status) {
    conditions.push(eq(bookingsTable.status, query.data.status as any));
  }

  const bookings = await db.select().from(bookingsTable)
    .where(and(...conditions))
    .orderBy(bookingsTable.createdAt);

  const enriched = await Promise.all(bookings.map(enrichBooking));
  res.json(enriched);
});

router.post("/bookings", async (req, res): Promise<void> => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getAuthUser(token);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = CreateBookingBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  // Check if technician is busy
  const [tech] = await db.select({ currentStatus: techniciansTable.currentStatus, id: techniciansTable.id })
    .from(techniciansTable)
    .where(eq(techniciansTable.id, body.data.technicianId));

  if (tech && tech.currentStatus === "busy") {
    res.status(409).json({ error: "Technician is currently busy" });
    return;
  }

  const [booking] = await db.insert(bookingsTable).values({
    customerId: user.id,
    technicianId: body.data.technicianId,
    categoryId: body.data.categoryId,
    issueDescription: body.data.issueDescription,
    address: body.data.address ?? null,
    scheduledAt: new Date(body.data.scheduledAt),
    estimatedCost: body.data.estimatedCost,
    notes: body.data.notes ?? null,
    destLatitude: (body.data as any).destLatitude ?? null,
    destLongitude: (body.data as any).destLongitude ?? null,
  }).returning();

  const enriched = await enrichBooking(booking);
  res.status(201).json(enriched);
});

router.get("/bookings/:id", async (req, res): Promise<void> => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getAuthUser(token);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = GetBookingParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, params.data.id));
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  // Authz: only customer or assigned technician may view
  const [tech] = booking.technicianId
    ? await db.select({ userId: techniciansTable.userId }).from(techniciansTable).where(eq(techniciansTable.id, booking.technicianId))
    : [null];

  if (booking.customerId !== user.id && tech?.userId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const enriched = await enrichBooking(booking);
  res.json(enriched);
});

router.patch("/bookings/:id/status", async (req, res): Promise<void> => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getAuthUser(token);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = UpdateBookingStatusParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateBookingStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  // Authz: resolve technician row for this booking
  const [bookingTech] = await db
    .select({ id: techniciansTable.id, userId: techniciansTable.userId })
    .from(techniciansTable)
    .where(eq(techniciansTable.id, existing.technicianId));

  const isCustomer = existing.customerId === user.id;
  const isTechnician = bookingTech?.userId === user.id;

  if (!isCustomer && !isTechnician) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Customers may only cancel
  const nextStatus = body.data.status;
  if (isCustomer && !isTechnician && nextStatus !== "cancelled") {
    res.status(403).json({ error: "Customers may only cancel bookings" });
    return;
  }

  const currentStatus = existing.status;

  // Validate state machine transition
  const allowedNext = VALID_TRANSITIONS[currentStatus] ?? [];
  if (!allowedNext.includes(nextStatus)) {
    res.status(400).json({
      error: `Invalid transition: ${currentStatus} → ${nextStatus}. Allowed: ${allowedNext.join(", ") || "none"}`,
    });
    return;
  }

  // For the "accepted" transition, use an atomic transaction with a row-level lock
  // (SELECT ... FOR UPDATE) on the technician row. This prevents concurrent accept
  // requests for the same technician from both passing the conflict check.
  let booking: typeof bookingsTable.$inferSelect;
  let acceptTechStatus: { currentStatus: string } | null = null;

  if (nextStatus === "accepted") {
    const updateData: Record<string, unknown> = { status: nextStatus };
    if (body.data.notes != null) updateData.notes = body.data.notes;
    if (body.data.finalCost != null) updateData.finalCost = body.data.finalCost;

    const result = await db.transaction(async (tx) => {
      // Lock the technician row exclusively for the duration of this transaction.
      // Any concurrent accept for the same technician blocks here until we commit/rollback.
      const [lockedTech] = await tx
        .select({ id: techniciansTable.id, currentStatus: techniciansTable.currentStatus })
        .from(techniciansTable)
        .where(eq(techniciansTable.id, existing.technicianId))
        .for("update");

      if (!lockedTech) return { conflict: true as const, reason: "technician" };

      // With the row locked, check for any other active booking for this technician.
      const [conflict] = await tx
        .select({ id: bookingsTable.id })
        .from(bookingsTable)
        .where(and(
          eq(bookingsTable.technicianId, existing.technicianId),
          ne(bookingsTable.id, params.data.id),
          sql`${bookingsTable.status} = ANY(ARRAY['accepted','travelling','arriving','reached','in_progress','waiting_for_parts']::booking_status[])` as any
        ))
        .limit(1);

      if (conflict) return { conflict: true as const, reason: "active_booking" };

      // No conflict — update booking and mark technician busy atomically.
      const [updated] = await tx
        .update(bookingsTable)
        .set(updateData)
        .where(eq(bookingsTable.id, params.data.id))
        .returning();

      if (!updated) return { conflict: false as const, booking: null };

      await tx.update(techniciansTable)
        .set({ currentStatus: "busy", statusBeforeJob: lockedTech.currentStatus as any })
        .where(eq(techniciansTable.id, existing.technicianId));

      return { conflict: false as const, booking: updated, preJobStatus: lockedTech.currentStatus };
    });

    if (result.conflict) {
      if (result.reason === "active_booking") {
        res.status(409).json({ error: "Technician already has an active booking. Cannot accept another until it is completed or cancelled." });
      } else {
        res.status(409).json({ error: "Technician profile not found." });
      }
      return;
    }

    if (!result.booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    booking = result.booking;
    acceptTechStatus = { currentStatus: "busy" };

    eventBus.publish("technician_status_changed", {
      technicianId: booking.technicianId,
      currentStatus: "busy",
    });
  } else {
    // Non-accept transitions: straightforward update outside a transaction.
    const updateData: Record<string, unknown> = { status: nextStatus };
    if (body.data.notes != null) updateData.notes = body.data.notes;
    if (body.data.finalCost != null) updateData.finalCost = body.data.finalCost;

    const [updated] = await db
      .update(bookingsTable)
      .set(updateData)
      .where(eq(bookingsTable.id, params.data.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    booking = updated;
  }

  // Post-update side effects for non-accept transitions
  if (nextStatus === "completed") {
    // Restore technician to their pre-job chosen status and increment completed count.
    // Status is restored exactly once here; payment_completed is a financial close that
    // does not change availability again (statusBeforeJob is already cleared).
    const [tech] = await db.select().from(techniciansTable).where(eq(techniciansTable.id, booking.technicianId));
    if (tech) {
      const restoredStatus = tech.statusBeforeJob ?? "online";
      await db.update(techniciansTable)
        .set({ completedJobs: tech.completedJobs + 1, currentStatus: restoredStatus, statusBeforeJob: null })
        .where(eq(techniciansTable.id, booking.technicianId));

      eventBus.publish("technician_status_changed", {
        technicianId: booking.technicianId,
        currentStatus: restoredStatus,
      });
    }
  } else if (nextStatus === "payment_completed") {
    // Financial close only — technician availability was already restored on `completed`.
    // No further availability changes needed here.
  } else if (nextStatus === "cancelled") {
    // If booking was active, restore pre-job status
    if (ACTIVE_STATUSES.has(currentStatus)) {
      const [tech] = await db.select().from(techniciansTable).where(eq(techniciansTable.id, booking.technicianId));
      if (tech) {
        const restoredStatus = tech.statusBeforeJob ?? "online";
        await db.update(techniciansTable)
          .set({ currentStatus: restoredStatus, statusBeforeJob: null })
          .where(eq(techniciansTable.id, booking.technicianId));

        eventBus.publish("technician_status_changed", {
          technicianId: booking.technicianId,
          currentStatus: restoredStatus,
        });
      }
    }
  }

  // Emit booking status changed event to all subscribers
  eventBus.publish("booking_status_changed", {
    bookingId: booking.id,
    status: nextStatus,
    technicianId: booking.technicianId,
    customerId: booking.customerId,
  });

  const enriched = await enrichBooking(booking);
  res.json(enriched);
});

router.get("/bookings/:id/tracking", async (req, res): Promise<void> => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getAuthUser(token);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = GetBookingParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, params.data.id));
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  // Authz: only customer or assigned technician may view tracking
  const [tech] = booking.technicianId
    ? await db.select({ userId: techniciansTable.userId, latitude: techniciansTable.latitude, longitude: techniciansTable.longitude, lastLocationAt: techniciansTable.lastLocationAt })
        .from(techniciansTable)
        .where(eq(techniciansTable.id, booking.technicianId))
    : [null];

  if (booking.customerId !== user.id && tech?.userId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const techLat = tech?.latitude ?? null;
  const techLng = tech?.longitude ?? null;
  const destLat = booking.destLatitude ?? null;
  const destLng = booking.destLongitude ?? null;

  // Compute distance and ETA from real GPS if both points are available
  let distanceKm: number | null = null;
  let etaMinutes: number;

  if (techLat !== null && techLng !== null && destLat !== null && destLng !== null) {
    const straightLine = haversineKm(techLat, techLng, destLat, destLng);
    distanceKm = Math.round(straightLine * 1.4 * 10) / 10; // road factor 1.4
    etaMinutes = Math.max(1, Math.round((distanceKm / 30) * 60)); // 30 km/h average urban speed
  } else {
    // Fallback: derive from status progress
    const statusProgress: Record<string, number> = {
      searching: 5,
      assigned: 10,
      pending: 15,
      accepted: 25,
      travelling: 45,
      arriving: 75,
      reached: 85,
      in_progress: 65,
      waiting_for_parts: 70,
      completed: 100,
      payment_completed: 100,
      cancelled: 0,
    };
    const progress = statusProgress[booking.status] ?? 0;
    etaMinutes = Math.max(0, Math.round((100 - progress) / 10));
  }

  const statusProgress: Record<string, number> = {
    searching: 5, assigned: 10, pending: 15, accepted: 25,
    travelling: 45, arriving: 75, reached: 85, in_progress: 65,
    waiting_for_parts: 70, completed: 100, payment_completed: 100, cancelled: 0,
  };
  const progress = statusProgress[booking.status] ?? 0;

  res.json({
    bookingId: booking.id,
    status: booking.status,
    etaMinutes,
    technicianLat: techLat,
    technicianLng: techLng,
    distanceKm,
    progress,
    lastUpdated: new Date().toISOString(),
  });
});

export default router;
