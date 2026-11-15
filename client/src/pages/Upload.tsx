import { useState, ChangeEvent, FormEvent } from "react";
import { MAX_PDF_BYTES, uploadPdfs } from "../api";
import type { Session } from "../api";

type Status = "idle" | "processing" | "error";

export default function Upload({ onUploaded }: { onUploaded: (s: Session) => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  // Checks and appends the chosen files.
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setError("");
    setStatus("idle");
    if (picked.length === 0) return;

    // Check for invalid types
    const invalid = picked.find(
      (f) => f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")
    );
    if (invalid) {
      setStatus("error");
      setError(`"${invalid.name}" is not a PDF file.`);
      return;
    }

    // Merge existing and newly picked, avoiding exact duplicates
    const combined = [...files];
    for (const f of picked) {
      if (!combined.some((item) => item.name === f.name && item.size === f.size)) {
        combined.push(f);
      }
    }

    if (combined.length > 5) {
      setStatus("error");
      setError("Maximum 5 PDFs can be uploaded simultaneously.");
      return;
    }

    const totalBytes = combined.reduce((acc, f) => acc + f.size, 0);
    if (totalBytes > MAX_PDF_BYTES) {
      setStatus("error");
      setError(`Total size (${(totalBytes / 1024 / 1024).toFixed(2)} MB) exceeds the 4MB limit.`);
      return;
    }

    setFiles(combined);
  }

  function handleRemove(index: number) {
    if (busy) return;
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setError("");
  }

  // Uploads all selected PDFs and moves to the chat page when ready.
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (files.length === 0) return;
    setStatus("processing");
    setError("");
    try {
      const session = await uploadPdfs(files);
      onUploaded(session);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    }
  }

  const busy = status === "processing";
  const totalMB = (files.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2);

  return (
    <div className="card">
      <h1>Upload PDFs</h1>
      <p className="hint">Upload one or multiple text-based PDFs (up to 5 files, 4MB total).</p>

      <form onSubmit={handleSubmit}>
        <label className="dropzone">
          <input
            type="file"
            multiple
            accept="application/pdf,.pdf"
            onChange={handleChange}
            disabled={busy}
          />
          <strong>Click to browse or drop your PDFs here</strong>
          <span className="hint">Select single or multiple PDF documents simultaneously</span>
        </label>

        {files.length > 0 && (
          <div className="file-list">
            <div className="file-list-header">
              <span>Selected Documents ({files.length}/5)</span>
              <span>Total: {totalMB} MB</span>
            </div>
            {files.map((f, i) => (
              <div className="file-item" key={`${f.name}-${i}`}>
                <div className="file-info">
                  <span className="file-icon">📄</span>
                  <span className="file-name">{f.name}</span>
                  <span className="file-size">({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
                {!busy && (
                  <button
                    type="button"
                    className="file-remove"
                    onClick={() => handleRemove(i)}
                    title="Remove file"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="upload-actions">
          <button className="btn" type="submit" disabled={files.length === 0 || busy}>
            {busy
              ? "Processing documents..."
              : `Upload and process ${files.length > 0 ? `(${files.length} PDF${files.length > 1 ? "s" : ""})` : ""}`}
          </button>
        </div>
      </form>

      {busy && (
        <div className="status info">
          <span className="spinner" />
          Reading, chunking and embedding your {files.length} document{files.length > 1 ? "s" : ""}. This can take up to a minute.
        </div>
      )}
      {status === "error" && <div className="status error">{error}</div>}
    </div>
  );
}