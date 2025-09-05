import { createClient } from "@supabase/supabase-js";

export function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log("Supabase config check:", {
    hasUrl: !!url,
    hasServiceKey: !!service,
    url: url ? `${url.substring(0, 20)}...` : 'missing'
  });
  
  if (!url || !service) {
    console.log("Supabase not configured, using fallback storage");
    return null;
  }
  
  try {
    const client = createClient(url, service);
    console.log("Supabase client created successfully");
    return client;
  } catch (error) {
    console.error("Failed to create Supabase client:", error);
    return null;
  }
}


