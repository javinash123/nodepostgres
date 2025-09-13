import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from 'bcrypt';
import { insertClientSchema, insertProjectSchema, insertProjectExtensionSchema, insertEmployeeSchema, insertEmployeeSalarySchema, insertAppSettingsSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Extend Request type to include session
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Middleware to check authentication
const requireAuth = (req: Request, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Password validation function
const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (!password || password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' };
  }
  return { isValid: true };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Create default admin user on startup
  await storage.createDefaultAdmin();
  
  // Auth routes
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Use database authentication
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      req.session.userId = user.id;
      res.json({ success: true, user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.post("/api/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      // Validate new password
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ message: passwordValidation.message });
      }
      
      // Get current user
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      
      // Check if new password is different from current password
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({ message: 'New password must be different from current password' });
      }
      
      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password
      const success = await storage.updateUserPassword(user.id, hashedNewPassword);
      if (success) {
        // Regenerate session for security
        req.session.regenerate((err) => {
          if (err) {
            console.error('Session regeneration error:', err);
            return res.status(500).json({ message: 'Password updated but session renewal failed' });
          }
          req.session.userId = user.id;
          res.json({ success: true, message: 'Password updated successfully' });
        });
      } else {
        res.status(500).json({ message: 'Failed to update password' });
      }
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({ message: 'Failed to change password' });
    }
  });

  app.get("/api/me", async (req, res) => {
    if (req.session.userId) {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        res.json({ id: user.id, username: user.username });
      } else {
        res.status(401).json({ message: 'User not found' });
      }
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });

  // Stats route
  app.get("/api/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getProjectStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // Client routes
  app.get("/api/clients", requireAuth, async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch clients' });
    }
  });

  app.post("/api/clients", requireAuth, async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ message: 'Invalid client data' });
    }
  });

  app.put("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const validatedData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, validatedData);
      if (client) {
        res.json(client);
      } else {
        res.status(404).json({ message: 'Client not found' });
      }
    } catch (error) {
      res.status(400).json({ message: 'Invalid client data' });
    }
  });

  app.delete("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.deleteClient(req.params.id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ message: 'Client not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete client' });
    }
  });

  // Project routes
  app.get("/api/projects", requireAuth, async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch projects' });
    }
  });

  app.get("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (project) {
        res.json(project);
      } else {
        res.status(404).json({ message: 'Project not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch project' });
    }
  });

  app.post("/api/projects", requireAuth, async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      console.error('Project creation error:', error);
      res.status(400).json({ message: 'Invalid project data' });
    }
  });

  app.put("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const validatedData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, validatedData);
      if (project) {
        res.json(project);
      } else {
        res.status(404).json({ message: 'Project not found' });
      }
    } catch (error) {
      res.status(400).json({ message: 'Invalid project data' });
    }
  });

  app.delete("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.deleteProject(req.params.id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ message: 'Project not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete project' });
    }
  });

  // File upload route
  app.post("/api/projects/:id/files", requireAuth, upload.array('files', 10), async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      const files = req.files as Express.Multer.File[];
      const projectFiles = [];

      for (const file of files) {
        const projectFile = await storage.createProjectFile({
          projectId: req.params.id,
          fileName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
        });
        projectFiles.push(projectFile);
      }

      res.json(projectFiles);
    } catch (error) {
      res.status(500).json({ message: 'File upload failed' });
    }
  });

  app.delete("/api/files/:id", requireAuth, async (req, res) => {
    try {
      // Get file info to delete from filesystem
      const files = await storage.getProjectFiles(''); // This needs to be improved
      const fileToDelete = files.find(f => f.id === req.params.id);
      
      if (fileToDelete && fs.existsSync(fileToDelete.filePath)) {
        fs.unlinkSync(fileToDelete.filePath);
      }

      const success = await storage.deleteProjectFile(req.params.id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ message: 'File not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete file' });
    }
  });

  // Project extensions
  app.post("/api/projects/:id/extensions", requireAuth, async (req, res) => {
    try {
      const extensionData = {
        projectId: req.params.id,
        ...req.body,
      };
      const validatedData = insertProjectExtensionSchema.parse(extensionData);
      const extension = await storage.createProjectExtension(validatedData);
      res.status(201).json(extension);
    } catch (error) {
      res.status(400).json({ message: 'Invalid extension data' });
    }
  });

  // Employee routes
  app.get("/api/employees", requireAuth, async (req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch employees' });
    }
  });

  app.post("/api/employees", requireAuth, async (req, res) => {
    try {
      const validatedData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(validatedData);
      res.status(201).json(employee);
    } catch (error) {
      res.status(400).json({ message: 'Invalid employee data' });
    }
  });

  app.put("/api/employees/:id", requireAuth, async (req, res) => {
    try {
      const validatedData = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(req.params.id, validatedData);
      if (employee) {
        res.json(employee);
      } else {
        res.status(404).json({ message: 'Employee not found' });
      }
    } catch (error) {
      res.status(400).json({ message: 'Invalid employee data' });
    }
  });

  app.delete("/api/employees/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.deleteEmployee(req.params.id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ message: 'Employee not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete employee' });
    }
  });

  // Employee Salary Management routes
  app.get("/api/employees/:id/salaries", requireAuth, async (req, res) => {
    try {
      const salaries = await storage.getEmployeeSalaryHistory(req.params.id);
      res.json(salaries);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch employee salary history' });
    }
  });

  app.post("/api/employees/:id/salaries", requireAuth, async (req, res) => {
    try {
      const validatedData = insertEmployeeSalarySchema.parse({
        ...req.body,
        employeeId: req.params.id
      });
      const salary = await storage.createEmployeeSalary(validatedData);
      res.status(201).json(salary);
    } catch (error) {
      res.status(400).json({ message: 'Invalid salary data' });
    }
  });

  app.get("/api/employees/:id/current-salary", requireAuth, async (req, res) => {
    try {
      const { financialYear } = req.query;
      const salary = await storage.getEmployeeCurrentSalary(
        req.params.id, 
        financialYear as string
      );
      if (salary) {
        res.json(salary);
      } else {
        res.status(404).json({ message: 'No salary data found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch current salary' });
    }
  });

  app.get("/api/salaries/financial-year/:year", requireAuth, async (req, res) => {
    try {
      const salaries = await storage.getEmployeeSalariesByFinancialYear(req.params.year);
      res.json(salaries);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch salaries for financial year' });
    }
  });

  // Profit/Loss Analysis route
  app.get("/api/analysis/profit-loss", requireAuth, async (req, res) => {
    try {
      const analysis = await storage.calculateProjectProfitLoss();
      res.json(analysis);
    } catch (error) {
      console.error('Profit/Loss Analysis Error:', error);
      res.status(500).json({ message: 'Failed to calculate profit/loss analysis' });
    }
  });

  // Project employee assignment routes
  app.post("/api/projects/:id/employees", requireAuth, async (req, res) => {
    try {
      const { employeeId } = req.body;
      const assignment = await storage.assignEmployeeToProject({
        projectId: req.params.id,
        employeeId,
      });
      res.status(201).json(assignment);
    } catch (error) {
      res.status(400).json({ message: 'Failed to assign employee' });
    }
  });

  // Remove all employees from project
  app.delete("/api/projects/:id/employees", requireAuth, async (req, res) => {
    try {
      const success = await storage.removeAllEmployeesFromProject(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Failed to remove all employee assignments' });
    }
  });

  app.delete("/api/projects/:id/employees/:employeeId", requireAuth, async (req, res) => {
    try {
      const success = await storage.removeEmployeeFromProject(req.params.id, req.params.employeeId);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ message: 'Assignment not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Failed to remove employee assignment' });
    }
  });

  // App Settings routes
  app.get("/api/settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getAppSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch app settings' });
    }
  });

  app.put("/api/settings", requireAuth, async (req, res) => {
    try {
      const validatedData = insertAppSettingsSchema.parse(req.body);
      const settings = await storage.updateAppSettings(validatedData);
      res.json(settings);
    } catch (error) {
      res.status(400).json({ message: 'Invalid settings data' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
