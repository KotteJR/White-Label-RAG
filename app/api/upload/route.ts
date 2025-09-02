import { NextRequest } from "next/server";
export const runtime = "nodejs";
import mammoth from "mammoth";
import pdf from "pdf-parse";
import JSZip from "jszip";
import OpenAI from "openai";
import { upsertDoc } from "@/lib/docStore";
import { getServerSupabase } from "@/lib/supabaseServer";

type Standardized = {
  title: string;
  sections: { heading: string; body: string }[];
  metadata?: Record<string, string>;
};

async function extractTxtFromFile(name: string, buffer: Buffer): Promise<string> {
  const lower = name.toLowerCase();
  if (lower.endsWith(".txt")) return buffer.toString("utf8");

  if (lower.endsWith(".pdf")) {
    const data = await pdf(buffer);
    return data.text;
  }

  if (lower.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  if (lower.endsWith(".pptx")) {
    // Parse PPTX slides (XML in zip)
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files).filter((k) => k.match(/^ppt\/slides\/slide\d+\.xml$/));
    const slideTexts: string[] = [];
    for (const f of slideFiles) {
      const xml = await zip.files[f].async("text");
      const text = xml
        .replace(/<a:t>/g, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (text) slideTexts.push(text);
    }
    return slideTexts.join("\n\n");
  }

  throw new Error("Unsupported file type");
}

async function standardizeWithOpenAI(input: string, fileName: string): Promise<Standardized> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Fallback mock
    return {
      title: fileName,
      sections: [{ heading: "Content", body: input.slice(0, 4000) }],
      metadata: { note: "OpenAI API key not set - mock output" },
    };
  }

  const openai = new OpenAI({ apiKey });
  const system =
    "You convert arbitrary unstructured document text into a concise standardized JSON schema: {title:string, sections:[{heading, body}], metadata?:object}. Keep it short but faithful.";
  const user = `Filename: ${fileName}\n\nContent:\n${input.slice(0, 120000)}`;

  const resp = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });
  const content = resp.choices[0]?.message?.content || "{}";
  return JSON.parse(content) as Standardized;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const files = form.getAll("files");
  if (!files.length) return new Response("No files", { status: 400 });

  const supabase = getServerSupabase();

  const results: any[] = [];
  for (const f of files) {
    if (!(f instanceof File)) continue;
    const arrayBuf = await f.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    try {
      const text = await extractTxtFromFile(f.name, buffer);
      const json = await standardizeWithOpenAI(text, f.name);

      // Store standardized JSON to Supabase if configured
      if (supabase) {
        const { data, error } = await supabase
          .from("documents")
          .insert({ filename: f.name, content_json: json })
          .select()
          .single();
        if (error) throw error;
        results.push({ id: data.id, name: f.name, status: "ok" });
      } else {
        results.push({ id: crypto.randomUUID(), name: f.name, status: "mock" });
      }

      // Update in-memory list so UI reflects new doc
      upsertDoc({
        id: crypto.randomUUID(),
        title: f.name,
        version: 1,
        status: "Embedded",
        uploadedAt: new Date().toISOString(),
        tags: [],
      });
    } catch (e: any) {
      results.push({ name: f.name, status: "error", error: e?.message || String(e) });
    }
  }

  return Response.json({ results });
}


