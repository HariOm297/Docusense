import { Link } from "react-router-dom";

// How the app works, shown as four short cards.
const STEPS = [
  { title: "Upload", text: "Choose a text-based PDF (up to 4MB)." },
  { title: "Process", text: "The text is extracted, split into chunks and embedded with Gemini." },
  { title: "Retrieve", text: "Your question finds the most relevant chunks in Pinecone." },
  { title: "Answer", text: "Gemini replies using only those chunks from your PDF." },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>Chat with your PDF</h1>
        <p>Upload a document and ask questions. Answers come only from what is inside your PDF.</p>
        <div className="actions">
          <Link className="btn" to="/upload">Upload a PDF</Link>
          <Link className="btn secondary" to="/chat">Open chat</Link>
        </div>
      </section>

      <section className="steps">
        {STEPS.map((s, i) => (
          <div className="card step" key={s.title}>
            <div className="num">{i + 1}</div>
            <h2>{s.title}</h2>
            <p>{s.text}</p>
          </div>
        ))}
      </section>
    </>
  );
}