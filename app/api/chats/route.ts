import { createChat, listChats } from "@/lib/chatStore";

export async function GET() {
  return Response.json({ items: listChats() });
}

export async function POST() {
  const chat = createChat(null);
  return Response.json(chat);
}


