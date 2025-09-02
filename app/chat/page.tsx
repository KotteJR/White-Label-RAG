"use client";

import { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: { id: string; title: string; url?: string }[];
  feedback?: "up" | "down";
};

export default function ChatPage() {
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
    const CONTROL_H = 48; // one-line control height
    const cs = window.getComputedStyle(el);
    const line = parseFloat(cs.lineHeight || "20");
    const pad = parseFloat(cs.paddingTop || "0") + parseFloat(cs.paddingBottom || "0");
    const max = line * 6 + pad; // up to 6 lines
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, max);
    // Only grow once we exceed roughly one full extra line
    const threshold = CONTROL_H + line * 0.9;
    const clamped = next > threshold ? next : CONTROL_H;
    setTaHeight(clamped);
    el.style.overflowY = next >= max ? "auto" : "hidden";
  }

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const handler = () => {
      const threshold = 64; // px
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

  const send = async () => {
    if (!input.trim()) return;
    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: input };
    setMessages((arr) => [...arr, userMessage]);
    setInput("");
    setIsSending(true);

    // Call backend to get OpenAI-powered answer with citations
    const assistantId = crypto.randomUUID();
    setMessages((arr) => [...arr, { id: assistantId, role: "assistant", content: "", citations: [] }]);
    setIsStreaming(true);
    try {
      const res = await fetch("/api/chat/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: userMessage.content }) });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const text: string = data.content || "";
      const citations = (data.citations || []) as { id: string; title: string }[];
      // Simulated progressive render for perceived responsiveness
      for (let i = 0; i < text.length; i += Math.max(1, Math.floor(text.length / 30))) {
        await new Promise((r) => setTimeout(r, 16));
        setMessages((arr) => arr.map((m) => (m.id === assistantId ? { ...m, content: text.slice(0, i + 1) } : m)));
      }
      setMessages((arr) => arr.map((m) => (m.id === assistantId ? { ...m, content: text, citations } : m)));
    } catch (e) {
      setMessages((arr) => arr.map((m) => (m.id === assistantId ? { ...m, content: (e as Error).message } : m)));
    } finally {
      setIsStreaming(false);
      setIsSending(false);
      if (!hasStarted) setHasStarted(true);
      textareaRef.current?.focus();
    }
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
          className={classNames(
            "mx-auto w-full max-w-3xl px-4",
            hasStarted ? "pt-4 pb-28" : "grid place-items-center"
          )}
          style={hasStarted ? undefined : { minHeight: `calc(100% - ${composerH}px)` }}
        >
          {!hasStarted ? (
            <div className="flex flex-col items-center text-center animate-fadeIn w-full">
              <div className="mb-3 text-2xl font-medium">What's on the agenda today?</div>
              <div className="text-sm text-gray-500">Ask anything to get started</div>
              {/* Inline composer when empty */}
              <form
                ref={composerRef}
                className="mt-6 w-full transition-all duration-700 ease-in-out"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!isSending && !isStreaming) send();
                }}
              >
                <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-0">
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
                      isSending || isStreaming ? "bg-gray-400 cursor-not-allowed" : "bg-gray-900 hover:bg-gray-700"
                    )}
                  >
                    <PaperAirplaneIcon className="h-5 w-5 -rotate-45" />
                  </button>
                </div>
              </form>
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
                      <div className="max-w-[70%] leading-relaxed text-gray-800 animate-fadeIn">
                        {m.content}
                        {m.citations && m.citations.length > 0 && (
                          <ol className="mt-2 list-decimal pl-5 text-xs text-gray-600">
                            {m.citations.map((c) => (
                              <li key={c.id}>
                                {c.url ? (
                                  <a className="underline" href={c.url} target="_blank" rel="noreferrer">
                                    {c.title}
                                  </a>
                                ) : (
                                  <span>{c.title}</span>
                                )}
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
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

      {hasStarted && (
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
      )}
    </div>
  );
}


