import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

console.log("[Server] Entry point reached.");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(process.cwd(), "data");
const AGREEMENTS_FILE = path.join(DATA_DIR, "agreements.json");
const DEBTORS_FILE = path.join(DATA_DIR, "debtors.json");
const STAFF_FILE = path.join(DATA_DIR, "staff.json");
const LOG_FILE = path.join(DATA_DIR, "server.log");

// Logging utility - Optimized to avoid reading entire file on every log
const logToFile = (message: string) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  console.log(logEntry.trim());
  try {
    fs.appendFileSync(LOG_FILE, logEntry);
    // Log rotation handled separately or less frequently to save memory
  } catch (e) {
    console.error("Failed to write to log file:", e);
  }
};

// Periodic log rotation (every hour) to keep file size manageable
setInterval(() => {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      if (stats.size > 1024 * 1024) { // 1MB limit
        const logs = fs.readFileSync(LOG_FILE, 'utf-8').split('\n');
        if (logs.length > 1000) {
          fs.writeFileSync(LOG_FILE, logs.slice(-1000).join('\n'));
        }
      }
    }
  } catch (e) {
    console.error("Log rotation failed:", e);
  }
}, 3600000);

async function startServer() {
  try {
    const app = express();
    const PORT = 3000;

  // Improved CORS configuration
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));
  app.options('*all', cors()); 
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Detailed request logging with status codes
  app.use((req, res, next) => {
    res.on('finish', () => {
      logToFile(`${req.method} ${req.url} ${res.statusCode}`);
    });
    next();
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      writable: fs.existsSync(DATA_DIR) 
    });
  });

  app.get("/api/logs", (req, res) => {
    try {
      if (fs.existsSync(LOG_FILE)) {
        res.type('text/plain').send(fs.readFileSync(LOG_FILE, 'utf-8'));
      } else {
        res.send("No logs found.");
      }
    } catch (e) {
      res.status(500).send("Error reading logs");
    }
  });

  app.get(["/api/agreements", "/api/agreements/"], async (req, res) => {
    try {
      const data = await fs.promises.readFile(AGREEMENTS_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      logToFile(`Error reading agreements: ${error}`);
      res.status(500).json({ error: "Failed to read agreements" });
    }
  });

  app.post(["/api/agreements", "/api/agreements/"], async (req, res) => {
    try {
      const data = await fs.promises.readFile(AGREEMENTS_FILE, "utf-8");
      const agreements = JSON.parse(data);
      const newAgreement = req.body;
      const index = agreements.findIndex((a: any) => a.id === newAgreement.id);
      if (index !== -1) agreements[index] = newAgreement;
      else agreements.push(newAgreement);
      await fs.promises.writeFile(AGREEMENTS_FILE, JSON.stringify(agreements, null, 2));
      logToFile(`Saved agreement: ${newAgreement.id}`);
      res.json({ success: true });
    } catch (error) {
      logToFile(`Error saving agreement: ${error}`);
      res.status(500).json({ error: "Failed to save agreement" });
    }
  });

  const handleUpdate = async (req: any, res: any) => {
    try {
      const data = await fs.promises.readFile(AGREEMENTS_FILE, "utf-8");
      const agreements = JSON.parse(data);
      const { id } = req.params;
      const index = agreements.findIndex((a: any) => a.id === id);
      if (index !== -1) {
        agreements[index] = { ...agreements[index], ...req.body };
        await fs.promises.writeFile(AGREEMENTS_FILE, JSON.stringify(agreements, null, 2));
        logToFile(`Updated agreement: ${id}`);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Not found" });
      }
    } catch (error) {
      logToFile(`Error updating agreement ${req.params.id}: ${error}`);
      res.status(500).json({ error: "Failed to update agreement" });
    }
  };

  app.post(["/api/agreements/sync", "/api/agreements/sync/"], async (req, res) => {
    try {
      await fs.promises.writeFile(AGREEMENTS_FILE, JSON.stringify(req.body, null, 2));
      logToFile(`Synced ${req.body.length} agreements`);
      res.json({ success: true });
    } catch (error) {
      logToFile(`Error syncing agreements: ${error}`);
      res.status(500).json({ error: "Failed to sync agreements" });
    }
  });

  app.patch(["/api/agreements/:id", "/api/agreements/:id/"], handleUpdate);
  app.post(["/api/agreements/:id", "/api/agreements/:id/"], handleUpdate);

  app.delete(["/api/agreements/:id", "/api/agreements/:id/"], async (req, res) => {
    try {
      const data = await fs.promises.readFile(AGREEMENTS_FILE, "utf-8");
      const agreements = JSON.parse(data);
      const { id } = req.params;
      const filtered = agreements.filter((a: any) => a.id !== id);
      await fs.promises.writeFile(AGREEMENTS_FILE, JSON.stringify(filtered, null, 2));
      logToFile(`Deleted agreement: ${id}`);
      res.json({ success: true });
    } catch (error) {
      logToFile(`Error deleting agreement ${req.params.id}: ${error}`);
      res.status(500).json({ error: "Failed to delete agreement" });
    }
  });

  app.get(["/api/debtors", "/api/debtors/"], async (req, res) => {
    try {
      const data = await fs.promises.readFile(DEBTORS_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(500).json({ error: "Failed to read debtors" });
    }
  });

  app.post(["/api/debtors", "/api/debtors/"], async (req, res) => {
    try {
      await fs.promises.writeFile(DEBTORS_FILE, JSON.stringify(req.body, null, 2));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save debtors" });
    }
  });

  app.get(["/api/staff", "/api/staff/"], async (req, res) => {
    try {
      const data = await fs.promises.readFile(STAFF_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(500).json({ error: "Failed to read staff config" });
    }
  });

  app.post(["/api/staff", "/api/staff/"], async (req, res) => {
    try {
      await fs.promises.writeFile(STAFF_FILE, JSON.stringify(req.body, null, 2));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save staff config" });
    }
  });

  app.get("/api/status", async (req, res) => {
    try {
      const agreementsData = await fs.promises.readFile(AGREEMENTS_FILE, "utf-8");
      const debtorsData = await fs.promises.readFile(DEBTORS_FILE, "utf-8");
      const agreements = JSON.parse(agreementsData);
      const debtors = JSON.parse(debtorsData);
      res.json({
        agreementsCount: agreements.length,
        debtorsCount: debtors.length,
        agreementsFile: AGREEMENTS_FILE,
        debtorsFile: DEBTORS_FILE,
        writable: true,
        dataDir: DATA_DIR
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Catch-all
  app.all("/api/*all", (req, res) => {
    logToFile(`API 404: ${req.method} ${req.url}`);
    res.status(404).json({ 
      error: "Not Found", 
      message: `API endpoint ${req.method} ${req.url} not found`,
      path: req.path
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e: any) {
      console.error("Failed to initialize Vite middleware:", e);
    }
  } else {
    console.log("[Server] Serving static files from dist...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  console.log(`[Server] Attempting to listen on port ${PORT}...`);
  if (process.env.NODE_ENV !== "test" && process.env.VERCEL !== "1") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[Server] SUCCESS: Running on http://0.0.0.0:${PORT}`);
    });
  }

  return app;
  } catch (error: any) {
    console.error("[Server] CRITICAL STARTUP ERROR:", error);
    throw error;
  }
}

export const appPromise = startServer();
export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};
