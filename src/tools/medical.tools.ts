import { MedicalRecord } from "../models/patient.model";

export const medicalTools = [
  {
    functionDeclarations: [
      {
        name: "get_prescriptions",
        description: "Get all medicines and their schedule",
      },
      {
        name: "get_patient",
        description: "Get patient details",
      },
      {
        name: "get_doctor",
        description: "Get doctor details",
      },
      {
        name: "get_conditions",
        description: "Get all diagnosed or mentioned medical conditions",
      },
      {
        name: "get_appointments",
        description: "Get all appointment details",
      },
      {
        name: "get_insurance",
        description: "Get all insurance details",
      },
      {
        name: "get_general",
        description: "Get patient and doctor info",
      },
    ],
  },
];

export async function handleToolCall(toolName: string, recordId: string) {
  const record = await MedicalRecord.findById(recordId);
  if (!record) return null;

  switch (toolName) {
    case "get_prescriptions":
      return record.prescriptions ?? [];
    case "get_patient":
      return record.patient ?? {};
    case "get_doctor":
      return record.doctor ?? {};
    case "get_conditions":
      return record.conditions ?? [];
    case "get_appointments":
      return record.appointments ?? [];
    case "get_insurance":
      return record.insurance ?? [];
    case "get_general":
      return {
        patient: record.patient ?? {},
        doctor: record.doctor ?? {},
      };
    default:
      return null;
  }
}
