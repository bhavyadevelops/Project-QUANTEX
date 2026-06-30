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

function technicianRow(t: typeof techniciansTable.$inferSelect) {
  return {
    id: t.id,
    userId: t.userId,
    bio: t.bio,
    avatarUrl: t.avatarUrl,
    skills: t.skills,
    rating: t.rating,
    reviewCount: t.reviewCount,
    isAvailable: t.isAvailable,
    completedJobs: t.completedJobs,
    hourlyRate: t.hourlyRate,
    responseTime: t.responseTime,
    categoryIds: t.categoryIds,
    profession: t.profession,
    servicesOffered: t.servicesOffered,
    yearsExperience: t.yearsExperience,
    certifications: t.certifications,
    previousCompany: t.previousCompany,
    areasOfExpertise: t.areasOfExpertise,
    languagesSpoken: t.languagesSpoken,
    visitCharge: t.visitCharge,
    perJobRate: t.perJobRate,
    inspectionCharge: t.inspectionCharge,
    emergencyCharge: t.emergencyCharge,
    weekendCharge: t.weekendCharge,
    nightCharge: t.nightCharge,
    workingDays: t.workingDays,
    workingHoursStart: t.workingHoursStart,
    workingHoursEnd: t.workingHoursEnd,
    emergencyAvailable: t.emergencyAvailable,
    vacationMode: t.vacationMode,
    maxDailyBookings: t.maxDailyBookings,
    serviceRadius: t.serviceRadius,
    serviceCity: t.serviceCity,
    pinCode: t.pinCode,
    gender: t.gender,
    dateOfBirth: t.dateOfBirth,
  };
}

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

  const rows = await db
    .select()
    .from(techniciansTable)
    .innerJoin(usersTable, eq(techniciansTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(query.data.limit ?? 20);

  const result = rows.map(({ technicians: t, users: u }) => ({
    ...technicianRow(t),
    name: u.name,
    distance: Math.round(Math.random() * 10 * 10) / 10,
  }));

  res.json(result);
});

router.get("/technicians/me", async (req, res): Promise<void> => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getAuthUser(token);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [row] = await db
    .select()
    .from(techniciansTable)
    .where(eq(techniciansTable.userId, user.id));

  if (!row) {
    res.status(404).json({ error: "No technician profile found" });
    return;
  }

  res.json({ ...technicianRow(row), name: user.name, distance: null });
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
    ...technicianRow(technician),
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

  const [row] = await db
    .select()
    .from(techniciansTable)
    .innerJoin(usersTable, eq(techniciansTable.userId, usersTable.id))
    .where(eq(techniciansTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Technician not found" });
    return;
  }

  res.json({ ...technicianRow(row.technicians), name: row.users.name, distance: null });
});

router.patch("/technicians/:id", async (req, res): Promise<void> => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getAuthUser(token);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

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

  res.json({ ...technicianRow(technician), name: user.name, distance: null });
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
