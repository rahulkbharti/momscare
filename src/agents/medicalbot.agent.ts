import { ai } from "./gemini.client";
import { medicalTools, handleToolCall } from "../tools/medical.tools";

export function createMedicalBot(extractedData: any) {
  const chat = ai.chats.create({
    model: "gemini-2.0-flash",
    config: {
      tools: medicalTools,
      systemInstruction: `
        You are a helpful medical assistant.
        Use tools to fetch patient data and answer questions.
        Always respond in the same language the user is using.
      `,
    },
  });

  async function sendMessage(userMessage: string) {
    const response = await chat.sendMessage({ message: userMessage });

    if (response.functionCalls?.length) {
      const toolResults = response.functionCalls.map((fc) => ({
        functionResponse: {
          name: fc.name,
          response: handleToolCall(fc.name ?? "", extractedData),
        },
      }));

      const final = await chat.sendMessage({ message: toolResults });
      return final.text;
    }

    return response.text;
  }

  return { sendMessage };
}
