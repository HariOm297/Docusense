import { useState, ChangeEvent, FormEvent } from "react";
import { MAX_PDF_BYTES, uploadPdf } from "../api";
import type { Session } from "../api";

type Status = "idle" | "processing" | "error";

export default function Upload({ onUploaded }: { onUploaded: (s: Session) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  // Checks the chosen file before anything is sent.
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setError("");
    setStatus("idle");
    setFile(null);
    if (!picked) return;
    if (picked.type !== "application/pdf" && !picked.name.toLowerCase().endsWith(".pdf")) {
      setStatus("error");
      setError("Only PDF files are allowed.");
      return;
    }
    if (picked.size > MAX_PDF_BYTES) {
      setStatus("error");
      setError("PDF is too large. Max size is 4MB.");
      return;
    }
    setFile(picked);
  }

  // Uploads the PDF and moves to the chat page when ready.
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setStatus("processing");
    setError("");
    try {
      const session = await uploadPdf(file);
      onUploaded(session);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    }
  }

  const busy = status === "processing";

  return (
    <div className="card">
      <h1>Upload PDF</h1>
      <p className="hint">Text-based PDFs only, up to 4MB. Scanned images are not supported.</p>

      <form onSubmit={handleSubmit}>
        <label className="dropzone">
          <input type="file" accept="application/pdf,.pdf" onChange={handleChange} disabled={busy} />
          <strong>{file ? file.name : "Click to choose a PDF"}</strong>
          <span className="hint">
            {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "or select a file from your computer"}
          </span>
        </label>

        <div className="upload-actions">
          <button className="btn" type="submit" disabled={!file || busy}>
            {busy ? "Processing..." : "Upload and process"}
          </button>
        </div>
      </form>

      {busy && (
        <div className="status info">
          <span className="spinner" />
          Reading, chunking and embedding your PDF. This can take up to a minute.
        </div>
      )}
      {status === "error" && <div className="status error">{error}</div>}
    </div>
  );
}