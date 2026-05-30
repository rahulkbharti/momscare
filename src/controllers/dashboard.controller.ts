// dashboard.controller.ts
// Business logic for dashboard API endpoints

import { Request, Response } from "express";
import { MedicalRecord } from "../models/patient.model";
import {
  checkCoralAvailable,
  listCoralSources,
  runCoralQuery,
} from "../lib/coral.client";
import {
  getCommonConditionsQuery,
  getCommonMedicinesQuery,
  getAllPatientsQuery,
} from "../lib/coral.queries";

// ── GET /api/dashboard/stats ─────────────────────────────────────────────────
// Total records, patients, prescriptions count from MongoDB
export async function getStats(req: Request, res: Response) {
  try {
    const totalRecords = await MedicalRecord.countDocuments();

    // Records with at least one prescription
    const withPrescriptions = await MedicalRecord.countDocuments({
      "prescriptions.0": { $exists: true },
    });

    // Records with at least one appointment
    const withAppointments = await MedicalRecord.countDocuments({
      "appointments.0": { $exists: true },
    });

    // Records with insurance info
    const withInsurance = await MedicalRecord.countDocuments({
      "insurance.0": { $exists: true },
    });

    // Total prescriptions across all records
    const prescriptionAgg = await MedicalRecord.aggregate([
      { $project: { count: { $size: "$prescriptions" } } },
      { $group: { _id: null, total: { $sum: "$count" } } },
    ]);
    const totalPrescriptions = prescriptionAgg[0]?.total ?? 0;

    // Total conditions across all records
    const conditionAgg = await MedicalRecord.aggregate([
      { $project: { count: { $size: "$conditions" } } },
      { $group: { _id: null, total: { $sum: "$count" } } },
    ]);
    const totalConditions = conditionAgg[0]?.total ?? 0;

    res.json({
      totalRecords,
      withPrescriptions,
      withAppointments,
      withInsurance,
      totalPrescriptions,
      totalConditions,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to fetch stats",
    });
  }
}

// ── GET /api/dashboard/recent ─────────────────────────────────────────────────
// Last N uploaded medical records
export async function getRecentRecords(req: Request, res: Response) {
  try {
    const limit = Math.min(Number(req.query.limit) || 5, 20);

    const records = await MedicalRecord.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("patient doctor conditions prescriptions createdAt");

    const formatted = records.map((r) => ({
      id: r._id,
      patientName: r.patient?.name ?? "Unknown",
      patientAge: r.patient?.age ?? null,
      doctorName: r.doctor?.name ?? "Unknown",
      conditionsCount: r.conditions?.length ?? 0,
      prescriptionsCount: r.prescriptions?.length ?? 0,
      conditions: r.conditions?.slice(0, 3) ?? [],
      uploadedAt: (r as any).createdAt,
    }));

    res.json({ count: formatted.length, records: formatted });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to fetch records",
    });
  }
}

// ── GET /api/dashboard/analytics ─────────────────────────────────────────────
// Cross-patient analytics via Coral SQL — top conditions & medicines
export async function getAnalytics(req: Request, res: Response) {
  try {
    const [conditions, medicines, patients] = await Promise.allSettled([
      runCoralQuery(getCommonConditionsQuery()),
      runCoralQuery(getCommonMedicinesQuery()),
      runCoralQuery(getAllPatientsQuery()),
    ]);

    res.json({
      topConditions:
        conditions.status === "fulfilled" ? conditions.value.rows : [],
      topMedicines:
        medicines.status === "fulfilled" ? medicines.value.rows : [],
      allPatients:
        patients.status === "fulfilled" ? patients.value.rows : [],
      coralDurationMs: {
        conditions:
          conditions.status === "fulfilled"
            ? conditions.value.durationMs
            : null,
        medicines:
          medicines.status === "fulfilled" ? medicines.value.durationMs : null,
        patients:
          patients.status === "fulfilled" ? patients.value.durationMs : null,
      },
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Analytics failed",
    });
  }
}

// ── GET /api/dashboard/system ─────────────────────────────────────────────────
// System health — MongoDB, Coral CLI, Gemini config
export async function getSystemStatus(req: Request, res: Response) {
  try {
    // MongoDB ping
    let mongoStatus = "connected";
    try {
      await MedicalRecord.db.db?.command({ ping: 1 });
    } catch {
      mongoStatus = "error";
    }

    // Coral status
    const coral = await checkCoralAvailable();
    let coralSources: string[] = [];
    if (coral.available) {
      try {
        const raw = await listCoralSources();
        // Parse source names from coral source list output
        coralSources = raw
          .split("\n")
          .filter((line) => line.startsWith("momcare_"))
          .map((line) => line.split(/\s+/)[0]);
      } catch {}
    }

    // Gemini config check (just verify key is set)
    const geminiConfigured = !!process.env.GEMINI_API_KEY;

    res.json({
      mongodb: {
        status: mongoStatus,
        uri: process.env.MONGODB_URI?.replace(/:([^@]+)@/, ":***@") ?? "not set",
      },
      coral: {
        available: coral.available,
        version: coral.version ?? null,
        registeredSources: coralSources,
        totalSources: coralSources.length,
      },
      gemini: {
        configured: geminiConfigured,
        model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
      },
      server: {
        port: process.env.PORT ?? 8000,
        nodeVersion: process.version,
        uptime: Math.floor(process.uptime()) + "s",
      },
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "System status check failed",
    });
  }
}
