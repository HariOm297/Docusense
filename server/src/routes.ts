import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { MAX_PDF_BYTES } from "./config";
import { AppError, extractText, chunkText } from "./pdf";
import { ingestChunks, answerQuestion } from "./rag";

const router = Router();

// Keeps the uploaded PDF in memory (serverless has no persistent disk).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_PDF_BYTES, files: 1 } });

// Fails with a clear error if work runs past the serverless time budget.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AppError("This took too long to process. Try a smaller PDF.", 504)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Quick check that the API is up.
router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Upload: PDF -> text -> chunks -> embeddings -> Pinecone namespace.
router.post("/upload", (req: Request, res: Response, next: NextFunction) => {
  upload.single("file")(req, res, async (err: any) => {
    try {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") throw new AppError("PDF is too large. Max size is 4MB.", 413);
        throw new AppError(err.message || "Upload failed.");
      }
      if (!req.file) throw new AppError("No file received. Please choose a PDF.");
      if (req.file.mimetype !== "application/pdf") throw new AppError("Only PDF files are allowed.");

      const text = await extractText(req.file.buffer);
      const docs = await chunkText(text);
      const sessionId = randomUUID(); // One Pinecone namespace per session
      await withTimeout(ingestChunks(sessionId, docs), 50_000);

      res.json({ sessionId, chunks: docs.length, fileName: req.file.originalname });
    } catch (e) {
      next(e);
    }
  });
});

// Chat: retrieve top chunks for this session and answer from them only.
router.post("/chat", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, question } = req.body ?? {};
    if (typeof sessionId !== "string" || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
      throw new AppError("Invalid session. Please upload your PDF again.");
    }
    if (typeof question !== "string" || !question.trim()) {
      throw new AppError("Please type a question.");
    }
    if (question.length > 1000) throw new AppError("Question is too long (max 1000 characters).");

    const result = await withTimeout(answerQuestion(sessionId, question.trim()), 50_000);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// Turns any thrown error into a JSON message the UI can show.
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server. Please try again." });
}

export default router;