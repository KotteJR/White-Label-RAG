import { NextRequest } from "next/server";
export const runtime = "nodejs";
import mammoth from "mammoth";
import JSZip from "jszip";
import OpenAI from "openai";
import { upsertDoc } from "@/lib/docStore";
import { getServerSupabase } from "@/lib/supabaseServer";
import { cookies } from "next/headers";

// PDF text extraction using pdfjs-dist (pure JS, no native deps)
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // Use ESM build
    // @ts-ignore - types not shipped for deep path
    const pdfjs: any = await import("pdfjs-dist/build/pdf.mjs");
    const loadingTask = pdfjs.getDocument({ data: buffer });
    const pdfDoc = await loadingTask.promise;
    let combined = "";
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = (textContent.items || [])
        .map((item: any) => (typeof item.str === "string" ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (pageText) combined += pageText + "\n\n";
    }
    await pdfDoc.destroy();
    return combined.trim();
  } catch (err) {
    console.error("pdfjs-dist extraction failed:", err);
    return ""; // Fallback to empty, caller will handle
  }
}

type Standardized = {
  title: string;
  sections: { heading: string; body: string }[];
  metadata?: Record<string, string>;
};

async function extractTxtFromFile(name: string, buffer: Buffer): Promise<string> {
  const lower = name.toLowerCase();
  if (lower.endsWith(".txt")) return buffer.toString("utf8");

  if (lower.endsWith(".pdf")) {
    console.log(`Extracting text from PDF (pdfjs): ${name}`);
    const text = await extractTextFromPdf(buffer);
    if (text && text.trim().length > 0) return text;
    // If still empty (scanned PDF), store minimal message so OpenAI can still structure metadata
    return `PDF Document: ${name}\n\nThis PDF appears to be image-based (no selectable text).`;
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
  console.log(`OpenAI API key available: ${!!apiKey}`);
  
  if (!apiKey) {
    console.log("No OpenAI API key - using fallback mock");
    // Fallback mock
    return {
      title: fileName,
      sections: [{ heading: "Content", body: input.slice(0, 4000) }],
      metadata: { note: "OpenAI API key not set - mock output" },
    };
  }

  try {
    console.log(`Calling OpenAI API for ${fileName}...`);
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
    console.log(`OpenAI response received for ${fileName}`);
    const parsed = JSON.parse(content) as Standardized;
    return parsed;
  } catch (error) {
    console.error(`OpenAI API error for ${fileName}:`, error);
    // Return fallback on error
    return {
      title: fileName,
      sections: [{ heading: "Content", body: input.slice(0, 4000) }],
      metadata: { note: "OpenAI processing failed - using raw content", error: String(error) },
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get("authenticated")?.value === "true";
    const userEmail = cookieStore.get("email")?.value ? decodeURIComponent(cookieStore.get("email")!.value) : null;
    
    if (!isAuthenticated || !userEmail) {
      return new Response("Unauthorized", { status: 401 });
    }

    const form = await req.formData();
    const files = form.getAll("files");
    if (!files.length) return new Response("No files uploaded", { status: 400 });

    const supabase = getServerSupabase();
    console.log(`Supabase client available: ${!!supabase}`);
    const results: any[] = [];

    for (const f of files) {
      if (!(f instanceof File)) {
        results.push({ name: "unknown", status: "error", error: "Invalid file object" });
        continue;
      }

              console.log(`Processing file: ${f.name}, type: ${f.type}, size: ${f.size}`);

        try {
          const arrayBuf = await f.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          
          console.log(`Extracting text from ${f.name}...`);
          let text = await extractTxtFromFile(f.name, buffer);
          console.log(`Extracted text length: ${text.length}`);

          // OCR fallback for image-based PDFs using OCR.space (simple HTTP API)
          if (text.trim().length === 0 && f.name.toLowerCase().endsWith('.pdf')) {
            try {
              const ocrKey = process.env.OCR_SPACE_API_KEY || 'helloworld'; // demo key if not provided
              console.log('Text empty; trying OCR.space fallback (base64)...');
              const base64 = `data:application/pdf;base64,${buffer.toString('base64')}`;
              const params = new URLSearchParams();
              params.append('language', 'eng');
              params.append('isOverlayRequired', 'false');
              params.append('OCREngine', '2');
              params.append('base64Image', base64);
              const ocrResp = await fetch('https://api.ocr.space/parse/image', {
                method: 'POST',
                headers: { apikey: ocrKey },
                body: params as any,
              });
              const ocrJson = await ocrResp.json();
              const parsedText = ocrJson?.ParsedResults?.[0]?.ParsedText || '';
              if (parsedText.trim().length > 0) {
                text = parsedText;
                console.log(`OCR.space extracted length: ${text.length}`);
              } else {
                console.warn('OCR.space returned empty text');
              }
            } catch (ocrErr) {
              console.error('OCR.space fallback failed:', ocrErr);
            }
          }
          
          console.log(`Standardizing with OpenAI for ${f.name}...`);
          const json = await standardizeWithOpenAI(text, f.name);
          console.log(`Generated JSON:`, JSON.stringify(json, null, 2));

        // Store standardized JSON to Supabase if configured
        if (supabase) {
          console.log(`Storing to Supabase: ${f.name}`);
          const { data, error } = await supabase
            .from("documents")
            .insert({ 
              filename: f.name, 
              content_json: json,
              user_id: "00000000-0000-0000-0000-000000000001" // Default admin user for now
            })
            .select()
            .single();
          if (error) throw error;
          results.push({ id: data.id, name: f.name, status: "success" });
          
          // Update in-memory list with Supabase data
          upsertDoc({
            id: data.id,
            title: f.name,
            version: 1,
            status: "Embedded",
            uploadedAt: data.created_at || new Date().toISOString(),
            tags: [],
          });
        } else {
          console.log(`Mock storage for: ${f.name}`);
          const mockId = crypto.randomUUID();
          results.push({ id: mockId, name: f.name, status: "success" });
          
          // Update in-memory list with mock data
          upsertDoc({
            id: mockId,
            title: f.name,
            version: 1,
            status: "Embedded",
            uploadedAt: new Date().toISOString(),
            tags: [],
          });
        }
        
        console.log(`Successfully processed: ${f.name}`);
      } catch (e: any) {
        console.error(`Error processing file ${f.name}:`, e);
        results.push({ 
          name: f.name, 
          status: "error", 
          error: e?.message || String(e) 
        });
      }
    }

    return Response.json({ results });
  } catch (e: any) {
    console.error("Upload API error:", e);
    return new Response(`Upload failed: ${e?.message || String(e)}`, { status: 500 });
  }
}


