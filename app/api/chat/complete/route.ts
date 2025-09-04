import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
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

// Model configuration
const modelMap: Record<string, { provider: string; model: string }> = {
  "auto": { provider: "openai", model: "gpt-4o-mini" }, // Default smart selection
  "gpt-4o": { provider: "openai", model: "gpt-4o" },
  "gpt-4o-mini": { provider: "openai", model: "gpt-4o-mini" },
  "claude-3.5-sonnet": { provider: "anthropic", model: "claude-3-5-sonnet-20241022" },
  "claude-3-haiku": { provider: "anthropic", model: "claude-3-haiku-20240307" },
};

export async function POST(req: Request) {
  const { message, model: requestedModel = "auto" } = (await req.json()) as { message: string; model?: string };
  if (!message || message.trim().length === 0) return new Response("Missing message", { status: 400 });

  // Get model configuration
  const modelConfig = modelMap[requestedModel] || modelMap["auto"];
  const { provider, model } = modelConfig;

  const sources = await getKnowledgeBase(message);

  // Initialize the appropriate AI client based on provider
  let response: any;
  
  if (provider === "anthropic") {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      // Fallback: echo with first sources as citations
      return Response.json({
        content: `Mock response (${model}): ${message}`,
        citations: sources.map((s) => ({ id: s.id, title: s.title })),
      });
    }
    
    const anthropic = new Anthropic({ apiKey: anthropicKey });
    response = await handleAnthropicRequest(anthropic, model, message, sources);
  } else {
    // Default to OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      // Fallback: echo with first sources as citations
      return Response.json({
        content: `Mock response (${model}): ${message}`,
        citations: sources.map((s) => ({ id: s.id, title: s.title })),
      });
    }
    
    const openai = new OpenAI({ apiKey: openaiKey });
    response = await handleOpenAIRequest(openai, model, message, sources);
  }

  return new Response(JSON.stringify(response), { 
    headers: { "Content-Type": "application/json" } 
  });
}

async function handleOpenAIRequest(openai: OpenAI, model: string, message: string, sources: KBSource[]) {
  
  // Enhanced RAG system prompt for intelligent responses
  const system = `You are an intelligent business and data analysis assistant. Provide comprehensive, well-formatted responses that help users understand complex topics.

## Response Guidelines:
1. **Natural Intelligence**: Never mention "documents provided" or "knowledge base" - respond as if you naturally know this information
2. **Professional Formatting**: Use markdown formatting extensively:
   - **Bold** for key terms and headings
   - Bullet points for lists
   - Code blocks for technical content
   - Headers (##, ###) for structure
3. **Visual Structure**: Organize information clearly with:
   - Clear sections and subsections
   - Step-by-step processes
   - Key insights highlighted in bold
4. **Data Visualizations**: When presenting numerical data, trends, or comparisons, CREATE CHARTS using this format:
   \`\`\`chart
   {
     "type": "bar|line|pie|area",
     "title": "Chart Title",
     "data": [{"name": "Category", "value": 123}, ...],
     "xKey": "name", 
     "yKey": "value"
   }
   \`\`\`
   - Use "bar" for comparisons between categories
   - Use "line" for trends over time
   - Use "pie" for proportional data
   - Use "area" for cumulative data over time

5. **Tables**: When presenting structured data, comparisons, or lists, CREATE TABLES using this format:
   \`\`\`table
   {
     "title": "Table Title",
     "headers": ["Column 1", "Column 2", "Column 3"],
     "rows": [
       ["Data 1", "Data 2", "Data 3"],
       ["Data 4", "Data 5", "Data 6"]
     ],
     "caption": "Optional table description"
   }
   \`\`\`
   - Use tables for comparing features, metrics, or structured information
   - Always include headers and rows arrays
   - Make data easily scannable and well-organized
   - IMPORTANT: Use this JSON table format instead of markdown tables

6. **Engaging Tone**: Be conversational yet professional, like a knowledgeable colleague

## When Information is Available:
- Integrate seamlessly without revealing sources
- Provide comprehensive analysis and insights
- Create tables, comparisons, and structured summaries
- Add context and business implications

## When Information is Limited:
- Provide helpful general guidance without mentioning missing documents
- Focus on best practices and industry standards
- Offer actionable advice based on common scenarios

Return a JSON object with shape {"content": string, "citations": []}. Do not include citations unless specifically requested - focus on seamless, natural responses.`;

  const kbText = sources
    .map((s, i) => `[#${i + 1}] (${s.id}) ${s.title}\n${s.snippet}`)
    .join("\n\n");
    
  const user = sources.length > 0 
    ? `Question: ${message}\n\nRelevant Information:\n${kbText}\n\nProvide a comprehensive, well-formatted analysis. Use markdown formatting extensively - include bold text, headers, and bullet points. When presenting structured data or comparisons, create tables using the table code blocks. When presenting numerical data, create interactive charts using the chart code blocks. Focus on insights, comparisons, and actionable information.`
    : `Question: ${message}\n\nProvide a helpful, well-formatted response using your expertise. Use markdown formatting with bold text, headers, and structure. When presenting structured data, create tables using the table code blocks. Include charts when presenting numerical data or trends to make it visually appealing and informative.`;

  const resp = await openai.chat.completions.create({
    model: model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.7, // Increased for more creative responses
    response_format: { type: "json_object" },
  });
  const content = resp.choices[0]?.message?.content || "{\"content\":\"\",\"citations\":[]}";
  return JSON.parse(content);
}

