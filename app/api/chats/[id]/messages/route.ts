import { NextRequest } from "next/server";
import { addMessage, listMessages } from "@/lib/chatStore";
import { getServerSupabase } from "@/lib/supabaseServer";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("messages")
      .select("id, chat_id, sender, content, created_at")
      .eq("chat_id", id)
      .order("created_at", { ascending: true });
    if (error) return new Response(error.message, { status: 500 });
    return Response.json({ items: data || [] });
  }
  return Response.json({ items: listMessages(id) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { sender, content } = body as { sender: "user" | "assistant"; content: string };
  const supabase = getServerSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("messages")
      .insert({ chat_id: id, sender, content })
      .select()
      .single();
    if (error) return new Response(error.message, { status: 500 });
    return Response.json(data);
  }
  const msg = addMessage(id, sender, content);
  return Response.json(msg);
}


