// extract.schema.ts

export const extractSchema = {
  type: "object",
  properties: {
    patient: {
      type: "object",
      properties: {
        name: { type: "string", nullable: true },
        age: { type: "number", nullable: true },
        gender: { type: "string", nullable: true },
        phone: { type: "string", nullable: true },
      },
      required: ["name", "age", "gender"],
    },

    doctor: {
      type: "object",
      properties: {
        name: { type: "string", nullable: true },
      },
      required: ["name"],
    },

    conditions: {
      type: "array",
      items: {
        type: "string",
      },
    },

    prescriptions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          medicine_name: { type: "string", nullable: true },
          dosage: { type: "string", nullable: true },
          frequency: { type: "number", nullable: true },
          timings: {
            type: "array",
            items: {
              type: "string",
            },
          },
          instructions: { type: "string", nullable: true },
        },
        required: [
          "medicine_name",
          "dosage",
          "frequency",
          "timings",
          "instructions",
        ],
      },
    },

    appointments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          appointment_date: { type: "string", nullable: true },
          appointment_time: { type: "string", nullable: true },
          status: { type: "string", nullable: true },
          reason: { type: "string", nullable: true },
        },
        required: [
          "appointment_date",
          "appointment_time",
          "status",
          "reason",
        ],
      },
    },

    insurance: {
      type: "array",
      items: {
        type: "object",
        properties: {
          provider_name: { type: "string", nullable: true },
          policy_number: { type: "string", nullable: true },
          policy_holder_name: { type: "string", nullable: true },
          coverage_amount: { type: "number", nullable: true },
          expiry_date: { type: "string", nullable: true },
          status: { type: "string", nullable: true },
        },
        required: [
          "provider_name",
          "policy_number",
          "policy_holder_name",
          "coverage_amount",
          "expiry_date",
          "status",
        ],
      },
    },
  },
  required: [
    "patient",
    "doctor",
    "conditions",
    "prescriptions",
    "appointments",
    "insurance",
  ],
};
