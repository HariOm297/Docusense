import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import type { Document } from "@langchain/core/documents";
import { CHAT_MODEL, EMBEDDING_MODEL, TOP_K, requireEnv } from "./config";

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

// Retrieves the top chunks and asks Gemini to answer only from them.
export async function answerQuestion(sessionId: string, question: string) {
  const store = await PineconeStore.fromExistingIndex(getEmbeddings(), {
    pineconeIndex: getIndex(),
    namespace: sessionId,
  });
  const matches = await store.similaritySearch(question, TOP_K);

  if (matches.length === 0) {
    return { answer: "I couldn't find anything in this PDF to answer that.", sources: [] as string[] };
  }

  const context = matches.map((d, i) => `[${i + 1}] ${d.pageContent}`).join("\n\n");
  const prompt =
    "You answer questions about a PDF using ONLY the context below.\n" +
    "If the answer is not in the context, reply exactly: \"I couldn't find that in the PDF.\"\n" +
    "Do not use outside knowledge.\n\n" +
    `Context:\n${context}\n\nQuestion: ${question}\nAnswer:`;

  const model = new ChatGoogleGenerativeAI({
    apiKey: requireEnv("GEMINI_API_KEY"),
    model: CHAT_MODEL,
    temperature: 0,
  });
  const res = await model.invoke(prompt);

  // Message content can be a string or a list of blocks, so normalise it.
  const answer =
    typeof res.content === "string"
      ? res.content
      : (res.content as any[]).map((c) => c.text ?? "").join("");

  return { answer: answer.trim(), sources: matches.map((d) => d.pageContent.slice(0, 200)) };
}