// Client Supabase con la chiave service_role. SOLO lato server (route API):
// non va mai importato da un componente "use client" né esposto al browser.
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin non configurato");
  return createClient(url, key, { auth: { persistSession: false } });
}
