import express from "express";
import cors from "cors";
import router, { errorHandler } from "./src/routes";

const app = express();

// Only the origins in CORS_ORIGIN may call the API from another site (same-origin needs no CORS).
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? false }));
app.use(express.json({ limit: "10kb" }));

// All endpoints live under the relative /api path.
app.use("/api", router);
app.use(errorHandler);

// Run a local server only outside Vercel.
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT) || 3001;
  app.listen(port, () => console.log(`API running at http://localhost:${port}/api`));
}

// Vercel runs the exported app as a serverless function.
export default app;