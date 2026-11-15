import pdfParse from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { CHUNK_SIZE, CHUNK_OVERLAP, MAX_CHUNKS } from "./config";

// Error with an HTTP status so routes can return clear messages to the UI.
export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

// Extracts plain text from a PDF buffer.
export async function extractText(buffer: Buffer): Promise<string> {
  if (buffer.subarray(0, 4).toString() !== "%PDF") {
    throw new AppError("That file is not a valid PDF.");
  }
  let text = "";
  try {
    text = (await pdfParse(buffer)).text.trim();
  } catch {
    throw new AppError("Could not read this PDF. It may be corrupted or password protected.");
  }
  if (!text) {
    throw new AppError("No text found. Scanned or image-only PDFs are not supported.");
  }
  return text;
}

// Splits text into overlapping chunks and enforces the chunk cap.
export async function chunkText(text: string) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });
  const docs = await splitter.createDocuments([text]);
  if (docs.length > MAX_CHUNKS) {
    throw new AppError(
      `This PDF is too long to process in time (${docs.length} chunks, max ${MAX_CHUNKS}). Try a shorter PDF.`,
      413
    );
  }
  return docs;
}