import { useState } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import type { Session } from "./api";
import Home from "./pages/Home";
import Upload from "./pages/Upload";
import Chat from "./pages/Chat";

// Restores the last session so a page refresh keeps the chat.
function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem("Docusense-session");
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(loadSession);
  const navigate = useNavigate();

  // Saves the new session and opens the chat page.
  function handleUploaded(s: Session) {
    setSession(s);
    try {
      sessionStorage.setItem("Docusense-session", JSON.stringify(s));
    } catch {
      // Storage can be blocked, the chat still works until refresh.
    }
    navigate("/chat");
  }

  return (
    <div className="app">
      <header className="nav">
        <span className="brand">Docusense</span>
        <nav>
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/upload">Upload PDF</NavLink>
          <NavLink to="/chat">Chat</NavLink>
        </nav>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload" element={<Upload onUploaded={handleUploaded} />} />
          <Route path="/chat" element={<Chat session={session} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}