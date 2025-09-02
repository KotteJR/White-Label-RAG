import { createChat, listChats } from "@/lib/chatStore";
import { getServerSupabase } from "@/lib/supabaseServer";
import { cookies } from "next/headers";

export async function GET() {
  const supabase = getServerSupabase();
  if (supabase) {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value || "00000000-0000-0000-0000-000000000001";
    const { data, error } = await supabase
      .from("chats")
      .select("id, title, updated_at, created_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) return new Response(error.message, { status: 500 });
    const items = (data || []).map((c) => ({ id: c.id, title: c.title, created_at: c.created_at, updated_at: c.updated_at }));
    return Response.json({ items });
  }
  return Response.json({ items: listChats() });
}

export async function POST() {
  const supabase = getServerSupabase();
  if (supabase) {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value || "00000000-0000-0000-0000-000000000001";
    const { data, error } = await supabase
      .from("chats")
      .insert({ title: null, user_id: userId })
      .select()
      .single();
    if (error) return new Response(error.message, { status: 500 });
    return Response.json({ id: data.id, title: data.title, created_at: data.created_at, updated_at: data.updated_at });
  }
  const chat = createChat(null);
  return Response.json(chat);
}


