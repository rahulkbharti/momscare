import { ai } from "../agents/gemini.client";

const INLINE_LIMIT_BYTES = 100 * 1024; // 100KB

export async function prepareFile(file: File) {
  if (file.size <= INLINE_LIMIT_BYTES) {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

    return { type: "inline" as const, mimeType: file.type, data: base64 };
  } else {
    const uploaded = await ai.files.upload({
      file,
      config: { displayName: file.name },
    });

    return {
      type: "uploaded" as const,
      mimeType: file.type,
      uri: uploaded.uri,
    };
  }
}

// const result = await prepareFile(file);

// // Model ko dene ke liye:
// if (result.type === "inline") {
//   part = { inlineData: { mimeType: result.mimeType, data: result.data } }
// } else {
//   part = { fileData: { mimeType: result.mimeType, fileUri: result.uri } }
// }
