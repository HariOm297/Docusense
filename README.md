\# Docusense



Upload a PDF and chat with it. Docusense answers only from the content of your document using Retrieval-Augmented Generation (RAG).



\*\*Live URL:\*\* https://YOUR-APP.vercel.app  <!-- replace after deploying -->



\## How it works



1\. Upload a text-based PDF (max 4MB).

2\. The server extracts the text and splits it into overlapping chunks.

3\. Each chunk is embedded with Gemini embeddings and stored in Pinecone (one namespace per session).

4\. Your question is embedded, the top matching chunks are retrieved, and Gemini answers using only those chunks.



\## Tech stack



\- Frontend: React + TypeScript (Vite), plain CSS

\- Backend: Node.js + Express.js REST API, run as a Vercel serverless function

\- AI: LangChain, Google Gemini (LLM), Gemini Embeddings

\- Vector store: Pinecone

\- Hosting: Git/GitHub + Vercel

\- Small extras: multer (file upload), pdf-parse (PDF text), cors, react-router-dom



\## Project structure



```

docusense/

├── client/        React + TypeScript app

├── server/        Express API (src/ holds PDF, RAG and routes code)

├── vercel.json    Vercel build and routing config

└── .env.example   Required environment variables

```



\## Local setup



1\. Clone the repo and install both apps:

&#x20;  ```bash

&#x20;  cd server \&\& npm install \&\& cd ..

&#x20;  cd client \&\& npm install \&\& cd ..

&#x20;  ```

2\. Create a Pinecone index (dense vectors, \*\*not\*\* integrated embedding): dimension `3072`, metric `cosine`, serverless.

3\. Copy `.env.example` to `.env` in the project root and fill in your keys:

&#x20;  ```

&#x20;  GEMINI\_API\_KEY=...

&#x20;  PINECONE\_API\_KEY=...

&#x20;  PINECONE\_INDEX=your-index-name

&#x20;  CORS\_ORIGIN=http://localhost:5173

&#x20;  ```

4\. Run the API and the website in two terminals:

&#x20;  ```bash

&#x20;  cd server \&\& npm run dev

&#x20;  cd client \&\& npm run dev

&#x20;  ```

5\. Open http://localhost:5173



\## Deploy on Vercel



1\. Push this repo to GitHub.

2\. In Vercel, choose Add New > Project and import the repo.

3\. Add the environment variables `GEMINI\_API\_KEY`, `PINECONE\_API\_KEY` and `PINECONE\_INDEX`.

4\. Deploy. Every push to `main` deploys automatically.



\## Limits



\- PDF size: 4MB maximum (Vercel request limit)

\- Text-based PDFs only (scanned images are not supported)

\- Very long PDFs are rejected with a clear message to stay within the serverless time limit



\## Security



API keys live only in `.env` (git-ignored) locally and in Vercel environment variables in production. Never commit them.

