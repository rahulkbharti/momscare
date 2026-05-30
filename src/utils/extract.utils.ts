// extract.utils.ts
import { ai } from "../agents/gemini.client";
import { extractSchema } from "../schemas/extract.schema";
import { prepareFile } from "./document.utils";

const SYSTEM_PROMPT = `You are a medical document reader.
Extract information from the given document, whether handwritten or printed.
Rules:
- If a field is not found, set it as null.
- If a list has no entries, return an empty array.
- Do not invent names or any other fields. Use null if they are not present.
- phone is optional. Extract it when present, otherwise leave it null or omit it.
- Extract medical conditions as simple strings in the conditions array.
- For prescriptions, extract medicine_name, dosage, frequency, timings, and instructions.
- frequency is the number of doses per day.
- OD = frequency 1, BD = frequency 2, TDS = frequency 3, QID = frequency 4.
- timings must use 24-hour HH:mm format.
- If exact timings are not written, infer common timings: morning/before breakfast -> 08:00, afternoon -> 13:00, evening -> 18:00, night/bedtime -> 21:00.
- For payment_date, extract only the number, for example "15th" -> 15.
- Appointment date format should be YYYY-MM-DD and appointment time format should be HH:mm.
- Return only valid JSON matching the response schema.`;

export async function prepareDocuments(files: File[]) {
  return Promise.all(files.map(prepareFile));
}

export async function extractFromDocuments(
  preparedFiles: Awaited<ReturnType<typeof prepareFile>>[],
) {
  const fileParts = preparedFiles.map((prepared) =>
    prepared.type === "inline"
      ? { inlineData: { mimeType: prepared.mimeType, data: prepared.data } }
      : { fileData: { mimeType: prepared.mimeType, fileUri: prepared.uri } },
  );

  const result = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: "Extract medical info from all these documents." },
          ...fileParts,
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: extractSchema as any,
      safetySettings: [
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
      ] as any,
    },
  });

  if (!result.text) {
    throw new Error("Model returned an empty extraction response.");
  }

  return JSON.parse(result.text);
}
