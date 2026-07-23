import express from "express";
import cors from "cors";
import compression from "compression";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { google } from "googleapis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(process.cwd(), "data");
const AGREEMENTS_FILE = path.join(DATA_DIR, "agreements.json");
const CLOSURES_FILE = path.join(DATA_DIR, "closures.json");
const COMPLAINTS_FILE = path.join(DATA_DIR, "complaints.json");
const INQUIRIES_FILE = path.join(DATA_DIR, "inquiries.json");
const DEBTORS_FILE = path.join(DATA_DIR, "debtors.json");
const STAFF_FILE = path.join(DATA_DIR, "staff.json");
const CLIENTS_FILE = path.join(DATA_DIR, "clients.json");
const RETURNS_FILE = path.join(DATA_DIR, "returns.json");
const VALIDATIONS_FILE = path.join(DATA_DIR, "validations.json");
const LOG_FILE = path.join(DATA_DIR, "server.log");

// Ensure data directory exists early for logging
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn("Could not create DATA_DIR on startup (may be read-only filesystem):", e);
}

// Logging utility - Optimized to avoid reading entire file on every log
const logToFile = (message: string) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  console.log(logEntry.trim());
  try {
    if (fs.existsSync(DATA_DIR)) {
      fs.appendFileSync(LOG_FILE, logEntry);
    }
  } catch (e) {
    // Gracefully handle read-only filesystems
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
    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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

    // Request Logger - log API and page requests, excluding individual static bundle assets to keep logs clean
    app.use((req, res, next) => {
      const isStaticSubresource = 
        req.url.endsWith(".tsx") || 
        req.url.endsWith(".ts") || 
        req.url.endsWith(".css") || 
        req.url.endsWith(".js") || 
        req.url.includes("@vite") || 
        req.url.includes("@react") || 
        req.url.includes("node_modules");

      if (!isStaticSubresource) {
        logToFile(`[Request] ${req.method} ${req.url}`);
      }
      next();
    });

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
      const sUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
      const sKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
      
      logToFile(`[API] Serving /api/config. Configured: ${!!(sUrl && sKey)}`);
      res.json({
        VITE_SUPABASE_URL: sUrl,
        VITE_SUPABASE_ANON_KEY: sKey
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

      const supabaseConfigured = !!(
        process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
      ) && !!(
        process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
      );

      const googleConfigured = !!(
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY
      );

      logToFile(`[API] Health check result: writable=${writable}, supabaseConfigured=${supabaseConfigured}, googleConfigured=${googleConfigured}`);

      res.json({
        status: "ok",
        writable,
        supabaseConfigured,
        googleConfigured,
        configured: googleConfigured, // Checked by frontend DataValidationModule
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

  app.post("/api/agreements", async (req, res) => {
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

  app.post("/api/agreements/sync", async (req, res) => {
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

    logToFile("[Server] Registering closures routes...");
    app.get("/api/closures", async (req, res) => {
      try {
        if (!fs.existsSync(CLOSURES_FILE)) {
          return res.json([]);
        }
        const data = await fs.promises.readFile(CLOSURES_FILE, "utf-8");
        try {
          res.json(JSON.parse(data));
        } catch (parseError) {
          logToFile(`Error parsing closures JSON: ${parseError}`);
          res.json([]);
        }
      } catch (error) {
        logToFile(`Error reading closures: ${error}`);
        res.status(500).json({ error: "Failed to read closures" });
      }
    });

    app.post("/api/closures", async (req, res) => {
      try {
        logToFile(`Attempting to save closure: ${req.body?.id}`);
        if (!req.body || !req.body.id) {
          logToFile("Error: Missing closure ID in request body");
          return res.status(400).json({ error: "Missing closure ID" });
        }

        let closures = [];
        try {
          if (fs.existsSync(CLOSURES_FILE)) {
            const data = await fs.promises.readFile(CLOSURES_FILE, "utf-8");
            closures = JSON.parse(data);
          }
        } catch (readError) {
          logToFile(`Warning: Could not read closures file, starting fresh: ${readError}`);
          closures = [];
        }

        const newClosure = req.body;
        const index = closures.findIndex((c: any) => c.id === newClosure.id);
        if (index !== -1) {
          logToFile(`Updating existing closure: ${newClosure.id}`);
          closures[index] = newClosure;
        } else {
          logToFile(`Adding new closure: ${newClosure.id}`);
          closures.push(newClosure);
        }

        await fs.promises.writeFile(CLOSURES_FILE, JSON.stringify(closures, null, 2));
        logToFile(`Successfully saved closure: ${newClosure.id}`);
        res.json({ success: true });
      } catch (error: any) {
        logToFile(`CRITICAL Error saving closure: ${error.message}\nStack: ${error.stack}`);
        res.status(500).json({ error: "Failed to save closure", details: error.message });
      }
    });

    app.patch("/api/closures/:id", async (req, res) => {
      try {
        const { id } = req.params;
        logToFile(`Attempting to update closure: ${id}`);
        
        let closures = [];
        try {
          const data = await fs.promises.readFile(CLOSURES_FILE, "utf-8");
          closures = JSON.parse(data);
        } catch (readError) {
          logToFile(`Error reading closures during update: ${readError}`);
          return res.status(500).json({ error: "Failed to read closures" });
        }

        const index = closures.findIndex((c: any) => c.id === id);
        if (index !== -1) {
          closures[index] = { ...closures[index], ...req.body };
          await fs.promises.writeFile(CLOSURES_FILE, JSON.stringify(closures, null, 2));
          logToFile(`Successfully updated closure: ${id}`);
          res.json({ success: true });
        } else {
          logToFile(`Error: Closure not found for update: ${id}`);
          res.status(404).json({ error: "Not found" });
        }
      } catch (error: any) {
        logToFile(`CRITICAL Error updating closure: ${error.message}`);
        res.status(500).json({ error: "Failed to update closure", details: error.message });
      }
    });

    app.delete("/api/closures/:id", async (req, res) => {
      try {
        const data = await fs.promises.readFile(CLOSURES_FILE, "utf-8");
        const closures = JSON.parse(data);
        const { id } = req.params;
        const filtered = closures.filter((c: any) => c.id !== id);
        await fs.promises.writeFile(CLOSURES_FILE, JSON.stringify(filtered, null, 2));
        logToFile(`Deleted closure: ${id}`);
        res.json({ success: true });
      } catch (error) {
        logToFile(`Error deleting closure ${req.params.id}: ${error}`);
        res.status(500).json({ error: "Failed to delete closure" });
      }
    });

    logToFile("[Server] Registering complaints routes...");
    app.get("/api/complaints", async (req, res) => {
      try {
        if (!fs.existsSync(COMPLAINTS_FILE)) {
          return res.json([]);
        }
        const data = await fs.promises.readFile(COMPLAINTS_FILE, "utf-8");
        try {
          res.json(JSON.parse(data));
        } catch (parseError) {
          logToFile(`Error parsing complaints JSON: ${parseError}`);
          res.json([]);
        }
      } catch (error) {
        logToFile(`Error reading complaints: ${error}`);
        res.status(500).json({ error: "Failed to read complaints" });
      }
    });

    app.post("/api/complaints", async (req, res) => {
      try {
        logToFile(`Attempting to save complaint: ${req.body?.id}`);
        if (!req.body || !req.body.id) {
          logToFile("Error: Missing complaint ID in request body");
          return res.status(400).json({ error: "Missing complaint ID" });
        }

        let complaints = [];
        try {
          if (fs.existsSync(COMPLAINTS_FILE)) {
            const data = await fs.promises.readFile(COMPLAINTS_FILE, "utf-8");
            complaints = JSON.parse(data);
          }
        } catch (readError) {
          logToFile(`Warning: Could not read complaints file, starting fresh: ${readError}`);
          complaints = [];
        }

        const newComplaint = req.body;
        const index = complaints.findIndex((c: any) => c.id === newComplaint.id);
        if (index !== -1) {
          logToFile(`Updating existing complaint: ${newComplaint.id}`);
          complaints[index] = newComplaint;
        } else {
          logToFile(`Adding new complaint: ${newComplaint.id}`);
          complaints.push(newComplaint);
        }

        await fs.promises.writeFile(COMPLAINTS_FILE, JSON.stringify(complaints, null, 2));
        logToFile(`Successfully saved complaint: ${newComplaint.id}`);
        res.json({ success: true });
      } catch (error: any) {
        logToFile(`CRITICAL Error saving complaint: ${error.message}`);
        res.status(500).json({ error: "Failed to save complaint", details: error.message });
      }
    });

    app.patch("/api/complaints/:id", async (req, res) => {
      try {
        const { id } = req.params;
        logToFile(`Attempting to update complaint: ${id}`);
        
        let complaints = [];
        try {
          const data = await fs.promises.readFile(COMPLAINTS_FILE, "utf-8");
          complaints = JSON.parse(data);
        } catch (readError) {
          logToFile(`Error reading complaints during update: ${readError}`);
          return res.status(500).json({ error: "Failed to read complaints" });
        }

        const index = complaints.findIndex((c: any) => c.id === id);
        if (index !== -1) {
          complaints[index] = { ...complaints[index], ...req.body };
          await fs.promises.writeFile(COMPLAINTS_FILE, JSON.stringify(complaints, null, 2));
          logToFile(`Successfully updated complaint: ${id}`);
          res.json({ success: true });
        } else {
          logToFile(`Error: Complaint not found for update: ${id}`);
          res.status(404).json({ error: "Not found" });
        }
      } catch (error: any) {
        logToFile(`CRITICAL Error updating complaint: ${error.message}`);
        res.status(500).json({ error: "Failed to update complaint", details: error.message });
      }
    });

    app.delete("/api/complaints/:id", async (req, res) => {
      try {
        const data = await fs.promises.readFile(COMPLAINTS_FILE, "utf-8");
        const complaints = JSON.parse(data);
        const { id } = req.params;
        const filtered = complaints.filter((c: any) => c.id !== id);
        await fs.promises.writeFile(COMPLAINTS_FILE, JSON.stringify(filtered, null, 2));
        logToFile(`Deleted complaint: ${id}`);
        res.json({ success: true });
      } catch (error) {
        logToFile(`Error deleting complaint ${req.params.id}: ${error}`);
        res.status(500).json({ error: "Failed to delete complaint" });
      }
    });

    logToFile("[Server] Registering inquiries routes...");
    app.get("/api/inquiries", async (req, res) => {
      try {
        if (!fs.existsSync(INQUIRIES_FILE)) {
          return res.json([]);
        }
        const data = await fs.promises.readFile(INQUIRIES_FILE, "utf-8");
        try {
          res.json(JSON.parse(data));
        } catch (parseError) {
          logToFile(`Error parsing inquiries JSON: ${parseError}`);
          res.json([]);
        }
      } catch (error) {
        logToFile(`Error reading inquiries: ${error}`);
        res.status(500).json({ error: "Failed to read inquiries" });
      }
    });

    app.post("/api/inquiries", async (req, res) => {
      try {
        logToFile(`Attempting to save inquiry: ${req.body?.id}`);
        if (!req.body || !req.body.id) {
          logToFile("Error: Missing inquiry ID in request body");
          return res.status(400).json({ error: "Missing inquiry ID" });
        }

        let inquiries = [];
        try {
          if (fs.existsSync(INQUIRIES_FILE)) {
            const data = await fs.promises.readFile(INQUIRIES_FILE, "utf-8");
            inquiries = JSON.parse(data);
          }
        } catch (readError) {
          logToFile(`Warning: Could not read inquiries file, starting fresh: ${readError}`);
          inquiries = [];
        }

        const newInquiry = req.body;
        const index = inquiries.findIndex((c: any) => c.id === newInquiry.id);
        if (index !== -1) {
          logToFile(`Updating existing inquiry: ${newInquiry.id}`);
          inquiries[index] = newInquiry;
        } else {
          logToFile(`Adding new inquiry: ${newInquiry.id}`);
          inquiries.push(newInquiry);
        }

        await fs.promises.writeFile(INQUIRIES_FILE, JSON.stringify(inquiries, null, 2));
        logToFile(`Successfully saved inquiry: ${newInquiry.id}`);
        res.json({ success: true });
      } catch (error: any) {
        logToFile(`CRITICAL Error saving inquiry: ${error.message}`);
        res.status(500).json({ error: "Failed to save inquiry", details: error.message });
      }
    });

    app.patch("/api/inquiries/:id", async (req, res) => {
      try {
        const { id } = req.params;
        logToFile(`Attempting to update inquiry: ${id}`);
        
        let inquiries = [];
        try {
          const data = await fs.promises.readFile(INQUIRIES_FILE, "utf-8");
          inquiries = JSON.parse(data);
        } catch (readError) {
          logToFile(`Error reading inquiries during update: ${readError}`);
          return res.status(500).json({ error: "Failed to read inquiries" });
        }

        const index = inquiries.findIndex((c: any) => c.id === id);
        if (index !== -1) {
          inquiries[index] = { ...inquiries[index], ...req.body };
          await fs.promises.writeFile(INQUIRIES_FILE, JSON.stringify(inquiries, null, 2));
          logToFile(`Successfully updated inquiry: ${id}`);
          res.json({ success: true });
        } else {
          logToFile(`Error: Inquiry not found for update: ${id}`);
          res.status(404).json({ error: "Not found" });
        }
      } catch (error: any) {
        logToFile(`CRITICAL Error updating inquiry: ${error.message}`);
        res.status(500).json({ error: "Failed to update inquiry", details: error.message });
      }
    });

    app.delete("/api/inquiries/:id", async (req, res) => {
      try {
        const data = await fs.promises.readFile(INQUIRIES_FILE, "utf-8");
        const inquiries = JSON.parse(data);
        const { id } = req.params;
        const filtered = inquiries.filter((c: any) => c.id !== id);
        await fs.promises.writeFile(INQUIRIES_FILE, JSON.stringify(filtered, null, 2));
        logToFile(`Deleted inquiry: ${id}`);
        res.json({ success: true });
      } catch (error) {
        logToFile(`Error deleting inquiry ${req.params.id}: ${error}`);
        res.status(500).json({ error: "Failed to delete inquiry" });
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

    logToFile("[Server] Registering clients routes...");
    app.get("/api/clients", async (req, res) => {
      try {
        if (!fs.existsSync(CLIENTS_FILE)) {
          return res.json([]);
        }
        const data = await fs.promises.readFile(CLIENTS_FILE, "utf-8");
        try {
          res.json(JSON.parse(data));
        } catch (parseError) {
          logToFile(`Error parsing clients JSON: ${parseError}`);
          res.json([]);
        }
      } catch (error) {
        logToFile(`Error reading clients: ${error}`);
        res.status(500).json({ error: "Failed to read clients" });
      }
    });

    app.post("/api/clients", async (req, res) => {
      try {
        logToFile(`Attempting to save client/clients`);
        if (!req.body) {
          return res.status(400).json({ error: "Missing request body" });
        }

        let clients = [];
        try {
          if (fs.existsSync(CLIENTS_FILE)) {
            const data = await fs.promises.readFile(CLIENTS_FILE, "utf-8");
            clients = JSON.parse(data);
          }
        } catch (readError) {
          logToFile(`Warning: Could not read clients file, starting fresh: ${readError}`);
          clients = [];
        }

        if (Array.isArray(req.body)) {
          clients = req.body;
        } else {
          const newClient = req.body;
          if (!newClient.id) {
            return res.status(400).json({ error: "Missing client ID" });
          }
          const index = clients.findIndex((c: any) => c.id === newClient.id);
          if (index !== -1) {
            logToFile(`Updating existing client: ${newClient.id}`);
            clients[index] = newClient;
          } else {
            logToFile(`Adding new client: ${newClient.id}`);
            clients.push(newClient);
          }
        }

        await fs.promises.writeFile(CLIENTS_FILE, JSON.stringify(clients, null, 2));
        logToFile(`Successfully saved clients`);
        res.json({ success: true });
      } catch (error: any) {
        logToFile(`CRITICAL Error saving clients: ${error.message}`);
        res.status(500).json({ error: "Failed to save clients", details: error.message });
      }
    });

    app.delete("/api/clients/:id", async (req, res) => {
      try {
        const { id } = req.params;
        logToFile(`Attempting to delete client: ${id}`);
        
        if (!fs.existsSync(CLIENTS_FILE)) {
          return res.json({ success: true });
        }

        const data = await fs.promises.readFile(CLIENTS_FILE, "utf-8");
        const clients = JSON.parse(data);
        const filtered = clients.filter((c: any) => c.id !== id);
        
        await fs.promises.writeFile(CLIENTS_FILE, JSON.stringify(filtered, null, 2));
        logToFile(`Successfully deleted client: ${id}`);
        res.json({ success: true });
      } catch (error: any) {
        logToFile(`CRITICAL Error deleting client: ${error.message}`);
        res.status(500).json({ error: "Failed to delete client", details: error.message });
      }
    });

    logToFile("[Server] Registering returns routes...");
    app.get("/api/returns", async (req, res) => {
      try {
        if (!fs.existsSync(RETURNS_FILE)) {
          return res.json([]);
        }
        const data = await fs.promises.readFile(RETURNS_FILE, "utf-8");
        try {
          res.json(JSON.parse(data));
        } catch (parseError) {
          logToFile(`Error parsing returns JSON: ${parseError}`);
          res.json([]);
        }
      } catch (error) {
        logToFile(`Error reading returns: ${error}`);
        res.status(500).json({ error: "Failed to read returns" });
      }
    });

    app.post("/api/returns", async (req, res) => {
      try {
        logToFile(`Attempting to save return(s)`);
        if (!req.body) {
          return res.status(400).json({ error: "Missing request body" });
        }

        let returnsList = [];
        try {
          if (fs.existsSync(RETURNS_FILE)) {
            const data = await fs.promises.readFile(RETURNS_FILE, "utf-8");
            returnsList = JSON.parse(data);
          }
        } catch (readError) {
          logToFile(`Warning: Could not read returns file, starting fresh: ${readError}`);
          returnsList = [];
        }

        if (Array.isArray(req.body)) {
          returnsList = req.body;
        } else {
          const newReturn = req.body;
          if (!newReturn.id) {
            return res.status(400).json({ error: "Missing return ID" });
          }
          const index = returnsList.findIndex((r: any) => r.id === newReturn.id);
          if (index !== -1) {
            logToFile(`Updating existing return: ${newReturn.id}`);
            returnsList[index] = newReturn;
          } else {
            logToFile(`Adding new return: ${newReturn.id}`);
            returnsList.push(newReturn);
          }
        }

        await fs.promises.writeFile(RETURNS_FILE, JSON.stringify(returnsList, null, 2));
        logToFile(`Successfully saved returns`);
        res.json({ success: true });
      } catch (error: any) {
        logToFile(`CRITICAL Error saving returns: ${error.message}`);
        res.status(500).json({ error: "Failed to save returns", details: error.message });
      }
    });

    app.delete("/api/returns/:id", async (req, res) => {
      try {
        const { id } = req.params;
        logToFile(`Attempting to delete return: ${id}`);
        
        if (!fs.existsSync(RETURNS_FILE)) {
          return res.json({ success: true });
        }

        const data = await fs.promises.readFile(RETURNS_FILE, "utf-8");
        const returnsList = JSON.parse(data);
        const filtered = returnsList.filter((r: any) => r.id !== id);
        
        await fs.promises.writeFile(RETURNS_FILE, JSON.stringify(filtered, null, 2));
        logToFile(`Successfully deleted return: ${id}`);
        res.json({ success: true });
      } catch (error: any) {
        logToFile(`CRITICAL Error deleting return: ${error.message}`);
        res.status(500).json({ error: "Failed to delete return", details: error.message });
      }
    });

    logToFile("[Server] Registering validations routes...");
    app.get("/api/validations", async (req, res) => {
      try {
        if (!fs.existsSync(VALIDATIONS_FILE)) {
          return res.json([]);
        }
        const data = await fs.promises.readFile(VALIDATIONS_FILE, "utf-8");
        try {
          res.json(JSON.parse(data));
        } catch (parseError) {
          logToFile(`Error parsing validations JSON: ${parseError}`);
          res.json([]);
        }
      } catch (error) {
        logToFile(`Error reading validations: ${error}`);
        res.status(500).json({ error: "Failed to read validations" });
      }
    });

    app.post("/api/validations", async (req, res) => {
      try {
        logToFile(`Attempting to save validation(s)`);
        if (!req.body) {
          return res.status(400).json({ error: "Missing request body" });
        }

        let validationsList = [];
        try {
          if (fs.existsSync(VALIDATIONS_FILE)) {
            const data = await fs.promises.readFile(VALIDATIONS_FILE, "utf-8");
            validationsList = JSON.parse(data);
          }
        } catch (readError) {
          logToFile(`Warning: Could not read validations file, starting fresh: ${readError}`);
          validationsList = [];
        }

        if (Array.isArray(req.body)) {
          validationsList = req.body;
        } else {
          const newValidation = req.body;
          if (!newValidation.id) {
            return res.status(400).json({ error: "Missing validation ID" });
          }
          const index = validationsList.findIndex((v: any) => v.id === newValidation.id);
          if (index !== -1) {
            logToFile(`Updating existing validation: ${newValidation.id}`);
            validationsList[index] = newValidation;
          } else {
            logToFile(`Adding new validation: ${newValidation.id}`);
            validationsList.push(newValidation);
          }
        }

        await fs.promises.writeFile(VALIDATIONS_FILE, JSON.stringify(validationsList, null, 2));
        logToFile(`Successfully saved validations`);
        res.json({ success: true });
      } catch (error: any) {
        logToFile(`CRITICAL Error saving validations: ${error.message}`);
        res.status(500).json({ error: "Failed to save validations", details: error.message });
      }
    });

    app.delete("/api/validations/:id", async (req, res) => {
      try {
        const { id } = req.params;
        logToFile(`Attempting to delete validation: ${id}`);
        
        if (!fs.existsSync(VALIDATIONS_FILE)) {
          return res.json({ success: true });
        }

        const data = await fs.promises.readFile(VALIDATIONS_FILE, "utf-8");
        const validationsList = JSON.parse(data);
        const filtered = validationsList.filter((v: any) => v.id !== id);
        
        await fs.promises.writeFile(VALIDATIONS_FILE, JSON.stringify(filtered, null, 2));
        logToFile(`Successfully deleted validation ${id}`);
        res.json({ success: true });
      } catch (error: any) {
        logToFile(`CRITICAL Error deleting validation: ${error.message}`);
        res.status(500).json({ error: "Failed to delete validation", details: error.message });
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

  // Service Account Auth Helper for Google Sheets
  const getSheetsClient = () => {
    let clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
      throw new Error("Service Account credentials (EMAIL/PRIVATE_KEY) are missing.");
    }

    clientEmail = clientEmail.trim().replace(/^["']|["']$/g, '');

    // Clean the private key:
    // 1. Remove any surrounding quotes that might have been pasted accidentally
    privateKey = privateKey.trim().replace(/^["']|["']$/g, '');
    // 2. Convert literal \n strings into actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n');

    if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
      throw new Error("Invalid Private Key format. It must start with '-----BEGIN PRIVATE KEY-----'. Check your environment variables.");
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    return google.sheets({ version: "v4", auth });
  };

  app.post("/api/submit", async (req, res) => {
    logToFile("[API] Received /api/submit request for detailed Google Sheets sync");
    const { data } = req.body;
    
    if (!data) {
      logToFile("[API] Submit failed: Missing 'data' object in request body");
      return res.status(400).json({ error: "Missing 'data' object" });
    }

    let spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || req.body.spreadsheetId;
    if (!spreadsheetId) {
      logToFile("[API] Submit failed: Spreadsheet ID missing");
      return res.status(400).json({ error: "Spreadsheet ID missing. Please set GOOGLE_SPREADSHEET_ID environment variable." });
    }
    spreadsheetId = spreadsheetId.trim().replace(/^["']|["']$/g, '');

    try {
      const sheets = getSheetsClient();

      // Mapping logic
      const allRows: { sheet: string, rows: any[][] }[] = [];

      if (data.category === 'Mini Dairy' || data.category === 'Cottage Industry' || data.category === 'Milk Bar' || data.category === 'Dispenser') {
        const sheet = (data.category === 'Mini Dairy' || data.category === 'Cottage Industry') 
          ? "MD & CI - Distribution" 
          : "Dispensers & Milk Bars";
          
        const isMiniOrCottage = data.category === 'Mini Dairy' || data.category === 'Cottage Industry';
        
        let distNameFormatted = "";
        let distContactsFormatted = "";
        let distVolPerDayFormatted = "";
        let distPermitNoFormatted = "";
        let distAreaOfSaleFormatted = "";
        let distOutletsFormatted = "";
        let distNatureOfProduceFormatted = "";
        let distPriceFormatted = "";

        if (isMiniOrCottage) {
          const distributors = Array.isArray(data.distributors) && data.distributors.length > 0
            ? data.distributors
            : [{
                name: data.distName,
                contacts: data.distContacts,
                volPerDay: data.distVolPerDay,
                permitNo: data.distPermitNo,
                areaOfSale: data.distAreaOfSale,
                outlets: data.distOutlets || [],
                natureOfProduce: data.distNatureOfProduce || [],
                prices: { [data.distNatureOfProduce?.[0] || 'Produce']: data.distPrice }
              }];

          distNameFormatted = distributors.map((d: any) => d.name || "").join(' | ');
          distContactsFormatted = distributors.map((d: any) => d.contacts || "").join(' | ');
          distVolPerDayFormatted = distributors.map((d: any) => d.volPerDay || "").join(' | ');
          distPermitNoFormatted = distributors.map((d: any) => d.permitNo || "").join(' | ');
          distAreaOfSaleFormatted = distributors.map((d: any) => d.areaOfSale || "").join(' | ');
          
          distOutletsFormatted = distributors.map((d: any, dIdx: number) => {
            const outletsStr = Array.isArray(d.outlets)
              ? d.outlets.map((o: any) => `${o.location} (Vol: ${o.volPerDay}, Permit: ${o.permitStatus}, Levy: ${o.levyInfo})`).join(', ')
              : "";
            return `Distributor #${dIdx + 1}: ${outletsStr}`;
          }).join(' | ');

          distNatureOfProduceFormatted = distributors.map((d: any, dIdx: number) => {
            const prodStr = Array.isArray(d.natureOfProduce) ? d.natureOfProduce.join(', ') : "";
            return `Distributor #${dIdx + 1}: ${prodStr}`;
          }).join(' | ');

          distPriceFormatted = distributors.map((d: any, dIdx: number) => {
            const priceStr = d.prices && Object.keys(d.prices).length > 0
              ? Object.entries(d.prices).map(([prod, price]) => `${prod}: ${price}`).join(', ')
              : "";
            return `Distributor #${dIdx + 1}: ${priceStr}`;
          }).join(' | ');
        }

        const rows = data.sales.map((sale: any) => [
          data.dboName, data.location, data.contacts, data.permitNo, data.expiryDate, 
          sale.avgVolPerDay || "", sale.buyingPrice || "", sale.sellingPrice || "", data.traceability,
          `${sale.month} ${sale.year}`, sale.qtyDeclared, sale.verifiedQty, sale.underDeclared,
          data.date, data.startTime, data.endTime,
          Array.isArray(data.natureOfProduce) ? data.natureOfProduce.join(', ') : data.natureOfProduce,
          // Appended Option A Columns (for MD & CI - Distribution sheet)
          distNameFormatted,
          distContactsFormatted,
          distVolPerDayFormatted,
          distPermitNoFormatted,
          distAreaOfSaleFormatted,
          distOutletsFormatted,
          distNatureOfProduceFormatted,
          distPriceFormatted
        ]);
        allRows.push({ sheet, rows });
      } else if (data.category === 'CP<5,000 L/D' || data.category === 'CP>5,000 L/D' || data.category === 'Processor') {
        const sheet = "Cooling Plants";
        // Capture Intakes
        const intakeRows = data.intakes.map((intake: any) => [
          data.dboName, data.location, data.contacts, data.permitNo, data.expiryDate, 
          intake.avgVolPerDay || "", intake.farmerPrice || "", intake.processorPrice || "", data.traceability,
          `${intake.month} ${intake.year}`, intake.quantity, "TOTAL INTAKE", "", "",
          data.date, data.startTime, data.endTime
        ]);
        allRows.push({ sheet, rows: intakeRows });
        
        // Capture Sales for Cooling Plants
        const salesRows = data.sales
          .filter((s: any) => s.qtyDeclared || s.verifiedQty)
          .map((sale: any) => [
            data.dboName, data.location, data.contacts, data.permitNo, data.expiryDate, 
            sale.avgVolPerDay || "", sale.buyingPrice || "", sale.sellingPrice || "", data.traceability,
            `${sale.month} ${sale.year}`, sale.qtyDeclared, "LOCAL SALES", sale.verifiedQty, sale.underDeclared,
            data.date, data.startTime, data.endTime
          ]);
        if (salesRows.length > 0) {
          allRows.push({ sheet, rows: salesRows });
        }
      }

      for (const item of allRows) {
        if (item.rows.length > 0) {
          logToFile(`[API] Appending ${item.rows.length} rows to sheet "${item.sheet}"`);
          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${item.sheet}!A:Z`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: item.rows },
          });
        }
      }

      logToFile("[API] Detailed Google Sheets sync completed successfully");
      res.json({ success: true });
    } catch (error: any) {
      logToFile(`[API] Google Sheets submit error: ${error.message}\nStack: ${error.stack}`);
      res.status(500).json({ error: error.message });
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
    // Catch-all for /api routes to prevent them from falling through to Vite's HTML fallback
    app.all("/api/*all", (req, res) => {
      logToFile(`[API] 404 Not Found: ${req.method} ${req.url}`);
      res.status(404).json({ error: "API route not found" });
    });

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
    app.get("*all", (req, res) => {
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

  // Ensure data directory exists and initial files exist (if writable)
  try {
    if (!fs.existsSync(DATA_DIR)) {
      console.log(`[Server] Creating data directory: ${DATA_DIR}`);
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    [AGREEMENTS_FILE, CLOSURES_FILE, DEBTORS_FILE].forEach(file => {
      if (!fs.existsSync(file)) {
        console.log(`[Server] Initializing file: ${file}`);
        fs.writeFileSync(file, JSON.stringify([], null, 2));
      }
    });

    if (!fs.existsSync(CLIENTS_FILE)) {
      console.log(`[Server] Initializing clients file with default licensed clients...`);
      const initialClients = [
        {
          id: "LC-001",
          clientName: "Sunrise Dairies",
          premiseName: "Sunrise Main Plant",
          startYear: 2022,
          startMonth: "January",
          endYear: null,
          endMonth: null,
          tel: "0712345678",
          contactPerson: "John Doe",
          location: "Kericho Town, Court Road",
          premiseCategory: "Processor",
          county: "Kericho",
          coolingCapacity: 15000,
          permitStatus: "active",
          operationalStatus: "operating",
          levyInfo: "QFR"
        },
        {
          id: "LC-002",
          clientName: "Belgut Milk Bar",
          premiseName: "Belgut Outlet",
          startYear: 2022,
          startMonth: "June",
          endYear: 2024,
          endMonth: "December",
          tel: "0722334455",
          contactPerson: "Alice Koech",
          location: "Kapsoit, Belgut",
          premiseCategory: "Milk Bar",
          county: "Kericho",
          permitStatus: "inactive",
          operationalStatus: "closed",
          levyInfo: "DNQ-R"
        },
        {
          id: "LC-003",
          clientName: "Tea County Dispensers",
          premiseName: "Kenyagano Station",
          startYear: 2023,
          startMonth: "March",
          endYear: null,
          endMonth: null,
          tel: "0733445566",
          contactPerson: "David Langat",
          location: "Litein, Bureti",
          premiseCategory: "Dispenser",
          county: "Kericho",
          permitStatus: "active",
          operationalStatus: "operating",
          levyInfo: "QFR"
        },
        {
          id: "LC-004",
          clientName: "Kipkelion Cooling Association",
          premiseName: "Kipkelion Plant",
          startYear: 2022,
          startMonth: "August",
          endYear: null,
          endMonth: null,
          tel: "0744556677",
          contactPerson: "Grace Chepngetich",
          location: "Kipkelion Town",
          premiseCategory: "Cooling Plant",
          county: "Kericho",
          coolingCapacity: 8000,
          permitStatus: "active",
          operationalStatus: "operating",
          levyInfo: "QFR"
        },
        {
          id: "LC-005",
          clientName: "Sotik Border Cottage",
          premiseName: "Borderline Creamery",
          startYear: 2022,
          startMonth: "October",
          endYear: null,
          endMonth: null,
          tel: "0755667788",
          contactPerson: "Robert Sang",
          location: "Sotik Road, Sigowet",
          premiseCategory: "Cottage Industry",
          county: "Kericho",
          permitStatus: "active",
          operationalStatus: "operating",
          levyInfo: "DNQ-R"
        },
        {
          id: "LC-006",
          clientName: "Ainamoi Mini Dairy",
          premiseName: "Ainamoi Depot",
          startYear: 2022,
          startMonth: "February",
          endYear: null,
          endMonth: null,
          tel: "0766778899",
          contactPerson: "Sarah Cherono",
          location: "Ainamoi Junction",
          premiseCategory: "Mini Dairy",
          county: "Kericho",
          permitStatus: "active",
          operationalStatus: "operating",
          levyInfo: "DNQ-R"
        }
      ];
      fs.writeFileSync(CLIENTS_FILE, JSON.stringify(initialClients, null, 2));
    }

    if (!fs.existsSync(STAFF_FILE)) {
      console.log(`[Server] Initializing staff file: ${STAFF_FILE}`);
      fs.writeFileSync(STAFF_FILE, JSON.stringify({ officialSignature: '' }, null, 2));
    }
  } catch (e) {
    console.warn("Could not write initial json seed files (read-only filesystem or Supabase primary mode):", e);
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
