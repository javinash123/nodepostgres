import { users, clients, projects, projectExtensions, projectFiles, employees, projectEmployees, type User, type InsertUser, type Client, type InsertClient, type Project, type InsertProject, type ProjectExtension, type InsertProjectExtension, type ProjectFile, type InsertProjectFile, type Employee, type InsertEmployee, type ProjectEmployee, type InsertProjectEmployee, type ProjectWithDetails } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Clients
  getAllClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;

  // Projects
  getAllProjects(): Promise<ProjectWithDetails[]>;
  getProject(id: string): Promise<ProjectWithDetails | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // Project Extensions
  getProjectExtensions(projectId: string): Promise<ProjectExtension[]>;
  createProjectExtension(extension: InsertProjectExtension): Promise<ProjectExtension>;

  // Project Files
  getProjectFiles(projectId: string): Promise<ProjectFile[]>;
  createProjectFile(file: InsertProjectFile): Promise<ProjectFile>;
  deleteProjectFile(id: string): Promise<boolean>;

  // Employees
  getAllEmployees(): Promise<Employee[]>;
  getEmployee(id: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<boolean>;

  // Project Employee Assignments
  getProjectEmployees(projectId: string): Promise<Employee[]>;
  assignEmployeeToProject(assignment: InsertProjectEmployee): Promise<ProjectEmployee>;
  removeEmployeeFromProject(projectId: string, employeeId: string): Promise<boolean>;

  // Statistics
  getProjectStats(): Promise<{
    totalProjects: number;
    completedProjects: number;
    inProgressProjects: number;
    totalClients: number;
    totalEmployees: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(clients.name);
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined> {
    const [updated] = await db
      .update(clients)
      .set(client)
      .where(eq(clients.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteClient(id: string): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id));
    return result.length > 0;
  }

  async getAllProjects(): Promise<ProjectWithDetails[]> {
    const projectsWithDetails = await db
      .select()
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .orderBy(desc(projects.createdAt));

    const result: ProjectWithDetails[] = [];
    
    for (const row of projectsWithDetails) {
      const extensions = await this.getProjectExtensions(row.projects.id);
      const files = await this.getProjectFiles(row.projects.id);
      const assignedEmployees = await this.getProjectEmployees(row.projects.id);
      
      // Calculate total cost
      const baseBudget = parseFloat(row.projects.budget || '0');
      const extensionCosts = extensions.reduce((sum, ext) => {
        return sum + parseFloat(ext.extendedBudget || '0');
      }, 0);
      const totalCost = (baseBudget + extensionCosts).toFixed(2);
      
      result.push({
        ...row.projects,
        client: row.clients!,
        extensions,
        files,
        assignedEmployees,
        totalCost,
      });
    }

    return result;
  }

  async getProject(id: string): Promise<ProjectWithDetails | undefined> {
    const [result] = await db
      .select()
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(eq(projects.id, id));

    if (!result) return undefined;

    const extensions = await this.getProjectExtensions(id);
    const files = await this.getProjectFiles(id);
    const assignedEmployees = await this.getProjectEmployees(id);

    // Calculate total cost
    const baseBudget = parseFloat(result.projects.budget || '0');
    const extensionCosts = extensions.reduce((sum, ext) => {
      return sum + parseFloat(ext.extendedBudget || '0');
    }, 0);
    const totalCost = (baseBudget + extensionCosts).toFixed(2);

    return {
      ...result.projects,
      client: result.clients!,
      extensions,
      files,
      assignedEmployees,
      totalCost,
    };
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values({
      ...project,
      updatedAt: new Date(),
    }).returning();
    return newProject;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.length > 0;
  }

  async getProjectExtensions(projectId: string): Promise<ProjectExtension[]> {
    return await db
      .select()
      .from(projectExtensions)
      .where(eq(projectExtensions.projectId, projectId))
      .orderBy(desc(projectExtensions.createdAt));
  }

  async createProjectExtension(extension: InsertProjectExtension): Promise<ProjectExtension> {
    const [newExtension] = await db.insert(projectExtensions).values(extension).returning();
    return newExtension;
  }

  async getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    return await db
      .select()
      .from(projectFiles)
      .where(eq(projectFiles.projectId, projectId))
      .orderBy(desc(projectFiles.uploadedAt));
  }

  async createProjectFile(file: InsertProjectFile): Promise<ProjectFile> {
    const [newFile] = await db.insert(projectFiles).values(file).returning();
    return newFile;
  }

  async deleteProjectFile(id: string): Promise<boolean> {
    const result = await db.delete(projectFiles).where(eq(projectFiles.id, id));
    return result.length > 0;
  }

  async getAllEmployees(): Promise<Employee[]> {
    return await db.select().from(employees).orderBy(employees.name);
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee || undefined;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db.insert(employees).values(employee).returning();
    return newEmployee;
  }

  async updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [updated] = await db
      .update(employees)
      .set(employee)
      .where(eq(employees.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const result = await db.delete(employees).where(eq(employees.id, id));
    return result.length > 0;
  }

  async getProjectEmployees(projectId: string): Promise<Employee[]> {
    const result = await db
      .select()
      .from(projectEmployees)
      .leftJoin(employees, eq(projectEmployees.employeeId, employees.id))
      .where(eq(projectEmployees.projectId, projectId))
      .orderBy(employees.name);

    return result.map(row => row.employees!);
  }

  async assignEmployeeToProject(assignment: InsertProjectEmployee): Promise<ProjectEmployee> {
    const [newAssignment] = await db.insert(projectEmployees).values(assignment).returning();
    return newAssignment;
  }

  async removeEmployeeFromProject(projectId: string, employeeId: string): Promise<boolean> {
    const result = await db.delete(projectEmployees)
      .where(and(
        eq(projectEmployees.projectId, projectId),
        eq(projectEmployees.employeeId, employeeId)
      ));
    return result.length > 0;
  }

  async getProjectStats(): Promise<{
    totalProjects: number;
    completedProjects: number;
    inProgressProjects: number;
    totalClients: number;
    totalEmployees: number;
  }> {
    const [totalProjectsResult] = await db.select({ count: count() }).from(projects);
    const [completedProjectsResult] = await db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.status, 'completed'));
    const [inProgressProjectsResult] = await db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.status, 'in-progress'));
    const [totalClientsResult] = await db.select({ count: count() }).from(clients);
    const [totalEmployeesResult] = await db.select({ count: count() }).from(employees);

    return {
      totalProjects: totalProjectsResult.count,
      completedProjects: completedProjectsResult.count,
      inProgressProjects: inProgressProjectsResult.count,
      totalClients: totalClientsResult.count,
      totalEmployees: totalEmployeesResult.count,
    };
  }
}

export const storage = new DatabaseStorage();
