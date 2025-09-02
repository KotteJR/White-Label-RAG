import { NextRequest } from "next/server";
import { listDocs } from "@/lib/docStore";
import { getServerSupabase } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 10);

  const supabase = getServerSupabase();
  if (supabase) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await supabase
      .from("documents")
      .select("id, filename, content_json, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) return new Response(error.message, { status: 500 });
    const items = (data || []).map((row: any) => ({
      id: row.id,
      title: row.filename,
      version: 1,
      status: "Embedded" as const,
      uploadedAt: row.created_at,
      tags: (row.content_json?.metadata?.tags as string[]) || [],
    }));
    const totalPages = Math.max(1, Math.ceil(((count as number) || 0) / limit));
    return Response.json({ items, totalPages });
  }

  const { items, totalPages } = listDocs(page, limit);
  return Response.json({ items, totalPages });
}


