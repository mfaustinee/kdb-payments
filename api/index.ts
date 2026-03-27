import express from "express";
import cors from "cors";
import compression from "compression";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(process.cwd(), "data");
const AGREEMENTS_FILE = path.join(DATA_DIR, "agreements.json");
const DEBTORS_FILE = path.join(DATA_DIR, "debtors.json");
const STAFF_FILE = path.join(DATA_DIR, "staff.json");
const LOG_FILE = path.join(DATA_DIR, "server.log");

// Ensure data directory exists early for logging
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Logging utility - Optimized to avoid reading entire file on every log
const logToFile = (message: string) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  console.log(logEntry.trim());
  try {
    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (e) {
    console.error("Failed to write to log file:", e);
  }
};

// Load environment variables from .env file
dotenv.config();

logToFile("[Server] Entry point reached.");
logToFile(`[Server] Environment Variable Keys: ${Object.keys(process.env).filter(k => !k.includes("KEY") && !k.includes("SECRET") && !k.includes("PASSWORD")).join(", ")}`);
const sUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const sKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
logToFile(`[Server] NODE_ENV: ${process.env.NODE_ENV}`);
logToFile(`[Server] Supabase URL configured: ${!!sUrl} ${sUrl ? `(${sUrl.substring(0, 15)}...)` : "(empty)"}`);
logToFile(`[Server] Supabase Key configured: ${!!sKey} ${sKey ? `(${sKey.substring(0, 10)}...)` : "(empty)"}`);

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
  logToFile("[Server] startServer() called");
  try {
    const app = express();
    const PORT = 3000;

    logToFile("[Server] Initializing middleware...");

    // Middleware FIRST - Ensure all routes benefit from CORS, compression and body parsing
    app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));
    logToFile("[Server] CORS middleware added.");
    app.use(compression());
    logToFile("[Server] Compression middleware added.");
    app.use(express.json({ limit: '50mb' }));
    logToFile("[Server] JSON middleware added.");
    app.use(express.urlencoded({ limit: '50mb', extended: true }));
    logToFile("[Server] URLencoded middleware added.");

    logToFile("[Server] Registering API routes...");
    
    app.get("/api/debug-env", (req, res) => {
      logToFile("[API] Serving /api/debug-env");
      res.json({
        NODE_ENV: process.env.NODE_ENV,
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? "SET" : "NOT SET",
        VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? "SET" : "NOT SET",
        PORT: process.env.PORT,
        APP_URL: process.env.APP_URL
      });
    });

    app.get("/api/config", (req, res) => {
      logToFile("[API] Serving /api/config");
      res.json({
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "",
        VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ""
      });
    });

    app.get("/api/health", (req, res) => {
      logToFile("[API] Serving /api/health");
      let writable = false;
      try {
        const testFile = path.join(DATA_DIR, ".write_test");
        fs.writeFileSync(testFile, "test");
        fs.unlinkSync(testFile);
        writable = true;
      } catch (e) {
        logToFile(`[API] Health check write test failed: ${e instanceof Error ? e.message : String(e)}`);
      }

      res.json({
        status: "ok",
        writable,
        supabaseConfigured: !!(
          process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
        ) && !!(
          process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
        ),
        timestamp: new Date().toISOString()
      });
    });

    app.get("/api/logs", (req, res) => {
      logToFile("[API] Serving /api/logs");
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

    logToFile("[Server] Registering data routes...");
    app.get("/api/agreements", async (req, res) => {
    try {
      if (!fs.existsSync(AGREEMENTS_FILE)) {
        return res.json([]);
      }
      const data = await fs.promises.readFile(AGREEMENTS_FILE, "utf-8");
      try {
        res.json(JSON.parse(data));
      } catch (parseError) {
        logToFile(`Error parsing agreements JSON: ${parseError}`);
        res.json([]); // Return empty array if corrupted
      }
    } catch (error) {
      logToFile(`Error reading agreements: ${error}`);
      res.status(500).json({ error: "Failed to read agreements" });
    }
  });

  app.post(["/api/agreements", "/api/agreements/"], async (req, res) => {
    try {
      logToFile(`Attempting to save agreement: ${req.body?.id}`);
      if (!req.body || !req.body.id) {
        logToFile("Error: Missing agreement ID in request body");
        return res.status(400).json({ error: "Missing agreement ID" });
      }

      let agreements = [];
      try {
        const data = await fs.promises.readFile(AGREEMENTS_FILE, "utf-8");
        agreements = JSON.parse(data);
      } catch (readError) {
        logToFile(`Warning: Could not read agreements file, starting fresh: ${readError}`);
        agreements = [];
      }

      const newAgreement = req.body;
      const index = agreements.findIndex((a: any) => a.id === newAgreement.id);
      if (index !== -1) {
        logToFile(`Updating existing agreement: ${newAgreement.id}`);
        agreements[index] = newAgreement;
      } else {
        logToFile(`Adding new agreement: ${newAgreement.id}`);
        agreements.push(newAgreement);
      }

      await fs.promises.writeFile(AGREEMENTS_FILE, JSON.stringify(agreements, null, 2));
      logToFile(`Successfully saved agreement: ${newAgreement.id}`);
      res.json({ success: true });
    } catch (error: any) {
      logToFile(`CRITICAL Error saving agreement: ${error.message}\nStack: ${error.stack}`);
      res.status(500).json({ error: "Failed to save agreement", details: error.message });
    }
  });

  const handleUpdate = async (req: any, res: any) => {
    try {
      const { id } = req.params;
      logToFile(`Attempting to update agreement: ${id}`);
      
      let agreements = [];
      try {
        const data = await fs.promises.readFile(AGREEMENTS_FILE, "utf-8");
        agreements = JSON.parse(data);
      } catch (readError) {
        logToFile(`Error reading agreements during update: ${readError}`);
        return res.status(500).json({ error: "Failed to read agreements" });
      }

      const index = agreements.findIndex((a: any) => a.id === id);
      if (index !== -1) {
        agreements[index] = { ...agreements[index], ...req.body };
        await fs.promises.writeFile(AGREEMENTS_FILE, JSON.stringify(agreements, null, 2));
        logToFile(`Successfully updated agreement: ${id}`);
        res.json({ success: true });
      } else {
        logToFile(`Error: Agreement not found for update: ${id}`);
        res.status(404).json({ error: "Not found" });
      }
    } catch (error: any) {
      logToFile(`CRITICAL Error updating agreement: ${error.message}`);
      res.status(500).json({ error: "Failed to update agreement", details: error.message });
    }
  };

  app.post(["/api/agreements/sync", "/api/agreements/sync/"], async (req, res) => {
    try {
      const incomingAgreements = req.body;
      logToFile(`Sync request received with ${incomingAgreements?.length} agreements`);
      
      if (!Array.isArray(incomingAgreements)) {
        logToFile("Error: Sync request body is not an array");
        return res.status(400).json({ error: "Invalid data format, expected array" });
      }

      let existingAgreements = [];
      try {
        if (fs.existsSync(AGREEMENTS_FILE)) {
          const data = await fs.promises.readFile(AGREEMENTS_FILE, "utf-8");
          existingAgreements = JSON.parse(data);
        }
      } catch (readError) {
        logToFile(`Warning: Could not read agreements file during sync, starting fresh: ${readError}`);
        existingAgreements = [];
      }

      let updatedCount = 0;
      incomingAgreements.forEach(incoming => {
        if (!incoming.id) return;
        const index = existingAgreements.findIndex((a: any) => a.id === incoming.id);
        if (index !== -1) {
          existingAgreements[index] = { ...existingAgreements[index], ...incoming };
        } else {
          existingAgreements.push(incoming);
        }
        updatedCount++;
      });

      await fs.promises.writeFile(AGREEMENTS_FILE, JSON.stringify(existingAgreements, null, 2));
      logToFile(`Successfully synced ${updatedCount} agreements`);
      res.json({ success: true, synced: updatedCount });
    } catch (error: any) {
      logToFile(`CRITICAL Error syncing agreements: ${error.message}\nStack: ${error.stack}`);
      res.status(500).json({ error: "Failed to sync agreements", details: error.message });
    }
  });

    app.patch("/api/agreements/:id", handleUpdate);
    app.post("/api/agreements/:id", handleUpdate);
    app.delete("/api/agreements/:id", async (req, res) => {
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

    logToFile("[Server] Registering debtors routes...");
    app.get("/api/debtors", async (req, res) => {
    try {
      if (!fs.existsSync(DEBTORS_FILE)) {
        return res.json([]);
      }
      const data = await fs.promises.readFile(DEBTORS_FILE, "utf-8");
      try {
        res.json(JSON.parse(data));
      } catch (parseError) {
        logToFile(`Error parsing debtors JSON: ${parseError}`);
        res.json([]);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to read debtors" });
    }
  });

    app.post("/api/debtors", async (req, res) => {
    try {
      logToFile(`Attempting to save ${req.body?.length} debtors`);
      await fs.promises.writeFile(DEBTORS_FILE, JSON.stringify(req.body, null, 2));
      logToFile(`Successfully saved debtors`);
      res.json({ success: true });
    } catch (error: any) {
      logToFile(`CRITICAL Error saving debtors: ${error.message}`);
      res.status(500).json({ error: "Failed to save debtors", details: error.message });
    }
  });

    logToFile("[Server] Registering staff routes...");
    app.get("/api/staff", async (req, res) => {
    try {
      if (!fs.existsSync(STAFF_FILE)) {
        return res.json({ officialSignature: '' });
      }
      const data = await fs.promises.readFile(STAFF_FILE, "utf-8");
      try {
        res.json(JSON.parse(data));
      } catch (parseError) {
        logToFile(`Error parsing staff JSON: ${parseError}`);
        res.json({ officialSignature: '' });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to read staff config" });
    }
  });

    app.post("/api/staff", async (req, res) => {
    try {
      logToFile(`Attempting to save staff config`);
      await fs.promises.writeFile(STAFF_FILE, JSON.stringify(req.body, null, 2));
      logToFile(`Successfully saved staff config`);
      res.json({ success: true });
    } catch (error: any) {
      logToFile(`CRITICAL Error saving staff config: ${error.message}`);
      res.status(500).json({ error: "Failed to save staff config", details: error.message });
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

    logToFile("[Server] API routes registered. Skipping catch-all for stability...");

    logToFile("[Server] Setting up SPA fallback...");
    // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    logToFile("[Server] Starting Vite in middleware mode...");
    try {
      const { createServer: createViteServer } = await import("vite");
      logToFile("[Server] Vite module imported.");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      logToFile("[Server] Vite middleware created successfully.");
      app.use(vite.middlewares);
    } catch (e: any) {
      logToFile(`[Server] ERROR creating Vite server: ${e.message}`);
      console.error("Failed to initialize Vite middleware:", e);
    }
  } else {
    console.log("[Server] Serving static files from dist...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    const status = err.status || err.statusCode || 500;
    logToFile(`UNHANDLED ERROR: ${err.message}\nStack: ${err.stack}`);
    res.status(status).json({
      error: "Internal Server Error",
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    console.log(`[Server] Creating data directory: ${DATA_DIR}`);
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Ensure initial files exist
  [AGREEMENTS_FILE, DEBTORS_FILE].forEach(file => {
    if (!fs.existsSync(file)) {
      console.log(`[Server] Initializing file: ${file}`);
      fs.writeFileSync(file, JSON.stringify([], null, 2));
    }
  });

  if (!fs.existsSync(STAFF_FILE)) {
    console.log(`[Server] Initializing staff file: ${STAFF_FILE}`);
    fs.writeFileSync(STAFF_FILE, JSON.stringify({ officialSignature: '' }, null, 2));
  }

  console.log(`[Server] Attempting to listen on port ${PORT}...`);
  if (process.env.NODE_ENV !== "test") {
    logToFile("[Server] Attempting to start server on port " + PORT);
  const server = app.listen(PORT, "0.0.0.0", () => {
    logToFile(`[Server] SUCCESS: Running on http://0.0.0.0:${PORT}`);
    console.log(`[Server] SUCCESS: Running on http://0.0.0.0:${PORT}`);
  });
  server.on('error', (e: any) => {
    logToFile(`[Server] ERROR starting server: ${e.message}`);
    console.error(`[Server] ERROR starting server: ${e.message}`);
  });
  }

  return app;
  } catch (error: any) {
    console.error("[Server] CRITICAL STARTUP ERROR:", error);
    throw error;
  }
}

export const appPromise = startServer();
