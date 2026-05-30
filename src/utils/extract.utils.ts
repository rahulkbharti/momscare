// extract.utils.ts
import { ai } from "../agents/gemini.client";
import { extractSchema } from "../schemas/extract.schema";
import { prepareFile } from "./document.utils";

const SYSTEM_PROMPT = `You are a medical document reader.
Extract information from the given document, whether handwritten or printed.
Rules:
- If a field is not found, set it as null.
- If a list has no entries, return an empty array.
- For days, convert short forms: Mon -> Monday, Tue -> Tuesday, etc.
- OD = 1 time, BD = 2 times, TDS = 3 times, QID = 4 times per day.
- For payment_date, extract only the number, for example "15th" -> 15.
- recorded_date format should be YYYY-MM-DD.
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
    },
  });

  if (!result.text) {
    throw new Error("Model returned an empty extraction response.");
  }

  return JSON.parse(result.text);
}
