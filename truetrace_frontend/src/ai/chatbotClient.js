const CHATBOT_API_ENDPOINT = "/api/gemini-chat";

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
  const response = await fetch(CHATBOT_API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: history,
      userInput,
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    return {
      ok: false,
      text: String(errorPayload?.error || "Gemini request failed on server."),
    };
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join("\n").trim();

  if (!text) {
    return {
      ok: false,
      text: "Gemini did not return text. Try rephrasing the request.",
    };
  }

  return {
    ok: true,
    text,
  };
}
