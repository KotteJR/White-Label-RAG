import { NextRequest } from "next/server";
import { addMessage, listMessages } from "@/lib/chatStore";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  return Response.json({ items: listMessages(params.id) });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { sender, content } = body as { sender: "user" | "assistant"; content: string };
  const msg = addMessage(params.id, sender, content);
  return Response.json(msg);
}


