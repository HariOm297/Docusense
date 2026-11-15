// Shapes returned by the backend.
export interface Session {
  sessionId: string;
  fileName: string;
  chunks: number;
}
export interface ChatResult {
  answer: string;
  sources: string[];
}

export const MAX_PDF_BYTES = 4 * 1024 * 1024; // Matches the server limit

// Reads the JSON reply and turns any failure into a readable error.
async function parse<T>(res: Response): Promise<T> {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // Platform errors (like 413) may not be JSON.
  }
  if (!res.ok) {
    if (res.status === 413) throw new Error(data?.error || "PDF is too large. Max size is 4MB.");
    if (res.status === 504) throw new Error(data?.error || "Processing took too long. Try a smaller PDF.");
    throw new Error(data?.error || `Request failed (${res.status}). Please try again.`);
  }
  return data as T;
}

// Wraps fetch so network failures also give a clear message.
async function request<T>(url: string, init: RequestInit): Promise<T> {
  try {
    return await parse<T>(await fetch(url, init));
  } catch (e) {
    if (e instanceof TypeError) throw new Error("Could not reach the server. Check your connection.");
    throw e;
  }
}

// Sends the PDF to the backend (relative /api path works locally and on Vercel).
export function uploadPdf(file: File): Promise<Session> {
  const form = new FormData();
  form.append("file", file);
  return request<Session>("/api/upload", { method: "POST", body: form });
}

// Asks a question about the uploaded PDF.
export function askQuestion(sessionId: string, question: string): Promise<ChatResult> {
  return request<ChatResult>("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, question }),
  });
}