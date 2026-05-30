import { File as NodeFile } from "buffer";
import { Router } from "express";
import multer from "multer";
import { prepareFile } from "../utils/document.utils";
import { extractFromDocuments, prepareDocuments } from "../utils/extract.utils";

export const documentRoutes = Router();
const upload = multer({ storage: multer.memoryStorage() });

function toNodeFile(file: Express.Multer.File) {
  return new NodeFile([new Uint8Array(file.buffer)], file.originalname, {
    type: file.mimetype,
  }) as unknown as File;
}

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

    res.status(201).json(extractedData);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Extraction failed.",
    });
  }
});
