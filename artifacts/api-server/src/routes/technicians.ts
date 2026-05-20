import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, techniciansTable, usersTable, reviewsTable } from "@workspace/db";
import {
  ListTechniciansQueryParams,
  CreateTechnicianProfileBody,
  GetTechnicianParams,
  UpdateTechnicianParams,
  UpdateTechnicianBody,
} from "@workspace/api-zod";
import { getAuthUser } from "./auth";

const router: IRouter = Router();

router.get("/technicians", async (req, res): Promise<void> => {
  const query = ListTechniciansQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let conditions = [];
  if (query.data.available !== undefined) {
    conditions.push(eq(techniciansTable.isAvailable, query.data.available));
  }

  const technicians = await db
    .select({
      id: techniciansTable.id,
      userId: techniciansTable.userId,
      name: usersTable.name,
      bio: techniciansTable.bio,
      avatarUrl: techniciansTable.avatarUrl,
      skills: techniciansTable.skills,
      rating: techniciansTable.rating,
      reviewCount: techniciansTable.reviewCount,
      isAvailable: techniciansTable.isAvailable,
      completedJobs: techniciansTable.completedJobs,
      hourlyRate: techniciansTable.hourlyRate,
      responseTime: techniciansTable.responseTime,
      categoryIds: techniciansTable.categoryIds,
    })
    .from(techniciansTable)
    .innerJoin(usersTable, eq(techniciansTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(query.data.limit ?? 20);

  const result = technicians.map(t => ({
    ...t,
    distance: Math.round(Math.random() * 10 * 10) / 10,
  }));

  res.json(result);
});

router.post("/technicians", async (req, res): Promise<void> => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getAuthUser(token);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = CreateTechnicianProfileBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [technician] = await db.insert(techniciansTable).values({
    userId: user.id,
    bio: body.data.bio ?? null,
    skills: body.data.skills,
    hourlyRate: body.data.hourlyRate,
    responseTime: body.data.responseTime,
    categoryIds: body.data.categoryIds ?? [],
  }).returning();

  res.status(201).json({
    ...technician,
    name: user.name,
    distance: null,
  });
});

router.get("/technicians/:id", async (req, res): Promise<void> => {
  const params = GetTechnicianParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [technician] = await db
    .select({
      id: techniciansTable.id,
      userId: techniciansTable.userId,
      name: usersTable.name,
      bio: techniciansTable.bio,
      avatarUrl: techniciansTable.avatarUrl,
      skills: techniciansTable.skills,
      rating: techniciansTable.rating,
      reviewCount: techniciansTable.reviewCount,
      isAvailable: techniciansTable.isAvailable,
      completedJobs: techniciansTable.completedJobs,
      hourlyRate: techniciansTable.hourlyRate,
      responseTime: techniciansTable.responseTime,
      categoryIds: techniciansTable.categoryIds,
    })
    .from(techniciansTable)
    .innerJoin(usersTable, eq(techniciansTable.userId, usersTable.id))
    .where(eq(techniciansTable.id, params.data.id));

  if (!technician) {
    res.status(404).json({ error: "Technician not found" });
    return;
  }

  res.json({ ...technician, distance: null });
});

router.patch("/technicians/:id", async (req, res): Promise<void> => {
  const params = UpdateTechnicianParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateTechnicianBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [technician] = await db
    .update(techniciansTable)
    .set(body.data)
    .where(eq(techniciansTable.id, params.data.id))
    .returning();

  if (!technician) {
    res.status(404).json({ error: "Technician not found" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, technician.userId));

  res.json({ ...technician, name: user?.name ?? "", distance: null });
});

router.get("/technicians/:id/reviews", async (req, res): Promise<void> => {
  const params = GetTechnicianParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
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
    .where(eq(reviewsTable.technicianId, params.data.id));

  res.json(reviews.map(r => ({
    ...r,
    technicianName: null,
    createdAt: r.createdAt.toISOString(),
  })));
});

export default router;
