import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, reviewsTable, usersTable, techniciansTable, bookingsTable } from "@workspace/db";
import {
  ListReviewsQueryParams,
  CreateReviewBody,
} from "@workspace/api-zod";
import { getAuthUser } from "./auth";

const router: IRouter = Router();

router.get("/reviews", async (req, res): Promise<void> => {
  const query = ListReviewsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const reviews = await db
    .select({
      id: reviewsTable.id,
      customerId: reviewsTable.customerId,
      technicianId: reviewsTable.technicianId,
      bookingId: reviewsTable.bookingId,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      customerName: usersTable.name,
      createdAt: reviewsTable.createdAt,
    })
    .from(reviewsTable)
    .innerJoin(usersTable, eq(reviewsTable.customerId, usersTable.id))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(query.data.limit ?? 20);

  res.json(reviews.map(r => ({
    ...r,
    technicianName: null,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/reviews", async (req, res): Promise<void> => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getAuthUser(token);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = CreateReviewBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  // Security: verify the booking belongs to this user
  const [booking] = await db
    .select({ customerId: bookingsTable.customerId, technicianId: bookingsTable.technicianId, status: bookingsTable.status })
    .from(bookingsTable)
    .where(eq(bookingsTable.id, body.data.bookingId));

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  if (booking.customerId !== user.id) {
    res.status(403).json({ error: "Forbidden — you can only review your own bookings" });
    return;
  }

  // Verify the technicianId matches the booking's technician
  if (booking.technicianId !== body.data.technicianId) {
    res.status(400).json({ error: "Technician ID does not match the booking" });
    return;
  }

  // Security: prevent duplicate reviews for the same booking
  const [existingReview] = await db
    .select({ id: reviewsTable.id })
    .from(reviewsTable)
    .where(eq(reviewsTable.bookingId, body.data.bookingId))
    .limit(1);

  if (existingReview) {
    res.status(409).json({ error: "A review already exists for this booking" });
    return;
  }

  const [review] = await db.insert(reviewsTable).values({
    customerId: user.id,
    technicianId: body.data.technicianId,
    bookingId: body.data.bookingId,
    rating: body.data.rating,
    comment: body.data.comment,
  }).returning();

  // Update technician rating
  const allReviews = await db.select({ rating: reviewsTable.rating })
    .from(reviewsTable)
    .where(eq(reviewsTable.technicianId, body.data.technicianId));

  const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

  await db.update(techniciansTable)
    .set({ rating: Math.round(avgRating * 10) / 10, reviewCount: allReviews.length })
    .where(eq(techniciansTable.id, body.data.technicianId));

  res.status(201).json({
    ...review,
    customerName: user.name,
    technicianName: null,
    createdAt: review.createdAt.toISOString(),
  });
});

export default router;
