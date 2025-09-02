import { getServerSupabase } from "@/lib/supabaseServer";
import { listDocs } from "@/lib/docStore";
import { listChats } from "@/lib/chatStore";

function lastNDays(n: number) {
  const days: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export async function GET() {
  const supabase = getServerSupabase();
  const days = lastNDays(7);

  if (supabase) {
    // Documents count and recent
    const { data: docsData, count: docsCount } = await supabase
      .from("documents")
      .select("id, filename, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(5);

    // Uploads per day (last 7 days)
    const { data: allDocs } = await supabase
      .from("documents")
      .select("created_at")
      .gte("created_at", days[0]);

    const uploadsPerDay = days.map((day) =>
      (allDocs || []).filter((r: any) => (r.created_at as string).slice(0, 10) === day).length
    );

    // Chats and messages (user queries per day)
    const { data: chatsData, count: chatsCount } = await supabase
      .from("chats")
      .select("id, updated_at", { count: "exact" })
      .order("updated_at", { ascending: false })
      .limit(5);

    const { data: msgs } = await supabase
      .from("messages")
      .select("created_at, sender")
      .gte("created_at", days[0]);

    const queriesPerDay = days.map((day) =>
      (msgs || []).filter((m: any) => m.sender === "user" && (m.created_at as string).slice(0, 10) === day).length
    );

    return Response.json({
      documents: docsCount || 0,
      activeChats: chatsCount || 0,
      recentDocs: (docsData || []).map((d: any) => ({ id: d.id, name: d.filename, date: d.created_at })),
      recentChats: (chatsData || []).map((c: any) => ({ id: c.id, name: `Chat ${c.id.slice(0, 4)}` , date: c.updated_at })),
      trends: { uploadsPerDay, queriesPerDay },
    });
  }

  // Fallback to in-memory stores
  const docs = listDocs(1, 1000).items;
  const chats = listChats();
  const recentDocs = [...docs]
    .sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))
    .slice(0, 5)
    .map((d) => ({ id: d.id, name: d.title, date: d.uploadedAt }));
  const recentChats = chats.slice(0, 5).map((c) => ({ id: c.id, name: c.title || `Chat ${c.id.slice(0, 4)}`, date: c.updated_at }));

  const uploadsPerDay = days.map((day) => docs.filter((d) => d.uploadedAt.slice(0, 10) === day).length);
  const queriesPerDay = days.map(() => 0); // no message store for mock queries count here

  return Response.json({
    documents: docs.length,
    activeChats: chats.length,
    recentDocs,
    recentChats,
    trends: { uploadsPerDay, queriesPerDay },
  });
}


