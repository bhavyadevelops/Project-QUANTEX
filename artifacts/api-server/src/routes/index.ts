import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import serviceCategoriesRouter from "./service-categories";
import techniciansRouter from "./technicians";
import bookingsRouter from "./bookings";
import reviewsRouter from "./reviews";
import dashboardRouter from "./dashboard";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(serviceCategoriesRouter);
router.use(techniciansRouter);
router.use(bookingsRouter);
router.use(reviewsRouter);
router.use(dashboardRouter);
router.use(aiRouter);

export default router;
