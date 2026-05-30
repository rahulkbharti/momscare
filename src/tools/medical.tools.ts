import { MedicalRecord } from "../models/patient.model";
import { Type } from "@google/genai";

export const medicalTools = [
  {
    functionDeclarations: [
      // ── Single record tools ───────────────────────────────────────────────
      {
        name: "get_prescriptions",
        description: "Get all medicines and their dosage schedule for the current patient",
      },
      {
        name: "get_patient",
        description: "Get current patient's personal details (name, age, gender, phone)",
      },
      {
        name: "get_doctor",
        description: "Get current patient's treating doctor details",
      },
      {
        name: "get_conditions",
        description: "Get all diagnosed or mentioned medical conditions for the current patient",
      },
      {
        name: "get_appointments",
        description: "Get all appointment details for the current patient",
      },
      {
        name: "get_insurance",
        description: "Get all insurance details for the current patient",
      },
      {
        name: "get_general",
        description: "Get both patient and doctor info in one call",
      },

      // ── Cross-patient tools ───────────────────────────────────────────────
      {
        name: "get_all_records",
        description:
          "Get a summary list of ALL uploaded patient records in the system. Use this when the user asks about 'all patients', 'how many patients', 'list all records', or wants to compare across patients.",
      },
      {
        name: "search_patient",
        description:
          "Search for a patient record by name. Use this when user asks about a specific patient by name.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "Patient name to search for (partial match supported)",
            },
          },
          required: ["name"],
        },
      },
    ],
  },
];

export async function handleToolCall(
  toolName: string,
  recordId: string,
  args?: Record<string, string>
) {
  // ── Single record tools ─────────────────────────────────────────────────────
  if (
    ["get_prescriptions", "get_patient", "get_doctor", "get_conditions",
     "get_appointments", "get_insurance", "get_general"].includes(toolName)
  ) {
    const record = await MedicalRecord.findById(recordId);
    if (!record) return { error: "Patient record not found" };

    switch (toolName) {
      case "get_prescriptions": return record.prescriptions ?? [];
      case "get_patient":       return record.patient ?? {};
      case "get_doctor":        return record.doctor ?? {};
      case "get_conditions":    return record.conditions ?? [];
      case "get_appointments":  return record.appointments ?? [];
      case "get_insurance":     return record.insurance ?? [];
      case "get_general":       return { patient: record.patient ?? {}, doctor: record.doctor ?? {} };
    }
  }

  // ── Cross-patient tools ─────────────────────────────────────────────────────
  if (toolName === "get_all_records") {
    const records = await MedicalRecord.find()
      .sort({ createdAt: -1 })
      .select("patient doctor conditions prescriptions appointments createdAt");

    return records.map((r) => ({
      id: r._id,
      patient_name:    r.patient?.name ?? "Unknown",
      patient_age:     r.patient?.age ?? null,
      doctor_name:     r.doctor?.name ?? "Unknown",
      conditions:      r.conditions ?? [],
      medicine_count:  r.prescriptions?.length ?? 0,
      has_appointment: (r.appointments?.length ?? 0) > 0,
      uploaded_at:     (r as any).createdAt,
    }));
  }

  if (toolName === "search_patient") {
    const name = args?.name ?? "";
    const records = await MedicalRecord.find({
      "patient.name": { $regex: name, $options: "i" },
    }).select("patient doctor conditions prescriptions appointments createdAt");

    if (!records.length) return { message: `No patient found with name matching "${name}"` };

    return records.map((r) => ({
      id: r._id,
      patient_name:    r.patient?.name ?? "Unknown",
      patient_age:     r.patient?.age ?? null,
      doctor_name:     r.doctor?.name ?? "Unknown",
      conditions:      r.conditions ?? [],
      prescriptions:   r.prescriptions ?? [],
      appointments:    r.appointments ?? [],
    }));
  }

  return { error: `Unknown tool: ${toolName}` };
}
