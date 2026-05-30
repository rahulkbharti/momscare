export const medicalTools = [
  {
    functionDeclarations: [
      {
        name: "get_prescriptions",
        description: "Get all medicines and their schedule",
      },
      {
        name: "get_insurance",
        description: "Get all insurance details",
      },
      {
        name: "get_symptoms",
        description: "Get all recorded symptoms",
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
    case "get_insurance":
      return extractedData.insurance ?? [];
    case "get_symptoms":
      return extractedData.symptoms ?? [];
    case "get_general":
      return extractedData.general ?? {};
    default:
      return null;
  }
}
