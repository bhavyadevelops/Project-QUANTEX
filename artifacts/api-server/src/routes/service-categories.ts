import { Router, type IRouter } from "express";
import { db, serviceCategoriesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/service-categories", async (_req, res): Promise<void> => {
  const categories = await db.select().from(serviceCategoriesTable);
  res.json(categories);
});

export default router;
