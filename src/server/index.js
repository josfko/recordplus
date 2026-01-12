import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import casesRouter from "./routes/cases.js";
import dashboardRouter from "./routes/dashboard.js";
import configRouter from "./routes/config.js";
import exportImportRouter from "./routes/exportImport.js";
import adminRouter from "./routes/admin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" })); // Increase limit for large imports

// Serve static frontend files
const clientPath = join(__dirname, "..", "client");
app.use(express.static(clientPath));

// API Routes
app.use("/api/cases", casesRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/config", configRouter);
app.use("/api", exportImportRouter);
app.use("/api/admin", adminRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({
    error: {
      code: err.code || "SERVER_ERROR",
      message: err.message || "Error interno del servidor",
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

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});

export default app;
