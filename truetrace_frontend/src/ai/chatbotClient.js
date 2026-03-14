import { buildPlatformChatContext, buildPlatformChatContextText } from "./chatbotPlatformContext";

const CHATBOT_API_ENDPOINT = "/api/gemini-chat";

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

  const response = await fetch(CHATBOT_API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: history,
      userInput,
      platformContext,
      platformContextText,
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
