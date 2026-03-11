import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(process.cwd(), "data");
console.log(`[Server] Data directory set to: ${DATA_DIR}`);

const AGREEMENTS_FILE = path.join(DATA_DIR, "agreements.json");
const DEBTORS_FILE = path.join(DATA_DIR, "debtors.json");
const STAFF_FILE = path.join(DATA_DIR, "staff.json");

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

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) {
  console.log(`Creating directory: ${DATA_DIR}`);
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Test writability
try {
  const testFile = path.join(DATA_DIR, ".write-test");
  fs.writeFileSync(testFile, "test");
  fs.unlinkSync(testFile);
  console.log(`Data directory ${DATA_DIR} is writable`);
} catch (e) {
  console.error(`CRITICAL: Data directory ${DATA_DIR} is NOT writable:`, e);
}

const ensureFile = (file: string, defaultData: any) => {
  if (!fs.existsSync(file)) {
    console.log(`[Server] Creating ${file} with initial data`);
    fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
  } else {
    // Check if file is valid JSON and not empty
    try {
      const content = fs.readFileSync(file, 'utf-8');
      if (!content || content.trim() === '' || content === '[]') {
        // Only reset if it's actually empty or just an empty array (if it's debtors)
        if (file === DEBTORS_FILE && content === '[]') {
           console.log(`[Server] File ${file} is empty array, resetting to INITIAL_DEBTORS`);
           fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
           return;
        }
        if (!content || content.trim() === '') {
          console.log(`[Server] File ${file} is empty, resetting to default`);
          fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
        }
      }
    } catch (e) {
      console.error(`[Server] Error reading ${file}, resetting to default:`, e);
      fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
    }
  }
};

ensureFile(AGREEMENTS_FILE, []);
ensureFile(DEBTORS_FILE, INITIAL_DEBTORS);
ensureFile(STAFF_FILE, { officialSignature: "" });

// Log initial counts
try {
  const agreements = JSON.parse(fs.readFileSync(AGREEMENTS_FILE, "utf-8"));
  const debtors = JSON.parse(fs.readFileSync(DEBTORS_FILE, "utf-8"));
  console.log(`[Server] Startup: ${agreements.length} agreements, ${debtors.length} debtors loaded from disk.`);
} catch (e) {
  console.error("[Server] Error reading files on startup:", e);
}

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

  // Detailed request logging for debugging 405/404 errors
  app.use((req, res, next) => {
    console.log(`[Server] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Error handling middleware for body-parser
  app.use((err: any, req: any, res: any, next: any) => {
    if (err) {
      console.error("Express Error:", err);
      if (err.type === 'entity.too.large') {
        return res.status(413).json({ error: "Payload too large. Please try smaller images." });
      }
      return res.status(400).json({ error: err.message });
    }
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

  app.get(["/api/debtors", "/api/debtors/"], (req, res) => {
    try {
      if (fs.existsSync(DEBTORS_FILE)) {
        const data = fs.readFileSync(DEBTORS_FILE, "utf-8");
        if (data && data.trim() !== '') {
          return res.json(JSON.parse(data));
        }
      }
      res.json(INITIAL_DEBTORS);
    } catch (error) {
      console.error("Error reading debtors:", error);
      res.status(500).json({ error: "Failed to read debtors" });
    }
  });

  app.post(["/api/debtors", "/api/debtors/"], (req, res) => {
    try {
      if (!req.body || !Array.isArray(req.body)) throw new Error("Invalid body: expected array");
      const dataStr = JSON.stringify(req.body, null, 2);
      console.log(`[Server] POST /api/debtors: Saving ${req.body.length} debtors to ${DEBTORS_FILE}`);
      fs.writeFileSync(DEBTORS_FILE, dataStr);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Server] POST /api/debtors error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get(["/api/agreements", "/api/agreements/"], (req, res) => {
    try {
      if (fs.existsSync(AGREEMENTS_FILE)) {
        const data = fs.readFileSync(AGREEMENTS_FILE, "utf-8");
        return res.json(JSON.parse(data));
      }
      res.json([]);
    } catch (error) {
      console.error("Error reading agreements:", error);
      res.status(500).json({ error: "Failed to read agreements" });
    }
  });

  app.post(["/api/agreements", "/api/agreements/"], (req, res) => {
    try {
      let agreements = [];
      if (fs.existsSync(AGREEMENTS_FILE)) {
        const content = fs.readFileSync(AGREEMENTS_FILE, "utf-8");
        try {
          agreements = content ? JSON.parse(content) : [];
        } catch (e) {
          console.error("[Server] Corrupted agreements.json, resetting to empty array");
          agreements = [];
        }
      }
      
      const newAgreement = req.body;
      if (!newAgreement || !newAgreement.id) {
        return res.status(400).json({ error: "Invalid agreement data: missing ID" });
      }
      
      const index = agreements.findIndex((a: any) => a.id === newAgreement.id);
      if (index !== -1) {
        agreements[index] = newAgreement;
      } else {
        agreements.push(newAgreement);
      }
      
      fs.writeFileSync(AGREEMENTS_FILE, JSON.stringify(agreements, null, 2));
      console.log(`[Server] Saved agreement ${newAgreement.id}. Total agreements: ${agreements.length}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Server] Error saving agreement:", error);
      res.status(500).json({ error: `Failed to save agreement: ${error.message}` });
    }
  });

  app.post("/api/agreements/sync", (req, res) => {
    try {
      const agreements = req.body;
      if (!Array.isArray(agreements)) throw new Error("Invalid data format: expected array");
      
      fs.writeFileSync(AGREEMENTS_FILE, JSON.stringify(agreements, null, 2));
      console.log(`[Server] Synced ${agreements.length} agreements from cloud to ${AGREEMENTS_FILE}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Server] Sync agreements error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Support both PATCH and POST for updates to avoid 405 errors in some environments
  const handleUpdate = (req: any, res: any) => {
    try {
      const agreements = JSON.parse(fs.readFileSync(AGREEMENTS_FILE, "utf-8"));
      const { id } = req.params;
      const updates = req.body;
      
      console.log(`[Server] Updating agreement ${id} via ${req.method}`);
      
      const index = agreements.findIndex((a: any) => a.id === id);
      if (index !== -1) {
        agreements[index] = { ...agreements[index], ...updates };
        fs.writeFileSync(AGREEMENTS_FILE, JSON.stringify(agreements, null, 2));
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Agreement not found" });
      }
    } catch (error) {
      console.error("[Server] Update error:", error);
      res.status(500).json({ error: "Failed to update agreement" });
    }
  };

  app.patch("/api/agreements/:id", handleUpdate);
  app.post("/api/agreements/:id", handleUpdate);

  app.delete("/api/agreements/:id", (req, res) => {
    try {
      let agreements = JSON.parse(fs.readFileSync(AGREEMENTS_FILE, "utf-8"));
      const { id } = req.params;
      
      agreements = agreements.filter((a: any) => a.id !== id);
      fs.writeFileSync(AGREEMENTS_FILE, JSON.stringify(agreements, null, 2));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete agreement" });
    }
  });

  app.get("/api/staff", (req, res) => {
    try {
      const data = fs.readFileSync(STAFF_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(500).json({ error: "Failed to read staff config" });
    }
  });

  app.post("/api/staff", (req, res) => {
    try {
      fs.writeFileSync(STAFF_FILE, JSON.stringify(req.body, null, 2));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save staff config" });
    }
  });

  app.get("/api/status", (req, res) => {
    try {
      const agreements = fs.existsSync(AGREEMENTS_FILE) ? JSON.parse(fs.readFileSync(AGREEMENTS_FILE, "utf-8")) : [];
      const debtors = fs.existsSync(DEBTORS_FILE) ? JSON.parse(fs.readFileSync(DEBTORS_FILE, "utf-8")) : [];
      res.json({
        agreementsCount: agreements.length,
        debtorsCount: debtors.length,
        agreementsFile: AGREEMENTS_FILE,
        debtorsFile: DEBTORS_FILE,
        writable: fs.accessSync(DATA_DIR, fs.constants.W_OK) === undefined
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Catch-all
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API endpoint ${req.method} ${req.url} not found or method not allowed` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
