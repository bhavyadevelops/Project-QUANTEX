import { pgTable, text, serial, integer, boolean, real, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const techniciansTable = pgTable("technicians", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  skills: text("skills").array().notNull().default([]),
  rating: real("rating").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  isAvailable: boolean("is_available").notNull().default(true),
  completedJobs: integer("completed_jobs").notNull().default(0),
  hourlyRate: real("hourly_rate").notNull().default(0),
  responseTime: text("response_time").notNull().default("30 min"),
  categoryIds: integer("category_ids").array().notNull().default([]),
  // Professional profile fields
  profession: text("profession").array().notNull().default([]),
  servicesOffered: jsonb("services_offered").$type<Record<string, string[]>>().default({}),
  yearsExperience: integer("years_experience"),
  certifications: text("certifications").array().notNull().default([]),
  previousCompany: text("previous_company"),
  areasOfExpertise: text("areas_of_expertise").array().notNull().default([]),
  languagesSpoken: text("languages_spoken").array().notNull().default([]),
  // Pricing
  visitCharge: real("visit_charge"),
  perJobRate: real("per_job_rate"),
  inspectionCharge: real("inspection_charge"),
  emergencyCharge: real("emergency_charge"),
  weekendCharge: real("weekend_charge"),
  nightCharge: real("night_charge"),
  // Availability
  workingDays: text("working_days").array().notNull().default([]),
  workingHoursStart: text("working_hours_start"),
  workingHoursEnd: text("working_hours_end"),
  emergencyAvailable: boolean("emergency_available").notNull().default(false),
  vacationMode: boolean("vacation_mode").notNull().default(false),
  maxDailyBookings: integer("max_daily_bookings"),
  serviceRadius: integer("service_radius"),
  // Location
  serviceCity: text("service_city"),
  pinCode: text("pin_code"),
  // Personal (owner-only fields — never exposed on public list/detail endpoints)
  gender: text("gender"),
  dateOfBirth: text("date_of_birth"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  unique("technicians_user_id_unique").on(t.userId),
]);

export const insertTechnicianSchema = createInsertSchema(techniciansTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTechnician = z.infer<typeof insertTechnicianSchema>;
export type Technician = typeof techniciansTable.$inferSelect;
