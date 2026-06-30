import { Router, type IRouter } from "express";
import { eq, and, gte, lte, ilike, or, desc, asc, sql } from "drizzle-orm";
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
    profilePictureUrl: t.profilePictureUrl,
    skills: t.skills,
    rating: t.rating,
    reviewCount: t.reviewCount,
    isAvailable: t.isAvailable,
    completedJobs: t.completedJobs,
    hourlyRate: t.hourlyRate,
    responseTime: t.responseTime,
    latitude: t.latitude,
    longitude: t.longitude,
    currentStatus: t.currentStatus,
    verificationBadges: t.verificationBadges,
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

  const q = query.data;
  const conditions: ReturnType<typeof eq>[] = [];

  // Availability filter (support both `available` and `isAvailable`)
  const availFilter = q.isAvailable ?? q.available;
  if (availFilter !== undefined) {
    conditions.push(eq(techniciansTable.isAvailable, availFilter));
  }

  // Status filter
  if (q.currentStatus) {
    conditions.push(eq(techniciansTable.currentStatus, q.currentStatus as any));
  }

  // Rating filter
  if (q.minRating !== undefined) {
    conditions.push(gte(techniciansTable.rating, q.minRating));
  }

  // Price filter
  if (q.maxRate !== undefined) {
    conditions.push(lte(techniciansTable.hourlyRate, q.maxRate));
  }

  // Category filter
  if (q.categoryId !== undefined) {
    conditions.push(sql`${techniciansTable.categoryIds} @> ARRAY[${q.categoryId}]::integer[]` as any);
  }

  // Verified filter (has at least one verification badge)
  if (q.verified) {
    conditions.push(sql`jsonb_array_length(${techniciansTable.verificationBadges}::jsonb) > 0` as any);
  }

  // Emergency available filter
  if (q.emergencyAvailable) {
    conditions.push(eq(techniciansTable.emergencyAvailable, true));
  }

  // Minimum experience filter
  if (q.minExperience !== undefined) {
    conditions.push(gte(techniciansTable.yearsExperience, q.minExperience));
  }

  // Search filter: across user name, bio, skills, profession, areas of expertise, city, and servicesOffered JSON
  let searchCondition: any = undefined;
  if (q.search && q.search.trim().length > 0) {
    const term = `%${q.search.trim()}%`;
    searchCondition = or(
      ilike(usersTable.name, term),
      ilike(techniciansTable.bio, term),
      sql`EXISTS (SELECT 1 FROM unnest(${techniciansTable.skills}) s WHERE s ILIKE ${term})`,
      sql`EXISTS (SELECT 1 FROM unnest(${techniciansTable.profession}) p WHERE p ILIKE ${term})`,
      sql`EXISTS (SELECT 1 FROM unnest(${techniciansTable.areasOfExpertise}) ae WHERE ae ILIKE ${term})`,
      ilike(techniciansTable.serviceCity, term),
      sql`${techniciansTable.servicesOffered}::text ILIKE ${term}`,
    );
  }

  // Haversine helpers — defined before whereClause so radius filter can use them
  const hasLocation = q.lat !== undefined && q.lng !== undefined;

  const haversineKm = (lat: number, lng: number) => sql<number>`
    CASE
      WHEN ${techniciansTable.latitude} IS NOT NULL AND ${techniciansTable.longitude} IS NOT NULL
      THEN (
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(${lat})) * cos(radians(${techniciansTable.latitude}))
            * cos(radians(${techniciansTable.longitude}) - radians(${lng}))
            + sin(radians(${lat})) * sin(radians(${techniciansTable.latitude}))
          ))
        )
      )
      ELSE NULL
    END
  `;

  // Distance radius filter — pushed into conditions BEFORE whereClause is built
  if (hasLocation && q.radius !== undefined) {
    conditions.push(sql`
      ${techniciansTable.latitude} IS NOT NULL
      AND ${techniciansTable.longitude} IS NOT NULL
      AND (
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(${q.lat!})) * cos(radians(${techniciansTable.latitude}))
            * cos(radians(${techniciansTable.longitude}) - radians(${q.lng!}))
            + sin(radians(${q.lat!})) * sin(radians(${techniciansTable.latitude}))
          ))
        )
      ) <= ${q.radius}
    ` as any);
  }

  const whereClause = conditions.length > 0 && searchCondition
    ? and(...conditions, searchCondition)
    : conditions.length > 0
      ? and(...conditions)
      : searchCondition ?? undefined;

  // Build sort order
  let orderBy: any[] = [];
  switch (q.sortBy) {
    case "highest_rated":
      orderBy = [desc(techniciansTable.rating)];
      break;
    case "lowest_price":
      orderBy = [asc(techniciansTable.hourlyRate)];
      break;
    case "most_experienced":
      orderBy = [desc(techniciansTable.yearsExperience), desc(techniciansTable.completedJobs)];
      break;
    case "fastest":
      orderBy = [desc(techniciansTable.completedJobs), desc(techniciansTable.rating)];
      break;
    case "nearest":
      if (hasLocation) {
        // True distance sort: technicians with no coordinates sink to end
        orderBy = [
          sql`CASE WHEN ${techniciansTable.latitude} IS NOT NULL AND ${techniciansTable.longitude} IS NOT NULL THEN 0 ELSE 1 END`,
          sql`${haversineKm(q.lat!, q.lng!)} ASC NULLS LAST`,
        ];
      } else {
        // No location provided — fall back to highest rated
        orderBy = [desc(techniciansTable.rating)];
      }
      break;
    default:
      orderBy = [desc(techniciansTable.rating)];
  }

  const rows = await db
    .select()
    .from(techniciansTable)
    .innerJoin(usersTable, eq(techniciansTable.userId, usersTable.id))
    .where(whereClause)
    .orderBy(...orderBy)
    .limit(q.limit ?? 50);

  res.json(rows.map(({ technicians: t, users: u }) => {
    const distance = (hasLocation && t.latitude && t.longitude)
      ? Math.round(
          6371 * Math.acos(Math.min(1, Math.max(-1,
            Math.cos(q.lat! * Math.PI / 180) * Math.cos((t.latitude as number) * Math.PI / 180)
            * Math.cos(((t.longitude as number) - q.lng!) * Math.PI / 180)
            + Math.sin(q.lat! * Math.PI / 180) * Math.sin((t.latitude as number) * Math.PI / 180)
          ))) * 10
        ) / 10
      : null;
    return {
      ...publicTechRow(t),
      name: u.name,
      distance,
    };
  }));
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
    profilePictureUrl: d.profilePictureUrl ?? null,
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
    latitude: d.latitude ?? null,
    longitude: d.longitude ?? null,
    currentStatus: (d.currentStatus as "online" | "offline" | "busy" | "on_break" | "emergency_only" | undefined) ?? "offline",
    verificationBadges: (d.verificationBadges as string[] | undefined) ?? [],
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
