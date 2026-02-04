import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import casesRouter from "./routes/cases.js";
import dashboardRouter from "./routes/dashboard.js";
import configRouter from "./routes/config.js";
import exportImportRouter from "./routes/exportImport.js";
import adminRouter from "./routes/admin.js";
import backupRouter from "./routes/backup.js";
import aragRouter from "./routes/arag.js";
import particularesRouter from "./routes/particulares.js";
import turnoOficioRouter from "./routes/turnoOficio.js";
import { AppError } from "./errors.js";
import { ensureDefaults } from "./services/configurationService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration for Cloudflare Pages + Tunnel deployment
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (same-origin, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Allow localhost for development
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      return callback(null, true);
    }

    // Allow Cloudflare Pages domains
    if (origin.includes(".pages.dev")) {
      return callback(null, true);
    }

    // Allow Cloudflare Tunnel domains
    if (origin.includes("cfargotunnel.com")) {
      return callback(null, true);
    }

    // Allow recordplus.work custom domain
    if (origin.includes("recordplus.work")) {
      return callback(null, true);
    }

    // Allow custom domains (configured via env var)
    const allowedOrigins = process.env.CORS_ORIGINS?.split(",") || [];
    if (allowedOrigins.some((allowed) => origin.includes(allowed.trim()))) {
      return callback(null, true);
    }

    // Reject other origins
    console.warn(`[CORS] Blocked request from origin: ${origin}`);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true, // Allow cookies (Zero Trust CF_Authorization)
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: "50mb" })); // Increase limit for large imports

// Serve static frontend files
const clientPath = join(__dirname, "..", "client");
app.use(express.static(clientPath));

// API Routes
app.use("/api/cases", casesRouter);
app.use("/api/cases", aragRouter); // ARAG-specific case routes (minuta, suplido, history)
app.use("/api/cases", particularesRouter); // Particulares-specific routes (hoja-encargo)
app.use("/api/turno", turnoOficioRouter); // Turno de Oficio routes (finalize, upload)
app.use("/api/documents", aragRouter); // Document download routes
app.use("/api/email", aragRouter); // Email test routes
app.use("/api/mileage-rates", aragRouter); // Mileage rates
app.use("/api/dashboard", dashboardRouter);
app.use("/api/config", configRouter);
app.use("/api", exportImportRouter);
app.use("/api/admin", adminRouter);
app.use("/api/backup", backupRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Log full error details server-side (for debugging)
  console.error("[Error]", {
    code: err.code || "UNKNOWN",
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Use AppError's toJSON for structured responses
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle SQLite-specific errors
  if (err.code === "SQLITE_BUSY") {
    return res.status(503).json({
      error: {
        code: "DB_BUSY",
        message:
          "La base de datos está ocupada. Por favor, espere unos segundos e inténtelo de nuevo.",
      },
    });
  }

  if (err.code === "SQLITE_CONSTRAINT") {
    return res.status(409).json({
      error: {
        code: "DB_CONSTRAINT",
        message:
          "La operación viola una restricción de integridad de datos. Verifique que no existan duplicados.",
      },
    });
  }

  // Default error response (hide internal details from client)
  res.status(err.status || err.statusCode || 500).json({
    error: {
      code: err.code || "SERVER_ERROR",
      message:
        err.message ||
        "Ha ocurrido un error interno del servidor. Por favor, inténtelo de nuevo.",
    },
  });
});

// Serve index.html for SPA routes (before 404 handler)
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }
  res.sendFile(join(clientPath, "index.html"));
});

// 404 handler for API routes
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Recurso no encontrado",
    },
  });
});

// Initialize configuration defaults before starting server
try {
  ensureDefaults();
  console.log("[Config] Default configuration initialized");
} catch (error) {
  console.error("[Config] Failed to initialize defaults:", error.message);
}

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});

export default app;
