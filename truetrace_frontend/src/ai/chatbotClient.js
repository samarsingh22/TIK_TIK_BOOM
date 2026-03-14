import { buildPlatformChatContext, buildPlatformChatContextText } from "./chatbotPlatformContext";

const CHATBOT_API_ENDPOINT = "/api/gemini-chat";

function buildQueryContext(platformContext, userInput) {
  const query = String(userInput || "").trim().toLowerCase();
  if (!query) {
    return {
      matchedProducts: [],
      matchedTopAnomalies: [],
      asksForProcess: false,
      asksForScans: false,
      asksForTransfers: false,
    };
  }

  const products = Array.isArray(platformContext?.products) ? platformContext.products : [];
  const matchedProducts = products
    .filter((product) => {
      const batchId = String(product.batchId || "").toLowerCase();
      const productName = String(product.productName || "").toLowerCase();
      return (batchId && query.includes(batchId)) || (productName && query.includes(productName));
    })
    .slice(0, 8)
    .map((product) => ({
      batchId: product.batchId,
      productName: product.productName,
      status: product.status,
      trustScore: product.trustScore,
      threatLevel: product.threatLevel,
      anomalyCount: product.anomalyCount,
      scanCount: product.scanCount,
      transferCount: product.transferCount,
    }));

  const topAnomalies = Array.isArray(platformContext?.topAnomalies) ? platformContext.topAnomalies : [];
  const matchedTopAnomalies = topAnomalies
    .filter((item) => {
      const batchId = String(item.batchId || "").toLowerCase();
      const productName = String(item.productName || "").toLowerCase();
      return (batchId && query.includes(batchId)) || (productName && query.includes(productName));
    })
    .slice(0, 5);

  return {
    matchedProducts,
    matchedTopAnomalies,
    asksForProcess: /process|workflow|flow|how it works|steps?/.test(query),
    asksForScans: /scan|verify|verification|qr/.test(query),
    asksForTransfers: /transfer|ownership|custody|track/.test(query),
  };
}

function formatChatbotError(errorText) {
  const message = String(errorText || "");

  if (message.includes("RESOURCE_EXHAUSTED") || message.includes("Quota exceeded") || message.includes('"code": 429')) {
    return {
      text: "Gemini quota is currently unavailable for this API key. Switching to local True Trace assistant mode.",
      shouldFallback: true,
    };
  }

  if (message.includes("API key is missing")) {
    return {
      text: "Gemini server key is not configured. Switching to local True Trace assistant mode.",
      shouldFallback: true,
    };
  }

  return {
    text: "Gemini is temporarily unavailable. Switching to local True Trace assistant mode.",
    shouldFallback: true,
  };
}

function toGeminiHistory(messages) {
  return messages
    .filter((message) => message.role === "user" || message.role === "bot")
    .slice(-12)
    .map((message) => ({
      role: message.role === "bot" ? "model" : "user",
      parts: [{ text: String(message.text || "") }],
    }));
}

export async function sendChatMessageToGemini({ messages, userInput }) {
  const history = toGeminiHistory(messages);
  const platformContext = buildPlatformChatContext();
  const platformContextText = buildPlatformChatContextText();
  const queryContext = buildQueryContext(platformContext, userInput);

  const response = await fetch(CHATBOT_API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: history,
      userInput,
      platformContext,
      platformContextText,
      queryContext,
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    const formatted = formatChatbotError(errorPayload?.error);
    return {
      ok: false,
      text: formatted.text,
      shouldFallback: formatted.shouldFallback,
    };
  }

  const data = await response.json();
  const text = String(data?.text || "").trim();

  if (!text) {
    return {
      ok: false,
      text: "Gemini did not return text. Try rephrasing the request.",
      shouldFallback: true,
    };
  }

  return {
    ok: true,
    text,
    shouldFallback: false,
  };
}
