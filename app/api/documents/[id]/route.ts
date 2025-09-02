import { NextRequest } from "next/server";
import { getDoc, removeDoc, upsertDoc } from "@/lib/docStore";
import { getServerSupabase } from "@/lib/supabaseServer";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("documents")
      .select("id, filename, content_json, created_at")
      .eq("id", id)
      .single();
    if (error && error.code !== "PGRST116") return new Response(error.message, { status: 500 });
    if (data) {
      return Response.json({
        id: data.id,
        title: data.filename,
        version: 1,
        status: "Embedded" as const,
        uploadedAt: data.created_at,
        tags: (data.content_json?.metadata?.tags as string[]) || [],
        content_json: data.content_json || null,
      });
    }
  }
  const item = getDoc(id);
  if (!item) return new Response("Not found", { status: 404 });
  return Response.json(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const supabase = getServerSupabase();
  if (supabase) {
    const { error } = await supabase
      .from("documents")
      .update({ filename: body.title, content_json: { ...(body.content_json || {}), metadata: { tags: body.tags || [] } } })
      .eq("id", id);
    if (error) return new Response(error.message, { status: 500 });
    return new Response(null, { status: 204 });
  }
  const existing = getDoc(id);
  if (!existing) return new Response("Not found", { status: 404 });
  const updated = upsertDoc({ ...existing, ...body });
  return Response.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerSupabase();
  if (supabase) {
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) return new Response(error.message, { status: 500 });
    return new Response(null, { status: 204 });
  }
  const ok = removeDoc(id);
  return new Response(null, { status: ok ? 204 : 404 });
}


