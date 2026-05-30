// coral.routes.ts
// Coral API routes:
//   GET  /api/coral/status          - check Coral CLI availability + registered sources
//   POST /api/coral/query           - run a raw coral sql query (demo/debug)
//   POST /api/coral/packet/:id      - generate AI doctor visit packet using Coral data

import { Router } from "express";
import { checkCoralAvailable, listCoralSources, runCoralQuery } from "../lib/coral.client";
import {
  getDoctorPacketJoinQuery,
  getCommonConditionsQuery,
  getCommonMedicinesQuery,
  getAllPatientsQuery,
} from "../lib/coral.queries";
import { ai } from "../agents/gemini.client";

export const coralRoutes = Router();

// ── GET /api/coral/status ────────────────────────────────────────────────────
coralRoutes.get("/status", async (_req, res) => {
  try {
    const { available, version } = await checkCoralAvailable();
    if (!available) {
      res.status(503).json({ available: false, error: "Coral CLI not found" });
      return;
    }
    const sourcesRaw = await listCoralSources();
    res.json({ available: true, version, sources: sourcesRaw });
  } catch (err) {
    res.status(500).json({
      available: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

// ── POST /api/coral/query ─────────────────────────────────────────────────────
// Body: { sql: string }
coralRoutes.post("/query", async (req, res) => {
  const { sql } = req.body ?? {};
  if (!sql || typeof sql !== "string") {
    res.status(400).json({ error: "sql field is required in request body" });
    return;
  }
  try {
    const result = await runCoralQuery(sql);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Query failed",
    });
  }
});

// ── GET /api/coral/analytics ──────────────────────────────────────────────────
// Cross-patient analytics: top conditions + top medicines
coralRoutes.get("/analytics", async (_req, res) => {
  try {
    const [conditions, medicines, patients] = await Promise.all([
      runCoralQuery(getCommonConditionsQuery()),
      runCoralQuery(getCommonMedicinesQuery()),
      runCoralQuery(getAllPatientsQuery()),
    ]);
    res.json({ conditions, medicines, patients });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Analytics query failed",
    });
  }
});

// ── POST /api/coral/packet/:id ────────────────────────────────────────────────
// Generate a doctor visit packet for a patient record using Coral + Gemini AI.
// Coral SQL on real AI-extracted data → Gemini generates PERSONALIZED packet per patient
coralRoutes.post("/packet/:id", async (req, res) => {
  const { id } = req.params;
  const { visitPurpose = "routine follow-up" } = req.body ?? {};

  try {
    // 1. Run Coral JOIN query to get all patient data in one shot
    const coralResult = await runCoralQuery(getDoctorPacketJoinQuery(id));

    if (!coralResult.rows.length) {
      res.status(404).json({ error: "No Coral data found for this record. Upload a prescription first." });
      return;
    }

    // 2. Feed Coral results into Gemini to generate a personalized doctor packet
    const dataContext = JSON.stringify(coralResult.rows, null, 2);
    const prompt = `You are a medical records assistant helping a caregiver prepare for a doctor visit.

Below is structured patient data extracted from prescription documents and queried via Coral SQL.

Patient Data (from Coral SQL JOIN across 4 sources):
${dataContext}

Visit Purpose: ${visitPurpose}

Generate a concise, professional doctor visit packet with these sections:
1. **Patient Summary** - Name, age, gender, treating doctor
2. **Current Medications** - List all medicines with dosage and timing
3. **Medical Conditions** - List all diagnosed conditions
4. **Upcoming Appointments** - Any scheduled visits
5. **Questions to Ask the Doctor** - Generate 5 PERSONALIZED questions based on THIS patient's specific conditions and medicines (not generic questions)
6. **Safety Note** - Remind that this is not medical advice

Important: Be specific to this patient's actual data. Do not use placeholders.

⚠️ SAFETY: Do NOT diagnose, prescribe, or recommend medicine changes.`;

    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction:
          "You are a medical records assistant. Help caregivers prepare for doctor visits. Never diagnose or prescribe. Be factual and concise.",
        safetySettings: [
          { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ] as any,
      },
    });

    const responseText = result.text ?? "Could not generate packet.";

    res.json({
      recordId: id,
      visitPurpose,
      generatedAt: new Date().toISOString(),
      coralQuery: coralResult.sql,
      coralRows: coralResult.rows.length,
      coralDurationMs: coralResult.durationMs,
      packet: responseText,
      safetyDisclaimer:
        "This is not medical advice. Mom-Care does not diagnose, prescribe, or recommend medicine changes. Always consult a licensed doctor.",
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Packet generation failed",
    });
  }
});
