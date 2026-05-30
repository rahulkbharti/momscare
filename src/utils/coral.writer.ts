// coral.writer.ts
// After Gemini extracts data from a prescription → saves to MongoDB (existing flow)
// This module ALSO writes that data to JSONL files so Coral can query them.

import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.CORAL_DATA_PATH || path.join(process.cwd(), "data");

/** Ensure data directory exists */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/** Append a single JSONL line to a file (atomic-ish) */
function appendJsonlLine(filename: string, obj: Record<string, unknown>) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  fs.appendFileSync(filePath, JSON.stringify(obj) + "\n", "utf8");
}

export interface ExtractedMedicalData {
  patient?: {
    name?: string | null;
    age?: number | null;
    gender?: string | null;
    phone?: string | null;
  };
  doctor?: { name?: string | null };
  conditions?: string[];
  prescriptions?: Array<{
    medicine_name?: string | null;
    dosage?: string | null;
    frequency?: number | null;
    timings?: string[];
    instructions?: string | null;
  }>;
  appointments?: Array<{
    appointment_date?: string | null;
    appointment_time?: string | null;
    status?: string | null;
    reason?: string | null;
  }>;
  insurance?: Array<{
    provider_name?: string | null;
    policy_number?: string | null;
    policy_holder_name?: string | null;
    coverage_amount?: number | null;
    expiry_date?: string | null;
    status?: string | null;
  }>;
}

/**
 * Write extracted medical data to all 5 JSONL files for Coral.
 * Called after MedicalRecord.create() succeeds.
 *
 * @param recordId - MongoDB _id of the saved MedicalRecord
 * @param data     - The extracted medical data from Gemini
 */
export function writeToCoralJsonl(recordId: string, data: ExtractedMedicalData): void {
  const extractedAt = new Date().toISOString();

  // 1. patients.jsonl
  appendJsonlLine("patients.jsonl", {
    record_id: recordId,
    name: data.patient?.name ?? null,
    age: data.patient?.age ?? null,
    gender: data.patient?.gender ?? null,
    phone: data.patient?.phone ?? null,
    doctor_name: data.doctor?.name ?? null,
    extracted_at: extractedAt,
  });

  // 2. prescriptions.jsonl (one row per medicine)
  for (const rx of data.prescriptions ?? []) {
    appendJsonlLine("prescriptions.jsonl", {
      record_id: recordId,
      medicine_name: rx.medicine_name ?? null,
      dosage: rx.dosage ?? null,
      frequency: rx.frequency ?? null,
      timings: (rx.timings ?? []).join(","),
      instructions: rx.instructions ?? null,
      extracted_at: extractedAt,
    });
  }

  // 3. conditions.jsonl (one row per condition)
  for (const condition of data.conditions ?? []) {
    appendJsonlLine("conditions.jsonl", {
      record_id: recordId,
      condition,
      extracted_at: extractedAt,
    });
  }

  // 4. appointments.jsonl (one row per appointment)
  for (const appt of data.appointments ?? []) {
    appendJsonlLine("appointments.jsonl", {
      record_id: recordId,
      appointment_date: appt.appointment_date ?? null,
      appointment_time: appt.appointment_time ?? null,
      status: appt.status ?? null,
      reason: appt.reason ?? null,
      extracted_at: extractedAt,
    });
  }

  // 5. insurance.jsonl (one row per policy)
  for (const ins of data.insurance ?? []) {
    appendJsonlLine("insurance.jsonl", {
      record_id: recordId,
      provider_name: ins.provider_name ?? null,
      policy_number: ins.policy_number ?? null,
      policy_holder_name: ins.policy_holder_name ?? null,
      coverage_amount: ins.coverage_amount ?? null,
      expiry_date: ins.expiry_date ?? null,
      status: ins.status ?? null,
      extracted_at: extractedAt,
    });
  }
}
