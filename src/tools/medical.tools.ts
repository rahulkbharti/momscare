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

export function handleToolCall(toolName: string, extractedData: any) {
  switch (toolName) {
    case "get_prescriptions":
      return extractedData.prescriptions ?? [];
    case "get_patient":
      return extractedData.patient ?? {};
    case "get_doctor":
      return extractedData.doctor ?? {};
    case "get_conditions":
      return extractedData.conditions ?? [];
    case "get_appointments":
      return extractedData.appointments ?? [];
    case "get_insurance":
      return extractedData.insurance ?? [];
    case "get_general":
      return {
        patient: extractedData.patient ?? {},
        doctor: extractedData.doctor ?? {},
      };
    default:
      return null;
  }
}
