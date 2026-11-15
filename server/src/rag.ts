import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import type { Document } from "@langchain/core/documents";
import { EMBEDDING_MODEL, TOP_K, requireEnv } from "./config";
import { AppError } from "./pdf";

// Tried in order, because Google retires Gemini models often.
const CHAT_MODELS = ["gemini-flash-latest", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash"];

// Builds the Gemini embeddings client.
function getEmbeddings() {
  return new GoogleGenerativeAIEmbeddings({
    apiKey: requireEnv("GEMINI_API_KEY"),
    model: EMBEDDING_MODEL,
  });
}

// Returns the Pinecone index handle.
function getIndex() {
  const pc = new Pinecone({ apiKey: requireEnv("PINECONE_API_KEY") });
  return pc.index(requireEnv("PINECONE_INDEX"));
}

// Embeds the chunks and stores them in this session's own namespace.
export async function ingestChunks(sessionId: string, docs: Document[]) {
  await PineconeStore.fromDocuments(docs, getEmbeddings(), {
    pineconeIndex: getIndex(),
    namespace: sessionId,
  });
}

// Calls Gemini's REST endpoint directly so every failure shows a real status.
async function generate(model: string, prompt: string): Promise<string> {
  console.log(`Calling Gemini ${model}...`);
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": requireEnv("GEMINI_API_KEY") },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0 },
    }),
    signal: AbortSignal.timeout(12_000),
  });
  const body = await res.text();
  console.log(`Gemini ${model} -> ${res.status}`);
  if (!res.ok) throw Object.assign(new Error(`${res.status} ${body.slice(0, 300)}`), { status: res.status });

  const data = JSON.parse(body);
  const text = (data.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("").trim();
  if (!text) throw new Error("Gemini returned an empty answer.");
  return text;
}

// Retrieves the top chunks and asks Gemini to answer only from them.
export async function answerQuestion(sessionId: string, question: string) {
  let matches: Document[] = [];
  try {
    const store = await PineconeStore.fromExistingIndex(getEmbeddings(), {
      pineconeIndex: getIndex(),
      namespace: sessionId,
    });
    matches = await store.similaritySearch(question, TOP_K);
    console.log(`Retrieved ${matches.length} chunks`);
  } catch (e: any) {
    console.error("Retrieval failed:", e?.message || e);
    throw new AppError(`Could not search your PDF: ${String(e?.message || e).slice(0, 300)}`, 502);
  }

  if (matches.length === 0) {
    return { answer: "I couldn't find anything in this PDF to answer that.", sources: [] as string[] };
  }

  const context = matches.map((d, i) => `[${i + 1}] ${d.pageContent}`).join("\n\n");
  const prompt =
    "You answer questions about a PDF using ONLY the context below.\n" +
    "If the answer is not in the context, reply exactly: \"I couldn't find that in the PDF.\"\n" +
    "Do not use outside knowledge.\n\n" +
    `Context:\n${context}\n\nQuestion: ${question}\nAnswer:`;

  // Falls through the model list until one answers.
  let lastError = "";
  for (const name of CHAT_MODELS) {
    try {
      const answer = await generate(name, prompt);
      console.log(`Answered with ${name}`);
      return {
        answer,
        sources: matches.map((d) => (d.metadata?.source ? `[${d.metadata.source}] ` : "") + d.pageContent.slice(0, 200)),
      };
    } catch (e: any) {
      lastError = String(e?.message || e);
      console.error(`Model ${name} failed:`, lastError);
      if (e?.status === 401 || e?.status === 403) break; // Key problem, other models will fail too
    }
  }
  throw new AppError(`Gemini could not answer: ${lastError.slice(0, 300)}`, 502);
}