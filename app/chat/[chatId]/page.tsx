"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import classNames from "classnames";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function ChatDetailPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLFormElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [composerH, setComposerH] = useState(0);
  const [taHeight, setTaHeight] = useState<number>(48);

  function adjustTextarea(el: HTMLTextAreaElement) {
    const CONTROL_H = 48;
    const cs = window.getComputedStyle(el);
    const line = parseFloat(cs.lineHeight || "20");
    const pad = parseFloat(cs.paddingTop || "0") + parseFloat(cs.paddingBottom || "0");
    const max = line * 6 + pad;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, max);
    const threshold = CONTROL_H + line * 0.9;
    const clamped = next > threshold ? next : CONTROL_H;
    setTaHeight(clamped);
    el.style.overflowY = next >= max ? "auto" : "hidden";
  }

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const handler = () => {
      const threshold = 64;
      const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
      setAtBottom(isAtBottom);
    };
    el.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => el.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (atBottom) {
      containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length, atBottom]);

  useEffect(() => {
    const update = () => {
      const h = composerRef.current?.getBoundingClientRect().height || 0;
      setComposerH(Math.ceil(h));
    };
    update();
    window.addEventListener("resize", update);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (ro && composerRef.current) ro.observe(composerRef.current);
    return () => {
      window.removeEventListener("resize", update);
      if (ro && composerRef.current) ro.unobserve(composerRef.current);
    };
  }, []);

  // Load existing messages for this chat
  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/chats/${chatId}/messages`);
      const data = await res.json();
      const mapped: Message[] = (data.items || []).map((m: any) => ({ id: m.id, role: m.sender, content: m.content }));
      setMessages(mapped);
      if (mapped.length > 0) setHasStarted(true);
    }
    load();
  }, [chatId]);

  const send = async () => {
    if (!input.trim()) return;
    const content = input;
    setInput("");
    setIsSending(true);

    // Persist user message
    await fetch(`/api/chats/${chatId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender: "user", content }),
    });
    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content };
    setMessages((arr) => [...arr, userMessage]);

    // Start assistant placeholder and stream
    const assistantId = crypto.randomUUID();
    setMessages((arr) => [...arr, { id: assistantId, role: "assistant", content: "" }]);
    setIsStreaming(true);
    const text = "This is a streamed response with references to sources.";
    for (let i = 0; i < text.length; i++) {
      await new Promise((r) => setTimeout(r, 20));
      setMessages((arr) => arr.map((m) => (m.id === assistantId ? { ...m, content: text.slice(0, i + 1) } : m)));
    }
    setIsStreaming(false);
    setIsSending(false);
    setHasStarted(true);

    // Persist assistant message
    await fetch(`/api/chats/${chatId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender: "assistant", content: text }),
    });

    textareaRef.current?.focus();
  };

  return (
    <div className="relative flex h-[calc(100vh-80px)] flex-col bg-white text-gray-900">
      <div
        ref={containerRef}
        className={classNames(
          "flex-1 overflow-y-auto transition-all duration-700 ease-in-out",
          hasStarted ? "block" : "flex items-center justify-center"
        )}
      >
        <div
          className={classNames("mx-auto w-full max-w-3xl px-4", hasStarted ? "pt-4 pb-28" : "grid place-items-center")}
          style={hasStarted ? undefined : { minHeight: `calc(100% - ${composerH}px)` }}
        >
          {!hasStarted ? (
            <div className="flex flex-col items-center text-center animate-fadeIn w-full">
              <div className="mb-3 text-2xl font-medium">New chat</div>
              <div className="text-sm text-gray-500">Ask anything to get started</div>
            </div>
          ) : (
            <div className="space-y-4" role="log" aria-live="polite" aria-relevant="additions">
              {messages.map((m) => {
                const isUser = m.role === "user";
                return (
                  <div key={m.id} className={classNames("flex", isUser ? "justify-end" : "justify-start")}>
                    {isUser ? (
                      <div className="max-w-[70%] rounded-3xl bg-gray-900 px-4 py-2 text-white shadow-sm transition-shadow hover:shadow-md">
                        {m.content}
                      </div>
                    ) : (
                      <div className="max-w-[70%] leading-relaxed text-gray-800 animate-fadeIn">{m.content}</div>
                    )}
                  </div>
                );
              })}
              {isStreaming && (
                <div className="text-left">
                  <div className="inline-flex items-center gap-1 text-gray-500">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.2s]"></span>
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.1s]"></span>
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!atBottom && hasStarted && (
        <button
          onClick={() => containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" })}
          className="fixed right-6 bottom-28 z-10 rounded-full bg-gray-200 px-3 py-1 text-sm shadow"
        >
          Jump to latest
        </button>
      )}

      <form
        ref={composerRef}
        className="sticky bottom-0 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 transition-all duration-700 ease-in-out"
        onSubmit={(e) => {
          e.preventDefault();
          if (!isSending && !isStreaming) send();
        }}
      >
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              const el = textareaRef.current;
              if (!el) return;
              adjustTextarea(el);
            }}
            onFocus={() => {
              if (textareaRef.current) adjustTextarea(textareaRef.current);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!isSending && !isStreaming) send();
              }
            }}
            placeholder="Ask anything"
            className="max-h-48 flex-1 resize-none rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm leading-5 shadow-sm focus:border-blue-500 focus:outline-none"
            style={{ height: taHeight }}
            disabled={isSending || isStreaming}
            rows={1}
          />
          <button
            type="submit"
            aria-label="Send message"
            title="Send"
            disabled={isSending || isStreaming}
            className={classNames(
              "h-12 w-12 rounded-full text-white flex items-center justify-center",
              isSending || isStreaming ? "bg-black/50 cursor-not-allowed" : "bg-gray-900 hover:bg-gray-700"
            )}
          >
            <PaperAirplaneIcon className="h-5 w-5 -rotate-45" />
          </button>
        </div>
      </form>
    </div>
  );
}


