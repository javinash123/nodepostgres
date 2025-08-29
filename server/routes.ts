import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertProjectSchema, insertProjectExtensionSchema, insertEmployeeSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // For now, use hardcoded admin credentials
      // In production, hash the password properly
      if (username === 'admin@promanage.com' && password === 'admin123') {
        req.session.userId = 'admin';
        res.json({ success: true, user: { id: 'admin', username } });
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Login failed' });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/me", (req, res) => {
    if (req.session.userId) {
      res.json({ id: req.session.userId, username: 'admin@promanage.com' });
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });

  // Middleware to check authentication
  const requireAuth = (req: Request, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    next();
  };

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

  const httpServer = createServer(app);
  return httpServer;
}
