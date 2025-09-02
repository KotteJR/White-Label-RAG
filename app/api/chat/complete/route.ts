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
  
  // Enhanced RAG system prompt for intelligent responses
  const system = `You are an intelligent assistant with access to a knowledge base of uploaded documents. Your role is to provide helpful, accurate, and creative responses.

## Response Guidelines:
1. **Primary Source**: Use information from the provided knowledge base when available and relevant
2. **Creative Analysis**: Connect ideas, provide insights, make comparisons, and offer thoughtful analysis based on the documents
3. **General Knowledge**: When documents don't fully cover a topic, you can supplement with general knowledge while clearly distinguishing what comes from documents vs. general knowledge
4. **Fallback**: If no relevant documents exist, politely inform the user and suggest they upload relevant documents, but still try to be helpful with general guidance

## Response Style:
- Be conversational and engaging
- Provide context and explanations
- Use examples when helpful
- Structure longer responses with clear sections
- Show connections between different pieces of information

Return a JSON object with shape {"content": string, "citations": [{"id": string, "title": string}]}. Include citations for any information that comes directly from the knowledge base documents.`;

  const kbText = sources
    .map((s, i) => `[#${i + 1}] (${s.id}) ${s.title}\n${s.snippet}`)
    .join("\n\n");
    
  const user = sources.length > 0 
    ? `Question: ${message}\n\nKnowledge Base Documents:\n${kbText}\n\nPlease provide a comprehensive answer using the documents above as your primary source, but feel free to add context, analysis, and insights. If the documents don't fully address the question, you can supplement with relevant general knowledge while noting the distinction.`
    : `Question: ${message}\n\nNo relevant documents found in the knowledge base. Please provide a helpful response based on general knowledge and suggest that the user might want to upload relevant documents for more specific information.`;

  const resp = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.7, // Increased for more creative responses
    response_format: { type: "json_object" },
  });
  const content = resp.choices[0]?.message?.content || "{\"content\":\"\",\"citations\":[]}";
  return new Response(content, { headers: { "Content-Type": "application/json" } });
}


