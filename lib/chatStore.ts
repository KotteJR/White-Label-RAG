export type Chat = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  chat_id: string;
  sender: "user" | "assistant";
  content: string;
  created_at: string;
};

const db: { chats: Chat[]; messages: ChatMessage[] } = {
  chats: [],
  messages: [],
};

export function listChats(): Chat[] {
  return [...db.chats].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));
}

export function createChat(title: string | null = null): Chat {
  const now = new Date().toISOString();
  const chat: Chat = { id: crypto.randomUUID(), title, created_at: now, updated_at: now };
  db.chats.unshift(chat);
  return chat;
}

export function getChat(id: string): Chat | undefined {
  return db.chats.find((c) => c.id === id);
}

export function listMessages(chatId: string): ChatMessage[] {
  return db.messages.filter((m) => m.chat_id === chatId).sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
}

export function addMessage(chatId: string, sender: "user" | "assistant", content: string): ChatMessage {
  const msg: ChatMessage = {
    id: crypto.randomUUID(),
    chat_id: chatId,
    sender,
    content,
    created_at: new Date().toISOString(),
  };
  db.messages.push(msg);
  const chat = getChat(chatId);
  if (chat) chat.updated_at = msg.created_at;
  return msg;
}


