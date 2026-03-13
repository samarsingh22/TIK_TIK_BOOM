import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { getSession } from "../utils/authStorage";
import { sendChatMessageToGemini } from "../ai/chatbotClient";

const CHAT_STORAGE_KEY = "truetrace.chatbot.messages.v1";
const CHAT_EVENT = "truetrace:session-changed";

const INITIAL_MESSAGE = {
  id: "welcome",
  role: "bot",
  text: "Hi. I am your True Trace assistant. Ask about batches, recalls, scans, or threat levels.",
  at: Date.now(),
};

function readMessages() {
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [INITIAL_MESSAGE];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [INITIAL_MESSAGE];
  } catch {
    return [INITIAL_MESSAGE];
  }
}

function writeMessages(messages) {
  sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
}

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(() => readMessages());
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getSession()));
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    writeMessages(messages);
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handleSessionChange = () => {
      const nextAuth = Boolean(getSession());
      setIsAuthenticated(nextAuth);

      if (!nextAuth) {
        setIsOpen(false);
        setMessages([INITIAL_MESSAGE]);
        sessionStorage.removeItem(CHAT_STORAGE_KEY);
      }
    };

    window.addEventListener(CHAT_EVENT, handleSessionChange);
    window.addEventListener("storage", handleSessionChange);

    return () => {
      window.removeEventListener(CHAT_EVENT, handleSessionChange);
      window.removeEventListener("storage", handleSessionChange);
    };
  }, []);

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
      at: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    setIsSending(true);
    try {
      const result = await sendChatMessageToGemini({ messages, userInput: trimmed });
      const botMessage = {
        id: `b-${Date.now() + 1}`,
        role: "bot",
        text: result.text,
        at: Date.now() + 1,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now() + 1}`,
          role: "bot",
          text: "Request failed. Please check network and Gemini API key setup.",
          at: Date.now() + 1,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="floating-chatbot-root" aria-live="polite">
      <button
        type="button"
        className={`chatbot-toggle ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Close chatbot" : "Open chatbot"}
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      <div className={`chatbot-panel ${isOpen ? "open" : "closed"}`}>
        <div className="chatbot-header">
          <h4>True Trace AI Chat</h4>
          <span>Live Assistant</span>
        </div>

        <div className="chatbot-messages" ref={listRef}>
          {messages.map((message) => (
            <div key={message.id} className={`chat-row ${message.role}`}>
              <div className="chat-bubble">{message.text}</div>
            </div>
          ))}
          {isSending && (
            <div className="chat-row bot">
              <div className="chat-bubble">Thinking...</div>
            </div>
          )}
        </div>

        <div className="chatbot-input-row">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about product intelligence..."
            onKeyDown={(event) => {
              if (event.key === "Enter") sendMessage();
            }}
          />
          <button type="button" onClick={sendMessage} disabled={!canSend || isSending} aria-label="Send message">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}