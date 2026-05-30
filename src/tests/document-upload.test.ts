import "dotenv/config";
import { prepareFile } from "../utils/document.utils";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  assert(
    process.env.GEMINI_API_KEY,
    "Set GEMINI_API_KEY in .env before running the document upload test.",
  );

  const fileBytes = new Uint8Array(101 * 1024);
  fileBytes.fill("A".charCodeAt(0));

  const file = new File([fileBytes], "document-upload-test.txt", {
    type: "text/plain",
  });

  const result = await prepareFile(file);

  assert(
    result.type === "uploaded",
    `Expected upload result for ${file.size} bytes, got ${result.type}.`,
  );
  assert(result.mimeType === "text/plain", "Expected text/plain MIME type.");
  assert(result.uri, "Expected Gemini file upload to return a URI.");

  console.log("Document upload test passed:", {
    type: result.type,
    mimeType: result.mimeType,
    uri: result.uri,
  });
}

main().catch((error) => {
  console.error("Document upload test failed:");
  console.error(error);
  process.exit(1);
});
