import "dotenv/config";
import http from "http";
import path from "node:path";
import express from "express";
import { documentRoutes } from "./routes/document.routes";
import { coralRoutes } from "./routes/coral.routes";
import { dashboardRoutes } from "./routes/dashboard.routes";
import { initSocket } from "./socket";
import { connectDB } from "./db/mongoose";
import { registerCoralSource, checkCoralAvailable } from "./lib/coral.client";

const app = express();
const server = http.createServer(app);

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/documents", documentRoutes);
app.use("/api/coral", coralRoutes);
app.use("/api/dashboard", dashboardRoutes);

initSocket(server);

const port = Number(process.env.PORT) || 8000;

// ── Auto-register Coral sources on startup ───────────────────────────────────
async function registerCoralSources() {
  const { available, version } = await checkCoralAvailable();
  if (!available) {
    console.warn("[Coral] CLI not found — skipping source registration. Install coral CLI to enable Coral features.");
    return;
  }
  console.log(`[Coral] CLI found: ${version}`);

  const manifestsDir = path.join(process.cwd(), "coral", "sources");
  const sources = [
    "momcare_patients",
    "momcare_prescriptions",
    "momcare_conditions",
    "momcare_appointments",
    "momcare_insurance",
  ];

  for (const source of sources) {
    const manifestPath = path.join(manifestsDir, source, "manifest.yaml");
    try {
      await registerCoralSource(manifestPath);
      console.log(`[Coral] ✓ Registered source: ${source}`);
    } catch (err) {
      // Source may already be registered — not fatal
      console.warn(`[Coral] ⚠ Could not register ${source}:`, (err as Error).message?.slice(0, 80));
    }
  }
}

async function startServer() {
  try {
    await connectDB();
    await registerCoralSources();
    server.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log(`Coral status: GET http://localhost:${port}/api/coral/status`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
