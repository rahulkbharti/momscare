import { ai } from "./gemini.client";
import { medicalTools, handleToolCall } from "../tools/medical.tools";

export function createMedicalBot(recordId: string) {
  const chat = ai.chats.create({
    model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
    config: {
      tools: medicalTools,
      systemInstruction: `You are a helpful medical assistant for caregivers.
You have access to a patient's medical record. Always use the tools to fetch real data before answering.
Rules:
- Always fetch relevant data using the tools before answering.
- Be concise and friendly.
- Never diagnose or prescribe — only report what is in the record.
- Always respond in the same language the user uses.`,
      safetySettings: [
        { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ] as any,
    },
  });

  async function sendMessage(userMessage: string): Promise<string> {
    let response = await chat.sendMessage({ message: userMessage });

    // Loop: Gemini may need multiple tool-call rounds before producing text
    const MAX_ROUNDS = 5;
    let rounds = 0;

    while (response.functionCalls?.length && rounds < MAX_ROUNDS) {
      rounds++;

      const toolResults = await Promise.all(
        response.functionCalls.map(async (fc) => {
          const raw = await handleToolCall(fc.name ?? "", recordId);
          const result = Array.isArray(raw)
            ? { result: raw }
            : raw ?? { result: null };
          return {
            functionResponse: {
              name: fc.name,
              response: result,
            },
          };
        })
      );

      // Send tool results back to Gemini
      response = await chat.sendMessage({ message: toolResults });
    }

    return response.text ?? "Sorry, I couldn't generate a response. Please try again.";
  }

  return { sendMessage };
}
