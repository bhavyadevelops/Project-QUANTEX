import { Router, type IRouter } from "express";
import { eq, and, sum, count } from "drizzle-orm";
import { db, bookingsTable, techniciansTable, usersTable, serviceCategoriesTable } from "@workspace/db";
import { getAuthUser } from "./auth";

const router: IRouter = Router();

router.get("/dashboard/customer", async (req, res): Promise<void> => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getAuthUser(token);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const allBookings = await db.select().from(bookingsTable)
    .where(eq(bookingsTable.customerId, user.id))
    .orderBy(bookingsTable.createdAt);

  const activeBookings = allBookings.filter(b => b.status === "accepted" || b.status === "in_progress").length;
  const completedBookings = allBookings.filter(b => b.status === "completed").length;
  const upcomingBookings = allBookings.filter(b => b.status === "pending").length;
  const totalSpent = allBookings
    .filter(b => b.status === "completed")
    .reduce((sum, b) => sum + (b.finalCost ?? b.estimatedCost ?? 0), 0);

  const recentBookings = allBookings.slice(-5).reverse();
  const enriched = await Promise.all(recentBookings.map(async (b) => {
    const [customer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, b.customerId));
    const [tech] = await db.select({ name: usersTable.name })
      .from(techniciansTable)
      .innerJoin(usersTable, eq(techniciansTable.userId, usersTable.id))
      .where(eq(techniciansTable.id, b.technicianId));
    const [cat] = await db.select({ name: serviceCategoriesTable.name }).from(serviceCategoriesTable).where(eq(serviceCategoriesTable.id, b.categoryId));

    return {
      ...b,
      scheduledAt: b.scheduledAt.toISOString(),
      createdAt: b.createdAt.toISOString(),
      customerName: customer?.name ?? null,
      technicianName: tech?.name ?? null,
      categoryName: cat?.name ?? null,
    };
  }));

  res.json({
    activeBookings,
    completedBookings,
    totalSpent: Math.round(totalSpent * 100) / 100,
    upcomingBookings,
    recentBookings: enriched,
  });
});

router.get("/dashboard/technician", async (req, res): Promise<void> => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getAuthUser(token);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [tech] = await db.select().from(techniciansTable).where(eq(techniciansTable.userId, user.id));

  if (!tech) {
    res.json({
      pendingRequests: 0,
      activeJobs: 0,
      completedJobs: 0,
      totalEarnings: 0,
      thisMonthEarnings: 0,
      rating: 0,
      acceptanceRate: 0,
      recentBookings: [],
    });
    return;
  }

  const allBookings = await db.select().from(bookingsTable)
    .where(eq(bookingsTable.technicianId, tech.id))
    .orderBy(bookingsTable.createdAt);

  const pendingRequests = allBookings.filter(b => b.status === "pending").length;
  const activeJobs = allBookings.filter(b => b.status === "accepted" || b.status === "in_progress").length;
  const completedJobs = allBookings.filter(b => b.status === "completed").length;

  const completedBookings = allBookings.filter(b => b.status === "completed");
  const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.finalCost ?? b.estimatedCost ?? 0), 0);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEarnings = completedBookings
    .filter(b => new Date(b.createdAt) >= startOfMonth)
    .reduce((sum, b) => sum + (b.finalCost ?? b.estimatedCost ?? 0), 0);

  const nonPending = allBookings.filter(b => b.status !== "pending").length;
  const accepted = allBookings.filter(b => b.status !== "pending" && b.status !== "cancelled").length;
  const acceptanceRate = nonPending > 0 ? Math.round((accepted / nonPending) * 100) : 100;

  const recentBookings = allBookings.slice(-5).reverse();
  const enriched = await Promise.all(recentBookings.map(async (b) => {
    const [customer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, b.customerId));
    const [cat] = await db.select({ name: serviceCategoriesTable.name }).from(serviceCategoriesTable).where(eq(serviceCategoriesTable.id, b.categoryId));

    return {
      ...b,
      scheduledAt: b.scheduledAt.toISOString(),
      createdAt: b.createdAt.toISOString(),
      customerName: customer?.name ?? null,
      technicianName: user.name,
      categoryName: cat?.name ?? null,
    };
  }));

  res.json({
    pendingRequests,
    activeJobs,
    completedJobs,
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    thisMonthEarnings: Math.round(thisMonthEarnings * 100) / 100,
    rating: tech.rating,
    acceptanceRate,
    recentBookings: enriched,
  });
});

export default router;
