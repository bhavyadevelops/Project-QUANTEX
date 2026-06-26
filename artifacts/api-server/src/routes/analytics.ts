import { Router, type IRouter } from "express";
import { eq, count, avg, sql } from "drizzle-orm";
import { db, bookingsTable, techniciansTable, usersTable, serviceCategoriesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/analytics/summary", async (req, res): Promise<void> => {
  try {
    const allBookings = await db.select({
      status: bookingsTable.status,
      finalCost: bookingsTable.finalCost,
      estimatedCost: bookingsTable.estimatedCost,
      categoryId: bookingsTable.categoryId,
    }).from(bookingsTable);

    const totalRequests = allBookings.length;
    const completedJobs = allBookings.filter(b => b.status === "completed").length;
    const pendingJobs = allBookings.filter(b => b.status === "pending").length;
    const cancelledJobs = allBookings.filter(b => b.status === "cancelled").length;
    const activeJobs = allBookings.filter(b => b.status === "accepted" || b.status === "in_progress").length;

    const completedWithCost = allBookings.filter(b => b.status === "completed" && (b.finalCost ?? b.estimatedCost) != null);
    const averageRepairCost = completedWithCost.length > 0
      ? completedWithCost.reduce((sum, b) => sum + (b.finalCost ?? b.estimatedCost ?? 0), 0) / completedWithCost.length
      : 0;

    const [{ techCount }] = await db.select({ techCount: count() }).from(techniciansTable);
    const [{ custCount }] = await db.select({ custCount: count() }).from(usersTable).where(eq(usersTable.role, "customer"));

    const techRatingResult = await db.select({ avgRating: avg(techniciansTable.rating) }).from(techniciansTable);
    const averageTechnicianRating = parseFloat(String(techRatingResult[0]?.avgRating ?? "0")) || 0;

    const categories = await db.select({
      categoryId: bookingsTable.categoryId,
      bookingCount: count(),
    }).from(bookingsTable).groupBy(bookingsTable.categoryId);

    const categoryNames = await db.select({
      id: serviceCategoriesTable.id,
      name: serviceCategoriesTable.name,
    }).from(serviceCategoriesTable);

    const nameMap = new Map(categoryNames.map(c => [c.id, c.name]));
    const topCategories = categories
      .map(c => ({ name: nameMap.get(c.categoryId) ?? "Unknown", count: c.bookingCount }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    res.json({
      totalRequests,
      completedJobs,
      pendingJobs,
      cancelledJobs,
      activeJobs,
      averageRepairCost: Math.round(averageRepairCost * 100) / 100,
      technicianCount: techCount,
      customerCount: custCount,
      averageTechnicianRating: Math.round(averageTechnicianRating * 10) / 10,
      topCategories,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to compute analytics" });
  }
});

export default router;
