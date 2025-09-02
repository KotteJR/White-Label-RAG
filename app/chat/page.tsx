"use client";

import { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { PaperAirplaneIcon, PlusIcon, EllipsisVerticalIcon } from "@heroicons/react/24/solid";
import { Menu } from "@headlessui/react";
import AuthGuard from "@/components/AuthGuard";
import { useRouter } from "next/navigation";

function ChatPageContent() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLFormElement>(null);
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

  const createNewChatAndSend = async () => {
    if (!input.trim()) return;
    const userInput = input;
    setInput("");
    setIsSending(true);
    try {
      // Create chat and redirect with seeded input
      const chatRes = await fetch("/api/chats", { method: "POST" });
      const chat = await chatRes.json();
      if (chat?.id) {
        router.push(`/chat/${chat.id}?seed=${encodeURIComponent(userInput)}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const createNewChat = async () => {
    try {
      const chatRes = await fetch("/api/chats", { method: "POST" });
      const chat = await chatRes.json();
      if (chat?.id) {
        router.push(`/chat/${chat.id}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [chatList, setChatList] = useState<{ id: string; title: string | null; created_at: string; updated_at: string }[]>([]);

  // Load chat list on mount
  useEffect(() => {
    async function loadChats() {
      try {
        const chatsRes = await fetch("/api/chats");
        const chatsData = await chatsRes.json();
        setChatList(chatsData.items || []);
      } catch (e) {
        console.error("Failed to load chats:", e);
      }
    }
    loadChats();
  }, []);

  const deleteChat = async (chatIdToDelete: string) => {
    try {
      await fetch(`/api/chats/${chatIdToDelete}`, { method: "DELETE" });
      setChatList(prev => prev.filter(c => c.id !== chatIdToDelete));
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
            onClick={createNewChat}
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
              className="group relative rounded-md hover:bg-gray-50"
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
      
      {/* Main chat area */}
      <div className="flex-1 flex items-center justify-center">
        <div
          className="mx-auto w-full max-w-3xl px-4 grid place-items-center"
          style={{ minHeight: `calc(100% - ${composerH}px)` }}
        >
          <div className="flex flex-col items-center text-center animate-fadeIn w-full">
            <div className="mb-3 text-2xl font-medium">What's on the agenda today?</div>
            <div className="text-sm text-gray-500">Ask anything to get started</div>

            {/* Inline composer when user starts typing */}
            <form
              ref={composerRef}
              className="mt-6 w-full transition-all duration-700 ease-in-out"
              onSubmit={(e) => {
                e.preventDefault();
                if (!isSending) createNewChatAndSend();
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
                      if (!isSending) createNewChatAndSend();
                    }
                  }}
                  placeholder="Ask anything"
                  className="max-h-48 flex-1 resize-none rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm leading-5 shadow-sm focus:border-blue-500 focus:outline-none"
                  style={{ height: taHeight }}
                  disabled={isSending}
                  rows={1}
                />
                <button
                  type="submit"
                  aria-label="Send message"
                  title="Send"
                  disabled={isSending}
                  className={classNames(
                    "h-12 w-12 rounded-full text-white flex items-center justify-center",
                    isSending ? "bg-gray-400 cursor-not-allowed" : "bg-gray-900 hover:bg-gray-700"
                  )}
                >
                  <PaperAirplaneIcon className="h-5 w-5 -rotate-45" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <AuthGuard>
      <ChatPageContent />
    </AuthGuard>
  );
}