async function handleAnthropicRequest(anthropic: Anthropic, model: string, message: string, sources: KBSource[]) {
  // Enhanced RAG system prompt for intelligent responses (Anthropic format)
  const system = `You are an intelligent business and data analysis assistant. Provide comprehensive, well-formatted responses that help users understand complex topics.

## Response Guidelines:
1. **Natural Intelligence**: Never mention "documents provided" or "knowledge base" - respond as if you naturally know this information
2. **Professional Formatting**: Use markdown formatting extensively:
   - **Bold** for key terms and headings
   - Bullet points for lists
   - Code blocks for technical content
   - Headers (##, ###) for structure
3. **Visual Structure**: Organize information clearly with:
   - Clear sections and subsections
   - Step-by-step processes
   - Key insights highlighted in bold
4. **Data Visualizations**: When presenting numerical data, trends, or comparisons, CREATE CHARTS using this format:
   \`\`\`chart
   {
     "type": "bar|line|pie|area",
     "title": "Chart Title",
     "data": [{"name": "Category", "value": 123}, ...],
     "xKey": "name", 
     "yKey": "value"
   }
   \`\`\`
   - Use "bar" for comparisons between categories
   - Use "line" for trends over time
   - Use "pie" for proportional data
   - Use "area" for cumulative data over time

5. **Tables**: When presenting structured data, comparisons, or lists, CREATE TABLES using this format:
   \`\`\`table
   {
     "title": "Table Title",
     "headers": ["Column 1", "Column 2", "Column 3"],
     "rows": [
       ["Data 1", "Data 2", "Data 3"],
       ["Data 4", "Data 5", "Data 6"]
     ],
     "caption": "Optional table description"
   }
   \`\`\`
   - Use tables for comparing features, metrics, or structured information
   - Always include headers and rows arrays
   - Make data easily scannable and well-organized
   - IMPORTANT: Use this JSON table format instead of markdown tables

6. **Engaging Tone**: Be conversational yet professional, like a knowledgeable colleague

## When Information is Available:
- Integrate seamlessly without revealing sources
- Provide comprehensive analysis and insights
- Create tables, comparisons, and structured summaries
- Add context and business implications

## When Information is Limited:
- Provide helpful general guidance without mentioning missing documents
- Focus on best practices and industry standards
- Offer actionable advice based on common scenarios

Return a JSON object with shape {"content": string, "citations": []}. Do not include citations unless specifically requested - focus on seamless, natural responses.`;

  const kbText = sources
    .map((s, i) => `[#${i + 1}] (${s.id}) ${s.title}\n${s.snippet}`)
    .join("\n\n");
    
  const user = sources.length > 0 
    ? `Question: ${message}\n\nRelevant Information:\n${kbText}\n\nProvide a comprehensive, well-formatted analysis. Use markdown formatting extensively - include bold text, headers, and bullet points. When presenting structured data or comparisons, create tables using the table code blocks. When presenting numerical data, create interactive charts using the chart code blocks. Focus on insights, comparisons, and actionable information.`
    : `Question: ${message}\n\nProvide a helpful, well-formatted response using your expertise. Use markdown formatting with bold text, headers, and structure. When presenting structured data, create tables using the table code blocks. Include charts when presenting numerical data or trends to make it visually appealing and informative.`;

  const resp = await anthropic.messages.create({
    model: model,
    max_tokens: 4000,
    system: system,
    messages: [
      { role: "user", content: user },
    ],
    temperature: 0.7,
  });

  // Extract text content from Anthropic response
  const textContent = resp.content
    .filter((block) => block.type === "text")
    .map((block: any) => block.text)
    .join("");

  // Try to parse as JSON, fallback to wrapping in content field
  try {
    return JSON.parse(textContent);
  } catch {
    return { content: textContent, citations: [] };
  }
}


