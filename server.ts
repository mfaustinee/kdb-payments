import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
const AGREEMENTS_FILE = path.join(DATA_DIR, "agreements.json");
const DEBTORS_FILE = path.join(DATA_DIR, "debtors.json");
const STAFF_FILE = path.join(DATA_DIR, "staff.json");

// In-memory logs for debugging
const serverLogs: string[] = [];
const addLog = (msg: string) => {
  const log = `[${new Date().toISOString()}] ${msg}`;
  console.log(log);
  serverLogs.push(log);
  if (serverLogs.length > 100) serverLogs.shift();
};
const addError = (msg: string, err?: any) => {
  const log = `[${new Date().toISOString()}] ERROR: ${msg} ${err ? (err.message || JSON.stringify(err)) : ''}`;
  console.error(log);
  serverLogs.push(log);
  if (serverLogs.length > 100) serverLogs.shift();
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
    console.log(`Creating ${file} with initial data`);
    fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
  } else {
    // Check if file is valid JSON and not empty
    try {
      const content = fs.readFileSync(file, 'utf-8');
      if (!content || content.trim() === '') {
        console.log(`File ${file} is empty, resetting to default`);
        fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
      }
    } catch (e) {
      console.error(`Error reading ${file}, resetting to default:`, e);
      fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
    }
  }
};

ensureFile(AGREEMENTS_FILE, []);
ensureFile(DEBTORS_FILE, INITIAL_DEBTORS);
ensureFile(STAFF_FILE, { officialSignature: "" });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

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
    let writable = false;
    try {
      const testFile = path.join(DATA_DIR, ".health-test");
      fs.writeFileSync(testFile, "test");
      fs.unlinkSync(testFile);
      writable = true;
    } catch (e) {}
    
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(), 
      logs: serverLogs.length,
      writable,
      dataDir: DATA_DIR,
      tmpWritable: fs.existsSync("/tmp")
    });
  });

  app.get("/api/logs", (req, res) => {
    res.send(`<html><body style="background:#111;color:#0f0;font-family:monospace;padding:20px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h1>Server Logs</h1>
        <div>
          <button onclick="location.reload()">Refresh</button>
          <button onclick="fetch('/api/logs/clear', {method:'POST'}).then(()=>location.reload())">Clear Logs</button>
        </div>
      </div>
      <pre style="background:#000;padding:15px;border-radius:8px;border:1px solid #333;overflow:auto;max-height:80vh">${serverLogs.join('\n')}</pre>
    </body></html>`);
  });

  app.post("/api/logs/clear", (req, res) => {
    serverLogs.length = 0;
    addLog("Logs cleared");
    res.json({ success: true });
  });

  app.get("/api/agreements", (req, res) => {
    console.log("GET /api/agreements");
    try {
      const data = fs.readFileSync(AGREEMENTS_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      console.error("Error reading agreements:", error);
      res.status(500).json({ error: "Failed to read agreements" });
    }
  });

  app.post("/api/agreements", (req, res) => {
    console.log("POST /api/agreements", req.body?.id);
    try {
      const agreements = JSON.parse(fs.readFileSync(AGREEMENTS_FILE, "utf-8"));
      const newAgreement = req.body;
      
      const index = agreements.findIndex((a: any) => a.id === newAgreement.id);
      if (index !== -1) {
        agreements[index] = newAgreement;
      } else {
        agreements.push(newAgreement);
      }
      
      fs.writeFileSync(AGREEMENTS_FILE, JSON.stringify(agreements, null, 2));
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving agreement:", error);
      res.status(500).json({ error: "Failed to save agreement" });
    }
  });

  app.patch("/api/agreements/:id", (req, res) => {
    try {
      const agreements = JSON.parse(fs.readFileSync(AGREEMENTS_FILE, "utf-8"));
      const { id } = req.params;
      const updates = req.body;
      
      const index = agreements.findIndex((a: any) => a.id === id);
      if (index !== -1) {
        agreements[index] = { ...agreements[index], ...updates };
        fs.writeFileSync(AGREEMENTS_FILE, JSON.stringify(agreements, null, 2));
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Agreement not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update agreement" });
    }
  });

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

  app.get("/api/debtors", (req, res) => {
    console.log("GET /api/debtors");
    try {
      let data: string = "";
      if (fs.existsSync(DEBTORS_FILE)) {
        data = fs.readFileSync(DEBTORS_FILE, "utf-8");
      }
      
      // If primary is empty or missing, check fallback
      if (!data || data.trim() === '') {
        const tmpFile = path.join("/tmp", "debtors.json");
        if (fs.existsSync(tmpFile)) {
          data = fs.readFileSync(tmpFile, "utf-8");
          addLog(`Read debtors from fallback: ${tmpFile}`);
        }
      }
      
      if (!data || data.trim() === '') {
        return res.json(INITIAL_DEBTORS);
      }
      
      res.json(JSON.parse(data));
    } catch (error) {
      console.error("Error reading debtors:", error);
      res.status(500).json({ error: "Failed to read debtors" });
    }
  });

  app.post("/api/debtors", (req, res) => {
    const bodySize = JSON.stringify(req.body).length;
    const count = Array.isArray(req.body) ? req.body.length : 'not an array';
    addLog(`POST /api/debtors - Count: ${count}, Size: ${bodySize} bytes`);
    
    try {
      if (!req.body || !Array.isArray(req.body)) {
        throw new Error(`Invalid request body: expected array, got ${typeof req.body}`);
      }
      
      const dataStr = JSON.stringify(req.body, null, 2);
      
      // Try writing to the primary file
      try {
        fs.writeFileSync(DEBTORS_FILE, dataStr);
        addLog(`Successfully wrote to ${DEBTORS_FILE}`);
      } catch (writeErr: any) {
        addError(`Failed to write to ${DEBTORS_FILE}`, writeErr);
        
        // Fallback to /tmp if primary fails (common in serverless/read-only envs)
        const tmpFile = path.join("/tmp", "debtors.json");
        try {
          fs.writeFileSync(tmpFile, dataStr);
          addLog(`Successfully wrote to fallback: ${tmpFile}`);
        } catch (tmpErr: any) {
          addError(`Failed to write to fallback ${tmpFile}`, tmpErr);
          throw new Error(`Disk write failed: ${writeErr.message} (Fallback also failed: ${tmpErr.message})`);
        }
      }
      
      res.json({ success: true });
    } catch (error: any) {
      addError("Error saving debtors:", error);
      res.status(500).json({ 
        error: `Failed to save debtors: ${error.message || 'Unknown error'}`,
        details: error.stack
      });
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
