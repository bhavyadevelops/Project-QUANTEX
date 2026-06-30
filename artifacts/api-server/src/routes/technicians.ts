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

/**
 * Fields safe to expose on public list/detail endpoints.
 * Never includes: dateOfBirth, gender, pinCode (personally-sensitive owner-only data).
 */
function publicTechRow(t: typeof techniciansTable.$inferSelect) {
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
  };
}

/**
 * Full row including personally-sensitive fields.
 * Only used on /technicians/me (owner-scoped endpoint).
 */
function privateTechRow(t: typeof techniciansTable.$inferSelect) {
  return {
    ...publicTechRow(t),
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

  res.json(rows.map(({ technicians: t, users: u }) => ({
    ...publicTechRow(t),
    name: u.name,
    distance: Math.round(Math.random() * 10 * 10) / 10,
  })));
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

  res.json({ ...privateTechRow(row), name: user.name, distance: null });
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

  // Return existing profile if one already exists (idempotent create)
  const [existing] = await db
    .select()
    .from(techniciansTable)
    .where(eq(techniciansTable.userId, user.id));

  if (existing) {
    res.status(201).json({ ...privateTechRow(existing), name: user.name, distance: null });
    return;
  }

  const d = body.data;
  const [technician] = await db.insert(techniciansTable).values({
    userId: user.id,
    bio: d.bio ?? null,
    skills: d.skills ?? [],
    hourlyRate: d.hourlyRate ?? 0,
    responseTime: d.responseTime ?? "30 min",
    categoryIds: d.categoryIds ?? [],
    profession: d.profession ?? [],
    servicesOffered: (d.servicesOffered as Record<string, string[]> | undefined) ?? {},
    yearsExperience: d.yearsExperience ?? null,
    certifications: d.certifications ?? [],
    previousCompany: d.previousCompany ?? null,
    areasOfExpertise: d.areasOfExpertise ?? [],
    languagesSpoken: d.languagesSpoken ?? [],
    visitCharge: d.visitCharge ?? null,
    perJobRate: d.perJobRate ?? null,
    inspectionCharge: d.inspectionCharge ?? null,
    emergencyCharge: d.emergencyCharge ?? null,
    weekendCharge: d.weekendCharge ?? null,
    nightCharge: d.nightCharge ?? null,
    workingDays: d.workingDays ?? [],
    workingHoursStart: d.workingHoursStart ?? null,
    workingHoursEnd: d.workingHoursEnd ?? null,
    emergencyAvailable: d.emergencyAvailable ?? false,
    vacationMode: d.vacationMode ?? false,
    maxDailyBookings: d.maxDailyBookings ?? null,
    serviceRadius: d.serviceRadius ?? null,
    serviceCity: d.serviceCity ?? null,
    pinCode: d.pinCode ?? null,
    gender: d.gender ?? null,
    dateOfBirth: d.dateOfBirth ?? null,
  }).returning();

  res.status(201).json({ ...privateTechRow(technician), name: user.name, distance: null });
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

  res.json({ ...publicTechRow(row.technicians), name: row.users.name, distance: null });
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

  // Ownership check: only the owning technician may update their profile
  const [existing] = await db
    .select({ userId: techniciansTable.userId })
    .from(techniciansTable)
    .where(eq(techniciansTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Technician not found" });
    return;
  }

  if (existing.userId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
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

  // Owner-scoped response includes sensitive personal fields
  res.json({ ...privateTechRow(technician), name: user.name, distance: null });
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
