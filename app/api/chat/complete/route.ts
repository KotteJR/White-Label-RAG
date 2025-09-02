import OpenAI from "openai";
import { getServerSupabase } from "@/lib/supabaseServer";

type KBSource = { id: string; title: string; snippet: string };

async function getKnowledgeBase(query: string): Promise<KBSource[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  
  // Get all documents (could be enhanced with vector search in the future)
  const { data } = await supabase
    .from("documents")
    .select("id, filename, content_json, created_at")
    .order("created_at", { ascending: false })
    .limit(20); // Increased limit for better coverage
    
  if (!data) return [];
  
  const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
  
  const scored = data.map((row: { id: string; filename: string; content_json?: { sections?: { heading?: string; body?: string }[] } }) => {
    const title: string = row.filename || "Untitled";
    const sections = row.content_json?.sections || [];
    const body = sections.map((s) => `${s.heading || ""}\n${s.body || ""}`).join("\n\n");
    
    // More sophisticated scoring
    let score = 0;
    const titleLower = title.toLowerCase();
    const bodyLower = body.toLowerCase();
    
    // Title matches are worth more
    queryTerms.forEach(term => {
      if (titleLower.includes(term)) score += 3;
      if (bodyLower.includes(term)) score += 1;
      
      // Bonus for exact phrases
      if (bodyLower.includes(query.toLowerCase())) score += 2;
    });
    
    // Create snippet with context around matches
    let snippet = body.slice(0, 3000); // Increased snippet size
    
    // Try to find the most relevant section
    for (const section of sections) {
      const sectionText = `${section.heading || ""}\n${section.body || ""}`;
      if (queryTerms.some(term => sectionText.toLowerCase().includes(term))) {
        snippet = sectionText.slice(0, 2000);
        break;
      }
    }
    
    return { id: row.id as string, title, snippet, score } as KBSource & { score: number };
  });
  
  // Return top scoring documents, but include some even if score is 0 (for general context)
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 8) // Increased to 8 documents
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


