// extract.schema.ts

export const extractSchema = {
  type: "object",
  properties: {
    general: {
      type: "object",
      properties: {
        patient_name: { type: "string", nullable: true },
        relation: { type: "string", nullable: true }, // self, wife, father, etc.
        patient_age: { type: "number", nullable: true },
        doctor_name: { type: "string", nullable: true },
      },
      required: ["patient_name", "relation", "patient_age", "doctor_name"],
    },

    prescriptions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          medicine_name: { type: "string", nullable: true },
          times_per_day: { type: "number", nullable: true },
          days: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ],
            },
          },
        },
        required: ["medicine_name", "times_per_day", "days"],
      },
    },

    insurance: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company_name: { type: "string", nullable: true },
          patient_name: { type: "string", nullable: true },
          insurance_id: { type: "string", nullable: true },
          monthly_amount: { type: "number", nullable: true },
          payment_date: { type: "number", nullable: true }, // 1-31
        },
        required: [
          "company_name",
          "patient_name",
          "insurance_id",
          "monthly_amount",
          "payment_date",
        ],
      },
    },

    symptoms: {
      type: "array",
      items: {
        type: "object",
        properties: {
          symptom: { type: "string", nullable: true },
          recorded_date: { type: "string", nullable: true }, // "YYYY-MM-DD"
        },
        required: ["symptom", "recorded_date"],
      },
    },
  },
  required: ["general", "prescriptions", "insurance", "symptoms"],
};
