import { File as NodeFile } from "buffer";
import { RequestHandler, Router } from "express";
import multer from "multer";
import { prepareFile } from "../utils/document.utils";
import { extractFromDocuments, prepareDocuments } from "../utils/extract.utils";
import { MedicalRecord } from "../models/patient.model";

export const documentRoutes = Router();
const upload = multer({ storage: multer.memoryStorage() });

const requireDocumentToken: RequestHandler = (req, res, next) => {
  const expectedToken = process.env.DOCUMENT_API_TOKEN;

  if (!expectedToken) {
    res.status(500).json({ error: "Document API token is not configured." });
    return;
  }

  const authorization = req.header("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || token !== expectedToken) {
    res.status(401).json({ error: "Invalid or missing bearer token." });
    return;
  }

  next();
};

function toNodeFile(file: Express.Multer.File) {
  return new NodeFile([new Uint8Array(file.buffer)], file.originalname, {
    type: file.mimetype,
  }) as unknown as File;
}

documentRoutes.use(requireDocumentToken);

documentRoutes.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Upload file field is required: "file".' });
      return;
    }

    const file = toNodeFile(req.file);

    const result = await prepareFile(file);

    res.status(201).json({
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      result,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Upload failed.",
    });
  }
});

documentRoutes.post(
  "/upload/multiple",
  upload.array("files"),
  async (req, res) => {
    try {
      const uploadedFiles = req.files as Express.Multer.File[] | undefined;

      if (!uploadedFiles?.length) {
        res
          .status(400)
          .json({ error: 'Upload file field is required: "files".' });
        return;
      }

      const files = await Promise.all(
        uploadedFiles.map(async (uploadedFile) => {
          const file = toNodeFile(uploadedFile);
          const result = await prepareFile(file);

          return {
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
            result,
          };
        }),
      );

      res.status(201).json({
        count: files.length,
        files,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Upload failed.",
      });
    }
  },
);

documentRoutes.post("/extract", upload.array("files"), async (req, res) => {
  try {
    const uploadedFiles = req.files as Express.Multer.File[] | undefined;

    if (!uploadedFiles?.length) {
      res.status(400).json({ error: 'Upload file field is required: "files".' });
      return;
    }

    const files = uploadedFiles.map(toNodeFile);
    const preparedFiles = await prepareDocuments(files);
    const extractedData = await extractFromDocuments(preparedFiles);

    // Save medical record to MongoDB
    const record = await MedicalRecord.create(extractedData);

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Extraction failed.",
    });
  }
});

documentRoutes.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const record = await MedicalRecord.findById(id);

    if (!record) {
      res.status(404).json({ error: "Medical record not found." });
      return;
    }

    res.status(200).json(record);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch record.",
    });
  }
});

documentRoutes.get("/", async (req, res) => {
  try {
    const { name } = req.query;
    const filter = name ? { "patient.name": name as string } : {};
    const records = await MedicalRecord.find(filter);
    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch records.",
    });
  }
});
