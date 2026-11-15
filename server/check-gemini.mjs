// One-time check: lists usable Gemini flash models and tests a tiny call.
const key = process.env.GEMINI_API_KEY;
const headers = { "x-goog-api-key": key, "Content-Type": "application/json" };
const base = "https://generativelanguage.googleapis.com/v1beta";

const list = await fetch(`${base}/models?pageSize=200`, { headers });
console.log("List status:", list.status);
const data = await list.json();
if (!list.ok) {
  console.log(JSON.stringify(data).slice(0, 400));
  process.exit(1);
}

const names = (data.models || [])
  .filter((m) => m.supportedGenerationMethods?.includes("generateContent") && /flash/.test(m.name))
  .map((m) => m.name.replace("models/", ""));
console.log("Flash models you can use:\n" + names.join("\n"));

// Tries the alias first, then the first model from the list.
for (const name of ["gemini-flash-latest", names[0]].filter(Boolean)) {
  const r = await fetch(`${base}/models/${name}:generateContent`, {
    method: "POST",
    headers,
    body: JSON.stringify({ contents: [{ parts: [{ text: "Say OK" }] }] }),
  });
  console.log(`TEST ${name} -> ${r.status}`);
  if (!r.ok) console.log((await r.text()).slice(0, 300));
}