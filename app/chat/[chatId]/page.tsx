"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import classNames from "classnames";
import { PaperAirplaneIcon, PlusIcon, EllipsisVerticalIcon } from "@heroicons/react/24/solid";
import { Menu } from "@headlessui/react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function ChatDetailPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [chatList, setChatList] = useState<{ id: string; title: string | null; created_at: string; updated_at: string }[]>([]);
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
      // load chat list
      try {
        const chatsRes = await fetch("/api/chats");
        const chatsData = await chatsRes.json();
        setChatList(chatsData.items || []);
      } catch {}
      const res = await fetch(`/api/chats/${chatId}/messages`);
      const data = await res.json();
      const mapped: Message[] = (data.items || []).map((m: { id: string; sender: "user" | "assistant"; content: string }) => ({ id: m.id, role: m.sender, content: m.content }));
      setMessages(mapped);
      if (mapped.length > 0) setHasStarted(true);
    }
    load();
  }, [chatId]);

  // Handle seed message separately to avoid double sends
  useEffect(() => {
    const seedMessage = searchParams.get('seed');
    if (seedMessage && messages.length === 0 && !hasStarted && !isSending) {
      // Auto-send the seeded message
      const sendSeedMessage = async () => {
        setInput("");
        setIsSending(true);

        // Persist user message
        await fetch(`/api/chats/${chatId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sender: "user", content: seedMessage }),
        });
        const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: seedMessage };
        setMessages([userMessage]);

        // Start assistant placeholder and get OpenAI response
        const assistantId = crypto.randomUUID();
        setMessages((arr) => [...arr, { id: assistantId, role: "assistant", content: "" }]);
        setIsStreaming(true);
        
        try {
          // Call the OpenAI RAG API
          const response = await fetch("/api/chat/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: seedMessage }),
          });
          
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          
          const result = await response.json();
          const assistantContent = result.content || "I apologize, but I couldn't generate a response.";
          
          // Simulate typing effect for better UX
          for (let i = 0; i <= assistantContent.length; i += Math.max(1, Math.floor(assistantContent.length / 50))) {
            await new Promise((r) => setTimeout(r, 30));
            const partialContent = assistantContent.slice(0, i);
            setMessages((arr) => arr.map((m) => (m.id === assistantId ? { ...m, content: partialContent } : m)));
          }
          
          // Ensure we show the full content
          setMessages((arr) => arr.map((m) => (m.id === assistantId ? { ...m, content: assistantContent } : m)));
          
          // Persist assistant message
          await fetch(`/api/chats/${chatId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sender: "assistant", content: assistantContent }),
          });
          
        } catch (error) {
          console.error("Chat error:", error);
          const errorMessage = "I'm sorry, but I encountered an error while processing your request. Please try again.";
          setMessages((arr) => arr.map((m) => (m.id === assistantId ? { ...m, content: errorMessage } : m)));
          
          // Persist error message
          await fetch(`/api/chats/${chatId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sender: "assistant", content: errorMessage }),
          });
        } finally {
          setIsStreaming(false);
          setIsSending(false);
          setHasStarted(true);
          
          // Clear the seed param from URL to prevent re-runs
          const url = new URL(window.location.href);
          url.searchParams.delete('seed');
          window.history.replaceState({}, '', url.toString());
        }
      };

      sendSeedMessage();
    }
  }, [chatId, searchParams, messages.length, hasStarted, isSending]);

  const sendMessage = async (messageContent?: string) => {
    const content = messageContent || input;
    if (!content.trim()) return;
    if (!messageContent) setInput("");
    setIsSending(true);

    // Persist user message
    await fetch(`/api/chats/${chatId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender: "user", content }),
    });
    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content };
    setMessages((arr) => [...arr, userMessage]);

    // Start assistant placeholder and get OpenAI response
    const assistantId = crypto.randomUUID();
    setMessages((arr) => [...arr, { id: assistantId, role: "assistant", content: "" }]);
    setIsStreaming(true);
    
    try {
      // Call the OpenAI RAG API
      const response = await fetch("/api/chat/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      const assistantContent = result.content || "I apologize, but I couldn't generate a response.";
      
      // Simulate typing effect for better UX
      for (let i = 0; i <= assistantContent.length; i += Math.max(1, Math.floor(assistantContent.length / 50))) {
        await new Promise((r) => setTimeout(r, 30));
        const partialContent = assistantContent.slice(0, i);
        setMessages((arr) => arr.map((m) => (m.id === assistantId ? { ...m, content: partialContent } : m)));
      }
      
      // Ensure we show the full content
      setMessages((arr) => arr.map((m) => (m.id === assistantId ? { ...m, content: assistantContent } : m)));
      
      // Persist assistant message
      await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: "assistant", content: assistantContent }),
      });
      
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage = "I'm sorry, but I encountered an error while processing your request. Please try again.";
      setMessages((arr) => arr.map((m) => (m.id === assistantId ? { ...m, content: errorMessage } : m)));
      
      // Persist error message
      await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: "assistant", content: errorMessage }),
      });
    } finally {
      setIsStreaming(false);
      setIsSending(false);
      setHasStarted(true);
      textareaRef.current?.focus();
    }
  };

  const send = () => sendMessage();

  const deleteChat = async (chatIdToDelete: string) => {
    try {
      await fetch(`/api/chats/${chatIdToDelete}`, { method: "DELETE" });
      setChatList(prev => prev.filter(c => c.id !== chatIdToDelete));
      if (chatIdToDelete === chatId) {
        router.push('/chat');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const renameChat = async (chatIdToRename: string, newTitle: string) => {
    try {
      await fetch(`/api/chats/${chatIdToRename}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      setChatList(prev => prev.map(c => c.id === chatIdToRename ? { ...c, title: newTitle } : c));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative grid h-[calc(100vh-80px)] grid-cols-[260px_1fr] bg-white text-gray-900">
      {/* History rail */}
      <aside className="border-r border-gray-200 p-3 overflow-y-auto">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium text-gray-700">Chats</div>
          <button
            onClick={async () => {
              const res = await fetch("/api/chats", { method: "POST" });
              const data = await res.json();
              if (data?.id) router.push(`/chat/${data.id}`);
            }}
            className="inline-flex items-center gap-1 rounded-md bg-gray-900 px-2 py-1 text-xs text-white hover:bg-gray-700"
          >
            <PlusIcon className="h-3 w-3" />
            New
          </button>
        </div>
        <div className="space-y-1">
          {chatList.map((c) => (
            <div
              key={c.id}
              className={classNames(
                "group relative rounded-md hover:bg-gray-50",
                c.id === chatId ? "bg-gray-100" : ""
              )}
            >
              <button
                onClick={() => router.push(`/chat/${c.id}`)}
                className="w-full text-left px-2 py-2 text-sm"
              >
                <div className="truncate text-gray-800 pr-6">{c.title || "Untitled chat"}</div>
                <div className="text-xs text-gray-500">{new Date(c.updated_at || c.created_at).toLocaleString()}</div>
              </button>
              
              {/* 3-dots menu */}
              <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Menu as="div" className="relative">
                  <Menu.Button className="p-1 rounded hover:bg-gray-200">
                    <EllipsisVerticalIcon className="h-4 w-4 text-gray-500" />
                  </Menu.Button>
                  <Menu.Items className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => {
                            const newTitle = prompt("Enter new title:", c.title || "");
                            if (newTitle !== null) renameChat(c.id, newTitle);
                          }}
                          className={classNames(
                            "w-full text-left px-3 py-2 text-sm",
                            active ? "bg-gray-100" : ""
                          )}
                        >
                          Rename
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => {
                            if (confirm("Delete this chat?")) deleteChat(c.id);
                          }}
                          className={classNames(
                            "w-full text-left px-3 py-2 text-sm text-red-600",
                            active ? "bg-gray-100" : ""
                          )}
                        >
                          Delete
                        </button>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Menu>
              </div>
            </div>
          ))}
        </div>
      </aside>
      
      {/* Main chat area - right column */}
      <div className="relative flex flex-col">
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

        {hasStarted && (
          <form
            className="sticky bottom-0 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 transition-all duration-700 ease-in-out"
            onSubmit={(e) => {
              e.preventDefault();
              if (!isSending && !isStreaming) send();
            }}
          >
            <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-2">
              <textarea
                ref={hasStarted ? undefined : textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  const el = e.target as HTMLTextAreaElement;
                  if (!el) return;
                  adjustTextarea(el);
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
    </div>
  );
}


