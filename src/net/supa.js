// Un seul client Supabase pour toute l'appli : temps réel (Broadcast + Presence) et comptes (Auth + table profiles).
import { SUPABASE_URL, SUPABASE_KEY } from "../config.js";

let supa = null;
export async function getSupa() {
  if (!supa) {
    const { createClient } = await import("@supabase/supabase-js");
    supa = createClient(SUPABASE_URL, SUPABASE_KEY, {
      realtime: { params: { eventsPerSecond: 20 } },
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return supa;
}
