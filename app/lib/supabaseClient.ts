import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase environment variables are not set. Please define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // Keep the websocket connection alive and make sure it always reconnects.
  realtime: {
    // Send a heartbeat every 15 s instead of the default 30 s so that
    // aggressive proxies/browsers don’t close the socket when the app is idle.
    heartbeatIntervalMs: 15_000,
    // Try to reconnect quickly using an exponential back-off, capped at 10 s.
    reconnectAfterMs: (attempt) => Math.min(10_000, attempt * 1_000),
  },
});
