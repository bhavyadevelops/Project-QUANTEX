import { pgTable, text, serial, integer, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { techniciansTable } from "./technicians";
import { serviceCategoriesTable } from "./service_categories";

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
]);

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  technicianId: integer("technician_id").notNull().references(() => techniciansTable.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => serviceCategoriesTable.id),
  status: bookingStatusEnum("status").notNull().default("pending"),
  issueDescription: text("issue_description").notNull(),
  address: text("address"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  estimatedCost: real("estimated_cost").notNull().default(0),
  finalCost: real("final_cost"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
