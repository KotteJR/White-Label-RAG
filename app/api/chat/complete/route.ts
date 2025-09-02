import OpenAI from "openai";
import { getServerSupabase } from "@/lib/supabaseServer";

type KBSource = { id: string; title: string; snippet: string };

async function getKnowledgeBase(query: string): Promise<KBSource[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  // Very simple retrieval: last 10 documents; prefer those whose title includes a query term
  const { data } = await supabase
    .from("documents")
    .select("id, filename, content_json, created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  if (!data) return [];
  const q = query.toLowerCase();
  const scored = data.map((row: any) => {
    const title: string = row.filename || "Untitled";
    const sections: any[] = (row.content_json?.sections as any[]) || [];
    const body = sections.map((s) => `${s.heading || ""}\n${s.body || ""}`).join("\n\n").slice(0, 2000);
    const score = title.toLowerCase().includes(q) ? 2 : body.toLowerCase().includes(q) ? 1 : 0;
    return { id: row.id as string, title, snippet: body, score } as KBSource & { score: number };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ id, title, snippet }) => ({ id, title, snippet }));
}

export async function POST(req: Request) {
  const { message } = (await req.json()) as { message: string };
  if (!message || message.trim().length === 0) return new Response("Missing message", { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  const sources = await getKnowledgeBase(message);

  if (!apiKey) {
    // Fallback: echo with first sources as citations
    return Response.json({
      content: `Mock response: ${message}`,
      citations: sources.map((s) => ({ id: s.id, title: s.title })),
    });
  }

  const openai = new OpenAI({ apiKey });
  const system = `You are a helpful assistant. You are given optional knowledge base snippets. Use them to answer concisely. If unsure, say so.
Return a JSON object with shape {"content": string, "citations": [{"id": string, "title": string}]}. Only include citations that informed your answer.`;
  const kbText = sources
    .map((s, i) => `[#${i + 1}] (${s.id}) ${s.title}\n${s.snippet}`)
    .join("\n\n");
  const user = `Question: ${message}\n\nKnowledge Base:\n${kbText || "<empty>"}`;

  const resp = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });
  const content = resp.choices[0]?.message?.content || "{\"content\":\"\",\"citations\":[]}";
  return new Response(content, { headers: { "Content-Type": "application/json" } });
}


