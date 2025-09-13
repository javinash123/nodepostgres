import { users, clients, projects, projectExtensions, projectFiles, employees, employeeSalaries, projectEmployees, projectStatusHistory, appSettings, type User, type InsertUser, type Client, type InsertClient, type Project, type InsertProject, type ProjectExtension, type InsertProjectExtension, type ProjectFile, type InsertProjectFile, type Employee, type InsertEmployee, type EmployeeSalary, type InsertEmployeeSalary, type ProjectEmployee, type InsertProjectEmployee, type ProjectStatusHistory, type InsertProjectStatusHistory, type ProjectWithDetails, type AppSettings, type InsertAppSettings } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: string, hashedPassword: string): Promise<boolean>;
  createDefaultAdmin(): Promise<User>;

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

  // Employee Salary Management
  getEmployeeSalaryHistory(employeeId: string): Promise<EmployeeSalary[]>;
  createEmployeeSalary(salary: InsertEmployeeSalary): Promise<EmployeeSalary>;
  getEmployeeCurrentSalary(employeeId: string, financialYear?: string): Promise<EmployeeSalary | null>;
  getEmployeeSalariesByFinancialYear(financialYear: string): Promise<EmployeeSalary[]>;

  // Profit/Loss Analysis
  calculateProjectProfitLoss(): Promise<{
    overallProfit: number;
    totalRevenue: number;
    totalCosts: number;
    profitMargin: number;
    projectAnalysis: Array<{
      projectId: string;
      projectName: string;
      revenue: number;
      employeeCosts: number;
      profit: number;
      profitMargin: number;
      duration: number;
      status: string;
      financialYear: string;
    }>;
    employeeAnalysis: Array<{
      employeeId: string;
      employeeName: string;
      totalSalaryCost: number;
      projectsWorked: number;
      revenueGenerated: number;
      profitContribution: number;
      utilizationRate: number;
    }>;
    financialYearBreakdown: Array<{
      financialYear: string;
      revenue: number;
      costs: number;
      profit: number;
      profitMargin: number;
      projectCount: number;
    }>;
  }>;

  // Project Employee Assignments
  getProjectEmployees(projectId: string): Promise<Employee[]>;
  assignEmployeeToProject(assignment: InsertProjectEmployee): Promise<ProjectEmployee>;
  removeEmployeeFromProject(projectId: string, employeeId: string): Promise<boolean>;
  removeAllEmployeesFromProject(projectId: string): Promise<boolean>;

  // Project Status History
  getProjectStatusHistory(projectId: string): Promise<ProjectStatusHistory[]>;
  createProjectStatusHistory(statusHistory: InsertProjectStatusHistory): Promise<ProjectStatusHistory>;
  updateProjectStatus(projectId: string, newStatus: string, notes?: string): Promise<Project | undefined>;

  // Statistics
  getProjectStats(): Promise<{
    totalProjects: number;
    completedProjects: number;
    inProgressProjects: number;
    totalClients: number;
    totalEmployees: number;
  }>;

  // App Settings
  getAppSettings(): Promise<AppSettings>;
  updateAppSettings(settings: InsertAppSettings): Promise<AppSettings>;
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

  async updateUserPassword(id: string, hashedPassword: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, id))
      .returning();
    return result.length > 0;
  }

  async createDefaultAdmin(): Promise<User> {
    // Create default admin user with password "admin123"
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.default.hash('admin123', 10);
    
    const defaultAdmin: InsertUser = {
      username: 'admin@promanage.com',
      password: hashedPassword
    };
    
    // Check if admin already exists
    const existingAdmin = await this.getUserByUsername(defaultAdmin.username);
    if (existingAdmin) {
      return existingAdmin;
    }
    
    return await this.createUser(defaultAdmin);
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
      const statusHistory = await this.getProjectStatusHistory(row.projects.id);
      
      // Calculate total cost using integer cents to avoid floating-point precision issues
      const toCents = (value: string | number) => Math.round(Number(value || '0') * 100);
      const baseCents = toCents(row.projects.budget);
      const extensionCents = extensions.reduce((sum, ext) => {
        return sum + toCents(ext.extendedBudget || '0');
      }, 0);
      const totalCost = ((baseCents + extensionCents) / 100).toFixed(2);
      
      // Calculate last extension date (most recent newEndDate from extensions)
      const lastExtensionDate = extensions.length > 0 
        ? extensions
            .filter(ext => ext.newEndDate)
            .sort((a, b) => new Date(b.newEndDate!).getTime() - new Date(a.newEndDate!).getTime())[0]?.newEndDate?.toISOString()
        : undefined;
      
      result.push({
        ...row.projects,
        client: row.clients!,
        extensions,
        files,
        assignedEmployees,
        statusHistory,
        totalCost,
        lastExtensionDate,
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
    const statusHistory = await this.getProjectStatusHistory(id);

    // Calculate total cost using integer cents to avoid floating-point precision issues
    const toCents = (value: string | number) => Math.round(Number(value || '0') * 100);
    const baseCents = toCents(result.projects.budget);
    const extensionCents = extensions.reduce((sum, ext) => {
      return sum + toCents(ext.extendedBudget || '0');
    }, 0);
    const totalCost = ((baseCents + extensionCents) / 100).toFixed(2);

    // Calculate last extension date (most recent newEndDate from extensions)
    const lastExtensionDate = extensions.length > 0 
      ? extensions
          .filter(ext => ext.newEndDate)
          .sort((a, b) => new Date(b.newEndDate!).getTime() - new Date(a.newEndDate!).getTime())[0]?.newEndDate?.toISOString()
      : undefined;

    return {
      ...result.projects,
      client: result.clients!,
      extensions,
      files,
      assignedEmployees,
      statusHistory,
      totalCost,
      lastExtensionDate,
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

  async getEmployeeSalaryHistory(employeeId: string): Promise<EmployeeSalary[]> {
    return await db
      .select()
      .from(employeeSalaries)
      .where(eq(employeeSalaries.employeeId, employeeId))
      .orderBy(desc(employeeSalaries.effectiveFrom));
  }

  async createEmployeeSalary(salary: InsertEmployeeSalary): Promise<EmployeeSalary> {
    const [newSalary] = await db.insert(employeeSalaries).values(salary).returning();
    return newSalary;
  }

  async getEmployeeCurrentSalary(employeeId: string, financialYear?: string): Promise<EmployeeSalary | null> {
    // If financial year is provided, get salary for that specific year
    if (financialYear) {
      const [salary] = await db
        .select()
        .from(employeeSalaries)
        .where(
          and(
            eq(employeeSalaries.employeeId, employeeId),
            eq(employeeSalaries.financialYear, financialYear)
          )
        )
        .orderBy(desc(employeeSalaries.effectiveFrom))
        .limit(1);
      return salary || null;
    }

    // Otherwise, get the most recent salary across all years
    const [currentSalary] = await db
      .select()
      .from(employeeSalaries)
      .where(eq(employeeSalaries.employeeId, employeeId))
      .orderBy(desc(employeeSalaries.effectiveFrom))
      .limit(1);
      
    if (currentSalary) {
      return currentSalary;
    }
    
    // Fallback to legacy salary field if no salary history exists
    const employee = await this.getEmployee(employeeId);
    if (employee?.salary) {
      return {
        id: `legacy-${employeeId}`,
        employeeId,
        financialYear: new Date().getFullYear() + "-" + (new Date().getFullYear() + 1).toString().slice(-2),
        salary: employee.salary,
        effectiveFrom: employee.createdAt,
        createdAt: employee.createdAt
      };
    }
    
    return null;
  }

  async getEmployeeSalariesByFinancialYear(financialYear: string): Promise<EmployeeSalary[]> {
    return await db
      .select()
      .from(employeeSalaries)
      .where(eq(employeeSalaries.financialYear, financialYear))
      .orderBy(employeeSalaries.employeeId, desc(employeeSalaries.effectiveFrom));
  }

  // Utility function to calculate all days between two dates (including weekends)
  private calculateWorkingDays(startDate: Date, endDate: Date): number {
    let workingDays = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      // Process all days (including weekends) as working days
      workingDays++;
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workingDays;
  }

  // Utility function to calculate hold days from project status history
  private calculateHoldDays(statusHistory: ProjectStatusHistory[]): number {
    if (statusHistory.length === 0) return 0;
    
    let totalHoldDays = 0;
    let currentHoldStart: Date | null = null;
    
    // Sort status history by date (create copy to avoid mutation)
    const sortedHistory = [...statusHistory].sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
    
    for (const status of sortedHistory) {
      if (status.status === 'on-hold') {
        currentHoldStart = new Date(status.changedAt);
      } else if (currentHoldStart && (status.status === 'in-progress' || status.status === 'completed')) {
        // Calculate hold period
        const holdEndDate = new Date(status.changedAt);
        totalHoldDays += this.calculateWorkingDays(currentHoldStart, holdEndDate);
        currentHoldStart = null;
      }
    }
    
    // If project is currently on hold, calculate up to today
    if (currentHoldStart) {
      totalHoldDays += this.calculateWorkingDays(currentHoldStart, new Date());
    }
    
    return totalHoldDays;
  }

  // Function to find overlapping project periods for an employee
  private findSimultaneousProjects(employeeId: string, allProjects: ProjectWithDetails[]): Array<{projectId: string, startDate: Date, endDate: Date, workingDays: number}> {
    const employeeProjects = allProjects.filter(p => 
      p.assignedEmployees.some(emp => emp.id === employeeId)
    ).map(project => {
      const startDate = new Date(project.startDate);
      const endDate = project.completionDate ? new Date(project.completionDate) : new Date(project.endDate);
      const totalWorkingDays = this.calculateWorkingDays(startDate, endDate);
      const holdDays = this.calculateHoldDays(project.statusHistory);
      const actualWorkingDays = Math.max(1, totalWorkingDays - holdDays);
      
      return {
        projectId: project.id,
        startDate,
        endDate,
        workingDays: actualWorkingDays
      };
    });
    
    return employeeProjects;
  }

  // Function to get financial year for a specific date
  private getFinancialYearForDate(date: Date): string {
    const year = date.getFullYear();
    return date.getMonth() >= 3 ? 
      `${year}-${(year + 1).toString().slice(-2)}` : 
      `${year - 1}-${year.toString().slice(-2)}`;
  }

  // Function to get the effective end date of a project considering extensions
  private getProjectEffectiveEndDate(project: ProjectWithDetails): Date {
    // Priority 1: actualCompletionDate from extensions (latest one)
    const extensionsWithActualCompletion = project.extensions
      .filter(ext => ext.actualCompletionDate)
      .sort((a, b) => new Date(b.actualCompletionDate!).getTime() - new Date(a.actualCompletionDate!).getTime());
    
    if (extensionsWithActualCompletion.length > 0) {
      return new Date(extensionsWithActualCompletion[0].actualCompletionDate!);
    }
    
    // Priority 2: newEndDate from extensions (latest one)
    const extensionsWithNewEndDate = project.extensions
      .filter(ext => ext.newEndDate)
      .sort((a, b) => new Date(b.newEndDate!).getTime() - new Date(a.newEndDate!).getTime());
    
    if (extensionsWithNewEndDate.length > 0) {
      return new Date(extensionsWithNewEndDate[0].newEndDate!);
    }
    
    // Priority 3: project completionDate
    if (project.completionDate) {
      return new Date(project.completionDate);
    }
    
    // Priority 4: original project endDate
    return new Date(project.endDate);
  }

  // Function to get employee assignment period for a project
  private async getEmployeeAssignmentPeriod(employeeId: string, projectId: string, projectStartDate: Date, projectEndDate: Date): Promise<{start: Date, end: Date | null}> {
    const [assignment] = await db
      .select()
      .from(projectEmployees)
      .where(
        and(
          eq(projectEmployees.employeeId, employeeId),
          eq(projectEmployees.projectId, projectId)
        )
      )
      .orderBy(projectEmployees.assignedAt)
      .limit(1);
    
    if (!assignment) {
      // If no assignment record, assume not assigned
      return { start: new Date(), end: new Date(0) }; // Invalid range
    }
    
    const assignmentStart = new Date(assignment.assignedAt);
    
    // For completed projects, if assignment was recorded after project completion,
    // assume the employee worked from project start (common when adding historical data)
    let effectiveStart: Date;
    if (assignmentStart > projectEndDate) {
      // Assignment recorded after project ended - assume worked from project start
      effectiveStart = projectStartDate;
    } else {
      // Assignment can't start before project starts
      effectiveStart = assignmentStart > projectStartDate ? assignmentStart : projectStartDate;
    }
    
    // Since we don't track unassignment, assume assignment lasts until project completion
    // but don't extend beyond project end date
    const effectiveEnd = projectEndDate;
    
    return {
      start: effectiveStart,
      end: effectiveEnd
    };
  }

  // Function to get employee salary effective on a specific date
  private async getEmployeeSalaryOnDate(employeeId: string, date: Date): Promise<number> {
    const financialYear = this.getFinancialYearForDate(date);
    
    // First try: Get salary records for this employee in this financial year (exact match)
    let salaryRecords = await db
      .select()
      .from(employeeSalaries)
      .where(
        and(
          eq(employeeSalaries.employeeId, employeeId),
          eq(employeeSalaries.financialYear, financialYear)
        )
      )
      .orderBy(desc(employeeSalaries.effectiveFrom));
    
    // If no exact match, try with "FY " prefix (handle format differences)
    if (salaryRecords.length === 0) {
      salaryRecords = await db
        .select()
        .from(employeeSalaries)
        .where(
          and(
            eq(employeeSalaries.employeeId, employeeId),
            eq(employeeSalaries.financialYear, `FY ${financialYear}`)
          )
        )
        .orderBy(desc(employeeSalaries.effectiveFrom));
    }
    
    // If still no match, get all salary records for this employee and find the right one
    if (salaryRecords.length === 0) {
      salaryRecords = await db
        .select()
        .from(employeeSalaries)
        .where(eq(employeeSalaries.employeeId, employeeId))
        .orderBy(desc(employeeSalaries.effectiveFrom));
    }
    
    // Find the salary effective on the given date
    for (const record of salaryRecords) {
      if (new Date(record.effectiveFrom) <= date) {
        return parseFloat(record.salary);
      }
    }
    
    // Fallback to legacy salary field if no salary history exists
    const employee = await this.getEmployee(employeeId);
    if (employee?.salary) {
      return parseFloat(employee.salary);
    }
    
    return 0;
  }

  // Date-driven cost calculation engine
  private async calculateDateDrivenCosts(allProjects: ProjectWithDetails[], allEmployees: Employee[]): Promise<{
    projectCosts: Map<string, number>;
    employeeCosts: Map<string, number>;
    financialYearCosts: Map<string, number>;
    employeeUtilization: Map<string, {workingDays: number, totalDaysInAnalysis: number}>;
  }> {
    const projectCosts = new Map<string, number>();
    const employeeCosts = new Map<string, number>();
    const financialYearCosts = new Map<string, number>();
    const employeeUtilization = new Map<string, {workingDays: number, totalDaysInAnalysis: number}>();
    
    // Cache for employee salaries by date
    const salaryCache = new Map<string, Map<string, number>>(); // employeeId -> dateKey -> dailySalary
    
    const today = new Date();
    
    // Find analysis date range (earliest start to latest end, but not beyond today)
    let earliestStart: Date | null = null;
    let latestEnd: Date | null = null;
    
    for (const project of allProjects) {
      const startDate = new Date(project.startDate);
      const endDate = this.getProjectEffectiveEndDate(project);
      
      if (!earliestStart || startDate < earliestStart) earliestStart = startDate;
      if (!latestEnd || endDate > latestEnd) latestEnd = endDate;
    }
    
    if (!earliestStart || !latestEnd) return {
      projectCosts, employeeCosts, financialYearCosts, employeeUtilization
    };
    
    // Don't analyze future dates
    const analysisEndDate = latestEnd > today ? today : latestEnd;
    
    // Initialize employee utilization tracking
    for (const employee of allEmployees) {
      employeeUtilization.set(employee.id, {workingDays: 0, totalDaysInAnalysis: 0});
    }
    
    // Day-by-day analysis
    const currentDate = new Date(earliestStart);
    while (currentDate <= analysisEndDate) {
      // Process all days (including weekends) as working days
      const dateStr = currentDate.toISOString().split('T')[0];
      const financialYear = this.getFinancialYearForDate(currentDate);
      
      // Update total analysis days for all employees
      for (const employee of allEmployees) {
        const util = employeeUtilization.get(employee.id)!;
        util.totalDaysInAnalysis++;
      }
      
      // Find all active projects and assigned employees for this date
      const activeProjectEmployees = new Map<string, string[]>(); // projectId -> employeeIds
      
      for (const project of allProjects) {
        const projectStartDate = new Date(project.startDate);
        const projectEndDate = this.getProjectEffectiveEndDate(project);
        
        // Check if date falls within project duration
        if (currentDate >= projectStartDate && currentDate <= projectEndDate) {
          // Check if project is not on hold on this date
          const isOnHold = this.isProjectOnHoldOnDate([...project.statusHistory], currentDate);
          
          if (!isOnHold) {
            // Find employees assigned to this project on this date
            const assignedEmployeeIds = [];
            
            for (const employee of project.assignedEmployees) {
              const assignmentPeriod = await this.getEmployeeAssignmentPeriod(
                employee.id, 
                project.id, 
                projectStartDate, 
                projectEndDate
              );
              
              // Check if employee was assigned and working on this date
              if (currentDate >= assignmentPeriod.start && 
                  assignmentPeriod.end && currentDate <= assignmentPeriod.end) {
                assignedEmployeeIds.push(employee.id);
              }
            }
            
            if (assignedEmployeeIds.length > 0) {
              activeProjectEmployees.set(project.id, assignedEmployeeIds);
            }
          }
        }
      }
      
      // Calculate costs for this date
      const employeeProjectCounts = new Map<string, number>(); // employeeId -> number of active projects
      
      // Count active projects per employee
      for (const [, employeeIds] of Array.from(activeProjectEmployees.entries())) {
        for (const employeeId of employeeIds) {
          const count = employeeProjectCounts.get(employeeId) || 0;
          employeeProjectCounts.set(employeeId, count + 1);
        }
      }
      
      // Distribute costs
      for (const [projectId, employeeIds] of Array.from(activeProjectEmployees.entries())) {
        for (const employeeId of employeeIds) {
          // Get salary effective on this specific date (accounts for mid-year changes)
          const dateKey = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
          let employeeSalaries = salaryCache.get(employeeId);
          if (!employeeSalaries) {
            employeeSalaries = new Map();
            salaryCache.set(employeeId, employeeSalaries);
          }
          
          let dailySalary = employeeSalaries.get(dateKey);
          if (dailySalary === undefined) {
            const salaryOnDate = await this.getEmployeeSalaryOnDate(employeeId, currentDate);
            // Calculate daily salary: Annual salary ÷ 12 months ÷ days in current month
            const monthlySalary = salaryOnDate / 12;
            const daysInCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
            dailySalary = monthlySalary / daysInCurrentMonth;
            employeeSalaries.set(dateKey, dailySalary);
            
            // Debug logging to verify calculation
            console.log(`DEBUG SALARY: Employee ${employeeId} on ${dateKey}:`);
            console.log(`  Annual: ₹${salaryOnDate}, Monthly: ₹${monthlySalary.toFixed(2)}, Days in ${currentDate.getMonth() + 1}: ${daysInCurrentMonth}`);
            console.log(`  Daily Rate: ₹${dailySalary.toFixed(2)}`);
          }
          
          if (dailySalary > 0) {
            // Distribute proportionally across active projects
            const simultaneousProjects = employeeProjectCounts.get(employeeId) || 1;
            const proportionalCost = dailySalary / simultaneousProjects;
            
            // Add to project costs
            const currentProjectCost = projectCosts.get(projectId) || 0;
            projectCosts.set(projectId, currentProjectCost + proportionalCost);
            
            // Add to employee costs
            const currentEmployeeCost = employeeCosts.get(employeeId) || 0;
            employeeCosts.set(employeeId, currentEmployeeCost + proportionalCost);
            
            // Add to financial year costs
            const currentFYCost = financialYearCosts.get(financialYear) || 0;
            financialYearCosts.set(financialYear, currentFYCost + proportionalCost);
            
            // Update employee utilization
            const util = employeeUtilization.get(employeeId)!;
            util.workingDays++;
          }
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return {
      projectCosts,
      employeeCosts, 
      financialYearCosts,
      employeeUtilization
    };
  }

  // Function to check if project was on hold on a specific date
  private isProjectOnHoldOnDate(statusHistory: ProjectStatusHistory[], date: Date): boolean {
    const sortedHistory = [...statusHistory].sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
    
    let currentStatus = 'planning'; // Default initial status
    for (const status of sortedHistory) {
      if (new Date(status.changedAt) <= date) {
        currentStatus = status.status;
      } else {
        break;
      }
    }
    
    return currentStatus === 'on-hold';
  }

  async calculateProjectProfitLoss() {
    // Get all projects with details
    const allProjects = await this.getAllProjects();
    const allEmployees = await this.getAllEmployees();
    
    // Use date-driven cost calculation engine
    const {
      projectCosts,
      employeeCosts,
      financialYearCosts,
      employeeUtilization
    } = await this.calculateDateDrivenCosts(allProjects, allEmployees);
    
    const projectAnalysis = [];
    const employeeAnalysis = new Map();
    const financialYearBreakdown = new Map();
    
    let totalRevenue = 0;
    let totalCosts = 0;

    // Initialize employee analysis map
    for (const employee of allEmployees) {
      const utilization = employeeUtilization.get(employee.id);
      const utilizationRate = utilization && utilization.totalDaysInAnalysis > 0 
        ? (utilization.workingDays / utilization.totalDaysInAnalysis) * 100 
        : 0;
        
      employeeAnalysis.set(employee.id, {
        employeeId: employee.id,
        employeeName: employee.name,
        totalSalaryCost: employeeCosts.get(employee.id) || 0,
        projectsWorked: 0,
        revenueGenerated: 0,
        profitContribution: 0,
        utilizationRate
      });
    }

    // Analyze each project
    for (const project of allProjects) {
      const revenue = parseFloat(project.totalCost);
      const employeeProjectCosts = projectCosts.get(project.id) || 0;
      
      const profit = revenue - employeeProjectCosts;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
      
      // Calculate actual working days excluding hold periods and future dates
      const startDate = new Date(project.startDate);
      const endDate = this.getProjectEffectiveEndDate(project);
      const today = new Date();
      const analysisEndDate = endDate > today ? today : endDate;
      
      const totalWorkingDays = this.calculateWorkingDays(startDate, analysisEndDate);
      const holdDays = this.calculateHoldDays([...project.statusHistory]); // Create copy to avoid mutation
      const actualWorkingDays = Math.max(1, totalWorkingDays - holdDays);
      
      // Determine project's primary financial year (where most days fall)
      const projectFinancialYear = this.getFinancialYearForDate(startDate);
      
      projectAnalysis.push({
        projectId: project.id,
        projectName: project.name,
        revenue,
        employeeCosts: employeeProjectCosts,
        profit,
        profitMargin,
        duration: actualWorkingDays,
        status: project.status,
        financialYear: projectFinancialYear
      });
      
      totalRevenue += revenue;
      totalCosts += employeeProjectCosts;
      
      // Update employee analysis with revenue attribution
      const employeeCount = project.assignedEmployees.length;
      if (employeeCount > 0) {
        const revenuePerEmployee = revenue / employeeCount;
        
        for (const employee of project.assignedEmployees) {
          const empAnalysis = employeeAnalysis.get(employee.id);
          if (empAnalysis) {
            empAnalysis.projectsWorked += 1;
            empAnalysis.revenueGenerated += revenuePerEmployee;
          }
        }
      }
    }
    
    // Build financial year breakdown from actual daily costs
    for (const [financialYear, costs] of Array.from(financialYearCosts.entries())) {
      // Calculate revenue for this financial year
      let fyRevenue = 0;
      let fyProjectCount = 0;
      
      for (const project of allProjects) {
        const startDate = new Date(project.startDate);
        const endDate = this.getProjectEffectiveEndDate(project);
        const today = new Date();
        const analysisEndDate = endDate > today ? today : endDate;
        
        // Check if any part of project falls in this financial year
        const currentDate = new Date(startDate);
        let hasActivityInFY = false;
        
        while (currentDate <= analysisEndDate) {
          // Process all days (including weekends) as working days
          const dayFY = this.getFinancialYearForDate(currentDate);
          if (dayFY === financialYear) {
            const isOnHold = this.isProjectOnHoldOnDate([...project.statusHistory], currentDate);
            if (!isOnHold) {
              hasActivityInFY = true;
              break;
            }
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        if (hasActivityInFY) {
          fyRevenue += parseFloat(project.totalCost);
          fyProjectCount += 1;
        }
      }
      
      const fyProfit = fyRevenue - costs;
      const fyProfitMargin = fyRevenue > 0 ? (fyProfit / fyRevenue) * 100 : 0;
      
      financialYearBreakdown.set(financialYear, {
        financialYear,
        revenue: fyRevenue,
        costs,
        profit: fyProfit,
        profitMargin: fyProfitMargin,
        projectCount: fyProjectCount
      });
    }
    
    // Finalize employee analysis
    const employeeAnalysisArray = Array.from(employeeAnalysis.values()).map(emp => ({
      ...emp,
      profitContribution: emp.revenueGenerated - emp.totalSalaryCost
    }));
    
    const overallProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (overallProfit / totalRevenue) * 100 : 0;
    
    return {
      overallProfit,
      totalRevenue,
      totalCosts,
      profitMargin,
      projectAnalysis,
      employeeAnalysis: employeeAnalysisArray,
      financialYearBreakdown: Array.from(financialYearBreakdown.values())
    };
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

  async removeAllEmployeesFromProject(projectId: string): Promise<boolean> {
    const result = await db.delete(projectEmployees)
      .where(eq(projectEmployees.projectId, projectId));
    return true; // Return true even if no employees were assigned
  }

  async getProjectStatusHistory(projectId: string): Promise<ProjectStatusHistory[]> {
    return await db
      .select()
      .from(projectStatusHistory)
      .where(eq(projectStatusHistory.projectId, projectId))
      .orderBy(desc(projectStatusHistory.changedAt));
  }

  async createProjectStatusHistory(statusHistory: InsertProjectStatusHistory): Promise<ProjectStatusHistory> {
    const [newStatusHistory] = await db.insert(projectStatusHistory).values(statusHistory).returning();
    return newStatusHistory;
  }

  async updateProjectStatus(projectId: string, newStatus: string, notes?: string): Promise<Project | undefined> {
    // First update the project status
    const [updatedProject] = await db
      .update(projects)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .returning();

    if (updatedProject) {
      // Record the status change in history
      await this.createProjectStatusHistory({
        projectId,
        status: newStatus,
        notes,
        changedAt: new Date()
      });
    }

    return updatedProject || undefined;
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

  async getAppSettings(): Promise<AppSettings> {
    // Get the first (and should be only) settings record
    const [settings] = await db.select().from(appSettings).limit(1);
    
    if (settings) {
      return settings;
    }
    
    // Create default settings if none exist
    const defaultSettings: InsertAppSettings = {
      appName: "ProManage",
      appDescription: "IT Project Management System",
      primaryColor: "#3b82f6"
    };
    
    const [newSettings] = await db.insert(appSettings).values(defaultSettings).returning();
    return newSettings;
  }

  async updateAppSettings(settings: InsertAppSettings): Promise<AppSettings> {
    // Get current settings
    const current = await this.getAppSettings();
    
    // Update the settings
    const [updated] = await db
      .update(appSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(appSettings.id, current.id))
      .returning();
    
    return updated;
  }
}

export const storage = new DatabaseStorage();
