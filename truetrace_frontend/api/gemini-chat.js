const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

function resolveGeminiApiKey() {
  return String(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "").trim();
}

function resolveGeminiModel() {
  return String(process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
}

function normalizeHistory(messages) {
  return Array.isArray(messages)
    ? messages
        .filter((message) => message && (message.role === "user" || message.role === "model") && Array.isArray(message.parts))
        .slice(-12)
    : [];
}

async function callGemini({ apiKey, model, messages, userInput }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const payload = {
    systemInstruction: {
      parts: [
        {
          text: "You are True Trace AI assistant. Help users summarize content, explain platform analytics, trust score, anomalies, regulator actions, and supply-chain traceability in concise clear language.",
        },
      ],
    },
    contents: [...normalizeHistory(messages), { role: "user", parts: [{ text: String(userInput || "") }] }],
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
      maxOutputTokens: 700,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(errorBody || "Gemini upstream request failed.");
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join("\n").trim();
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = resolveGeminiApiKey();
  const model = resolveGeminiModel();
  if (!apiKey) {
    res.status(500).json({ error: "Gemini API key is missing on server. Set GEMINI_API_KEY." });
    return;
  }

  try {
    const { messages = [], userInput = "" } = req.body || {};
    if (!String(userInput || "").trim()) {
      res.status(400).json({ error: "userInput is required." });
      return;
    }

    const text = await callGemini({ apiKey, model, messages, userInput });
    res.status(200).json({ text });
  } catch (error) {
    res.status(502).json({ error: error?.message || "Gemini request failed." });
  }
}