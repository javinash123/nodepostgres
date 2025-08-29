import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  source: text("source"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  websiteUrl: text("website_url"),
  androidUrl: text("android_url"),
  iosUrl: text("ios_url"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  completionDate: timestamp("completion_date"),
  budget: decimal("budget", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("planning"), // planning, in-progress, completed, on-hold
  credentials: text("credentials"), // encrypted storage
  clientSource: text("client_source"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectExtensions = pgTable("project_extensions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  newEndDate: timestamp("new_end_date"),
  extendedBudget: decimal("extended_budget", { precision: 12, scale: 2 }),
  actualCompletionDate: timestamp("actual_completion_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectFiles = pgTable("project_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  employeeCode: text("employee_code").notNull().unique(),
  designation: text("designation").notNull(),
  salary: decimal("salary", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectEmployees = pgTable("project_employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

// Relations
export const clientsRelations = relations(clients, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  extensions: many(projectExtensions),
  files: many(projectFiles),
  projectEmployees: many(projectEmployees),
}));

export const projectExtensionsRelations = relations(projectExtensions, ({ one }) => ({
  project: one(projects, {
    fields: [projectExtensions.projectId],
    references: [projects.id],
  }),
}));

export const projectFilesRelations = relations(projectFiles, ({ one }) => ({
  project: one(projects, {
    fields: [projectFiles.projectId],
    references: [projects.id],
  }),
}));

export const employeesRelations = relations(employees, ({ many }) => ({
  projectEmployees: many(projectEmployees),
}));

export const projectEmployeesRelations = relations(projectEmployees, ({ one }) => ({
  project: one(projects, {
    fields: [projectEmployees.projectId],
    references: [projects.id],
  }),
  employee: one(employees, {
    fields: [projectEmployees.employeeId],
    references: [employees.id],
  }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  completionDate: z.string().optional().transform(str => str ? new Date(str) : undefined),
  budget: z.string().or(z.number()).transform(val => String(val)),
});

export const insertProjectExtensionSchema = createInsertSchema(projectExtensions).omit({
  id: true,
  createdAt: true,
}).extend({
  newEndDate: z.string().optional().transform(str => str ? new Date(str) : undefined),
  actualCompletionDate: z.string().optional().transform(str => str ? new Date(str) : undefined),
  extendedBudget: z.string().or(z.number()).optional().transform(val => val ? String(val) : undefined),
});

export const insertProjectFileSchema = createInsertSchema(projectFiles).omit({
  id: true,
  uploadedAt: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
}).extend({
  salary: z.string().or(z.number()).optional().transform(val => val ? String(val) : undefined),
});

export const insertProjectEmployeeSchema = createInsertSchema(projectEmployees).omit({
  id: true,
  assignedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type ProjectExtension = typeof projectExtensions.$inferSelect;
export type InsertProjectExtension = z.infer<typeof insertProjectExtensionSchema>;

export type ProjectFile = typeof projectFiles.$inferSelect;
export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type ProjectEmployee = typeof projectEmployees.$inferSelect;
export type InsertProjectEmployee = z.infer<typeof insertProjectEmployeeSchema>;

// Extended types for API responses
export type ProjectWithDetails = Project & {
  client: Client;
  extensions: ProjectExtension[];
  files: ProjectFile[];
  assignedEmployees: Employee[];
  totalCost: string; // Calculated field: budget + sum of extension budgets
};
