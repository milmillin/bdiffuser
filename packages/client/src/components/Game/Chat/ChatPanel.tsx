import { useState, useRef, useEffect } from "react";
import type { ChatMessage, ClientMessage } from "@bomb-busters/shared";

export function ChatPanel({
  messages,
  send,
  playerId,
}: {
  messages: ChatMessage[];
  send: (msg: ClientMessage) => void;
  playerId: string;
}) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    // Consider "near bottom" if within 40px of the bottom
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el && isNearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    send({ type: "chat", text: trimmed });
    setText("");
  };

  return (
    <div
      className="flex flex-col h-full"
      data-testid="chat-panel"
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-none p-2 space-y-1 min-h-0"
      >
        {messages.map((msg) => (
          <ChatBubble key={msg.id} msg={msg} isOwn={msg.senderId === playerId} />
        ))}
      </div>

      <div className="p-2 border-t border-gray-700 flex gap-1 flex-shrink-0">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message..."
          maxLength={500}
          data-testid="chat-input"
          className="flex-1 px-2 py-1 bg-[var(--color-bomb-dark)] border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          data-testid="chat-send"
          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm font-bold transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function ChatBubble({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
  if (msg.isBotReasoning) {
    return (
      <div className="flex flex-col">
        <span className="text-[10px] text-purple-400 font-bold">
          {msg.senderName} <span className="font-normal italic">(thinking)</span>
        </span>
        <div className="bg-purple-900/40 border border-purple-700/50 rounded px-2 py-1 text-xs text-purple-200 italic">
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
      <span
        className={`text-[10px] font-bold ${isOwn ? "text-blue-400" : "text-gray-400"}`}
      >
        {msg.senderName}
      </span>
      <div
        className={`rounded px-2 py-1 text-xs max-w-[90%] break-words ${
          isOwn
            ? "bg-blue-900/40 text-blue-100"
            : "bg-gray-700/50 text-gray-200"
        }`}
      >
        {msg.text}
      </div>
    </div>
  );
}
