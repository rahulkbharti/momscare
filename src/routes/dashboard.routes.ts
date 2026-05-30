// dashboard.routes.ts
// Dashboard API routes

import { Router } from "express";
import {
  getStats,
  getRecentRecords,
  getAnalytics,
  getSystemStatus,
} from "../controllers/dashboard.controller";

export const dashboardRoutes = Router();

/**
 * GET /api/dashboard/stats
 * Total counts: records, prescriptions, conditions, appointments, insurance
 */
dashboardRoutes.get("/stats", getStats);

/**
 * GET /api/dashboard/recent?limit=5
 * Recently uploaded medical records (default 5, max 20)
 */
dashboardRoutes.get("/recent", getRecentRecords);

/**
 * GET /api/dashboard/analytics
 * Cross-patient analytics via Coral SQL:
 *   - Top conditions across all patients
 *   - Most prescribed medicines
 *   - All patients list
 */
dashboardRoutes.get("/analytics", getAnalytics);

/**
 * GET /api/dashboard/system
 * System health check: MongoDB, Coral CLI, Gemini, server info
 */
dashboardRoutes.get("/system", getSystemStatus);
