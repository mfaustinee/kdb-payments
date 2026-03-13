import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let DATA_DIR = path.join(process.cwd(), "data");

// Resilient data directory selection
const tryDataDir = (dir: string) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const testFile = path.join(dir, ".write-test-" + Date.now());
    fs.writeFileSync(testFile, "test");
    fs.unlinkSync(testFile);
    return true;
  } catch (e) {
    console.error(`[Server] Directory ${dir} is not writable:`, e);
    return false;
  }
};

if (!tryDataDir(DATA_DIR)) {
  const fallbackDir = path.join("/tmp", "kdb-data");
  console.warn(`[Server] Falling back to writable directory: ${fallbackDir}`);
  DATA_DIR = fallbackDir;
  if (!tryDataDir(DATA_DIR)) {
    console.error("[Server] CRITICAL: No writable data directory found!");
  }
}

console.log(`[Server] Active data directory: ${DATA_DIR}`);

const AGREEMENTS_FILE = path.join(DATA_DIR, "agreements.json");
const DEBTORS_FILE = path.join(DATA_DIR, "debtors.json");
const STAFF_FILE = path.join(DATA_DIR, "staff.json");
const LOG_FILE = path.join(DATA_DIR, "server.log");

// Logging utility
const logToFile = (message: string) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  console.log(logEntry.trim());
  try {
    fs.appendFileSync(LOG_FILE, logEntry);
    // Keep log file small (last 1000 lines)
    const logs = fs.readFileSync(LOG_FILE, 'utf-8').split('\n');
    if (logs.length > 1000) {
      fs.writeFileSync(LOG_FILE, logs.slice(-1000).join('\n'));
    }
  } catch (e) {
    console.error("Failed to write to log file:", e);
  }
};

const INITIAL_DEBTORS = [
  {
    id: 'D001',
    dboName: 'Sunrise Dairy Ltd',
    premiseName: 'Sunrise Main Depot',
    permitNo: 'KDB/MB/0001/0001234/2024',
    location: 'Thika Road, Ruiru',
    county: 'Kiambu',
    arrearsBreakdown: [{ id: '1', month: 'January 2024', amount: 150000 }],
    totalArrears: 150000,
    totalArrearsWords: 'One Hundred and Fifty Thousand Shillings',
    arrearsPeriod: 'Jan 2024',
    debitNoteNo: 'DN/2024/552',
    tel: '0712345678',
    installments: [{ no: 1, period: 'Jan 2024', dueDate: '', amount: 150000 }]
  }
];

const ensureFile = (file: string, defaultData: any) => {
  if (!fs.existsSync(file)) {
    console.log(`[Server] Creating ${file} with initial data`);
    fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
  }
};

ensureFile(AGREEMENTS_FILE, []);
ensureFile(DEBTORS_FILE, INITIAL_DEBTORS);
ensureFile(STAFF_FILE, { officialSignature: "" });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Improved CORS configuration
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));
  app.options('*', cors()); 
  
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Detailed request logging
  app.use((req, res, next) => {
    logToFile(`${req.method} ${req.url}`);
    next();
  });

  // API Routes (Directly on app for maximum reliability)
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

  app.get(["/api/agreements", "/api/agreements/"], (req, res) => {
    try {
      const data = fs.readFileSync(AGREEMENTS_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      logToFile(`Error reading agreements: ${error}`);
      res.status(500).json({ error: "Failed to read agreements" });
    }
  });

  app.post(["/api/agreements", "/api/agreements/"], (req, res) => {
    try {
      const agreements = JSON.parse(fs.readFileSync(AGREEMENTS_FILE, "utf-8"));
      const newAgreement = req.body;
      const index = agreements.findIndex((a: any) => a.id === newAgreement.id);
      if (index !== -1) agreements[index] = newAgreement;
      else agreements.push(newAgreement);
      fs.writeFileSync(AGREEMENTS_FILE, JSON.stringify(agreements, null, 2));
      logToFile(`Saved agreement: ${newAgreement.id}`);
      res.json({ success: true });
    } catch (error) {
      logToFile(`Error saving agreement: ${error}`);
      res.status(500).json({ error: "Failed to save agreement" });
    }
  });

  const handleUpdate = (req: any, res: any) => {
    try {
      const agreements = JSON.parse(fs.readFileSync(AGREEMENTS_FILE, "utf-8"));
      const { id } = req.params;
      const index = agreements.findIndex((a: any) => a.id === id);
      if (index !== -1) {
        agreements[index] = { ...agreements[index], ...req.body };
        fs.writeFileSync(AGREEMENTS_FILE, JSON.stringify(agreements, null, 2));
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

  app.patch(["/api/agreements/:id", "/api/agreements/:id/"], handleUpdate);
  app.post(["/api/agreements/:id", "/api/agreements/:id/"], handleUpdate);

  app.delete(["/api/agreements/:id", "/api/agreements/:id/"], (req, res) => {
    try {
      const agreements = JSON.parse(fs.readFileSync(AGREEMENTS_FILE, "utf-8"));
      const { id } = req.params;
      const filtered = agreements.filter((a: any) => a.id !== id);
      fs.writeFileSync(AGREEMENTS_FILE, JSON.stringify(filtered, null, 2));
      logToFile(`Deleted agreement: ${id}`);
      res.json({ success: true });
    } catch (error) {
      logToFile(`Error deleting agreement ${req.params.id}: ${error}`);
      res.status(500).json({ error: "Failed to delete agreement" });
    }
  });

  app.post(["/api/agreements/sync", "/api/agreements/sync/"], (req, res) => {
    try {
      fs.writeFileSync(AGREEMENTS_FILE, JSON.stringify(req.body, null, 2));
      logToFile(`Synced ${req.body.length} agreements`);
      res.json({ success: true });
    } catch (error) {
      logToFile(`Error syncing agreements: ${error}`);
      res.status(500).json({ error: "Failed to sync agreements" });
    }
  });

  app.get(["/api/debtors", "/api/debtors/"], (req, res) => {
    try {
      const data = fs.readFileSync(DEBTORS_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(500).json({ error: "Failed to read debtors" });
    }
  });

  app.post(["/api/debtors", "/api/debtors/"], (req, res) => {
    try {
      fs.writeFileSync(DEBTORS_FILE, JSON.stringify(req.body, null, 2));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save debtors" });
    }
  });

  app.get(["/api/staff", "/api/staff/"], (req, res) => {
    try {
      const data = fs.readFileSync(STAFF_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(500).json({ error: "Failed to read staff config" });
    }
  });

  app.post(["/api/staff", "/api/staff/"], (req, res) => {
    try {
      fs.writeFileSync(STAFF_FILE, JSON.stringify(req.body, null, 2));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save staff config" });
    }
  });

  app.get("/api/status", (req, res) => {
    try {
      const agreements = JSON.parse(fs.readFileSync(AGREEMENTS_FILE, "utf-8"));
      const debtors = JSON.parse(fs.readFileSync(DEBTORS_FILE, "utf-8"));
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
  app.all("/api/*", (req, res) => {
    logToFile(`API 404: ${req.method} ${req.url}`);
    res.status(404).json({ 
      error: "Not Found", 
      message: `API endpoint ${req.method} ${req.url} not found`,
      path: req.path
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (process.env.NODE_ENV !== "test" && process.env.VERCEL !== "1") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

export const appPromise = startServer();
export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};
