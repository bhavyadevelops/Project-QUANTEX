import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, bookingsTable, usersTable, techniciansTable, serviceCategoriesTable } from "@workspace/db";
import {
  ListBookingsQueryParams,
  CreateBookingBody,
  GetBookingParams,
  UpdateBookingStatusParams,
  UpdateBookingStatusBody,
} from "@workspace/api-zod";
import { getAuthUser } from "./auth";

const router: IRouter = Router();

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
    conditions.push(eq(bookingsTable.status, query.data.status));
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

  const [booking] = await db.insert(bookingsTable).values({
    customerId: user.id,
    technicianId: body.data.technicianId,
    categoryId: body.data.categoryId,
    issueDescription: body.data.issueDescription,
    address: body.data.address ?? null,
    scheduledAt: new Date(body.data.scheduledAt),
    estimatedCost: body.data.estimatedCost,
    notes: body.data.notes ?? null,
  }).returning();

  const enriched = await enrichBooking(booking);
  res.status(201).json(enriched);
});

router.get("/bookings/:id", async (req, res): Promise<void> => {
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

  const enriched = await enrichBooking(booking);
  res.json(enriched);
});

router.patch("/bookings/:id/status", async (req, res): Promise<void> => {
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

  const updateData: Record<string, unknown> = { status: body.data.status };
  if (body.data.notes != null) updateData.notes = body.data.notes;
  if (body.data.finalCost != null) updateData.finalCost = body.data.finalCost;

  const [booking] = await db
    .update(bookingsTable)
    .set(updateData)
    .where(eq(bookingsTable.id, params.data.id))
    .returning();

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  // Update technician stats if completed
  if (body.data.status === "completed") {
    const tech = await db.select().from(techniciansTable).where(eq(techniciansTable.id, booking.technicianId));
    if (tech.length > 0) {
      await db.update(techniciansTable)
        .set({ completedJobs: tech[0].completedJobs + 1 })
        .where(eq(techniciansTable.id, booking.technicianId));
    }
  }

  const enriched = await enrichBooking(booking);
  res.json(enriched);
});

router.get("/bookings/:id/tracking", async (req, res): Promise<void> => {
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

  // Simulate live tracking based on status and time
  const statusProgress: Record<string, number> = {
    pending: 0,
    accepted: 15,
    in_progress: 65,
    completed: 100,
    cancelled: 0,
  };

  const progress = statusProgress[booking.status] ?? 0;
  const etaMinutes = Math.max(0, Math.round((100 - progress) / 10) + Math.floor(Math.random() * 3));

  res.json({
    bookingId: booking.id,
    status: booking.status,
    etaMinutes,
    technicianLat: 37.7749 + (Math.random() - 0.5) * 0.05,
    technicianLng: -122.4194 + (Math.random() - 0.5) * 0.05,
    progress,
    lastUpdated: new Date().toISOString(),
  });
});

export default router;
