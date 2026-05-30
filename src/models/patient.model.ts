// src/models/patient.model.ts
import { Schema, model, Document } from "mongoose";

// ── Sub-schemas ──────────────────────────────────────────────────────────────

const PatientInfoSchema = new Schema(
  {
    name: { type: String, default: null },
    age: { type: Number, default: null },
    gender: { type: String, default: null },
    phone: { type: String, default: null },
  },
  { _id: false },
);

const DoctorInfoSchema = new Schema(
  {
    name: { type: String, default: null },
  },
  { _id: false },
);

const PrescriptionSchema = new Schema(
  {
    medicine_name: { type: String, default: null },
    dosage: { type: String, default: null },
    frequency: { type: Number, default: null },
    timings: { type: [String], default: [] },
    instructions: { type: String, default: null },
  }
);

const AppointmentSchema = new Schema(
  {
    appointment_date: { type: String, default: null },
    appointment_time: { type: String, default: null },
    status: { type: String, default: null },
    reason: { type: String, default: null },
  }
);

const InsuranceSchema = new Schema(
  {
    provider_name: { type: String, default: null },
    policy_number: { type: String, default: null },
    policy_holder_name: { type: String, default: null },
    coverage_amount: { type: Number, default: null },
    expiry_date: { type: String, default: null },
    status: { type: String, default: null },
  }
);

// ── Main schema ───────────────────────────────────────────────────────────────

const MedicalRecordSchema = new Schema(
  {
    patient: { type: PatientInfoSchema, default: {} },
    doctor: { type: DoctorInfoSchema, default: {} },
    conditions: { type: [String], default: [] },
    prescriptions: { type: [PrescriptionSchema], default: [] },
    appointments: { type: [AppointmentSchema], default: [] },
    insurance: { type: [InsuranceSchema], default: [] },
  },
  { timestamps: true },
);

export interface IMedicalRecord extends Document {
  patient: {
    name: string | null;
    age: number | null;
    gender: string | null;
    phone: string | null;
  };
  doctor: { name: string | null };
  conditions: string[];
  prescriptions: Array<{
    medicine_name: string | null;
    dosage: string | null;
    frequency: number | null;
    timings: string[];
    instructions: string | null;
  }>;
  appointments: Array<{
    appointment_date: string | null;
    appointment_time: string | null;
    status: string | null;
    reason: string | null;
  }>;
  insurance: Array<{
    provider_name: string | null;
    policy_number: string | null;
    policy_holder_name: string | null;
    coverage_amount: number | null;
    expiry_date: string | null;
    status: string | null;
  }>;
}

export const MedicalRecord = model<IMedicalRecord>(
  "MedicalRecord",
  MedicalRecordSchema,
);
