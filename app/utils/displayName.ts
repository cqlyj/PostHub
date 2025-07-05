import { supabase } from "@/lib/supabaseClient";
import { resolveENS } from "@/utils/ens";

// Simple in-memory cache so we don't hit Supabase/ENS repeatedly
const cache = new Map<string, string>();

/**
 * Resolve a wallet address to the preferred display name.
 * 1. User-defined username (table: `usernames` → { wallet_address, username })
 * 2. ENS name (if any)
 * 3. Truncated wallet address (0xabc…def)
 */
export async function getDisplayName(address?: string | null): Promise<string> {
  if (!address) return "";
  const addr = address.toLowerCase();
  if (cache.has(addr)) return cache.get(addr)!;

  // 1. Usernames table lookup
  const { data: profile } = await supabase
    .from("usernames")
    .select("username")
    .eq("wallet_address", addr)
    .maybeSingle();

  let name: string | null = profile?.username ?? null;

  // 2. ENS fallback
  if (!name) {
    try {
      name = await resolveENS(addr);
    } catch {
      /* ignore */
    }
  }

  // 3. Truncated address as last resort
  if (!name) {
    name = `${addr.substring(0, 6)}…${addr.slice(-4)}`;
  }

  cache.set(addr, name);
  return name;
}

/**
 * Invalidate cache entry (or all entries if no address supplied) – useful after the user updates their username.
 */
export function invalidateDisplayNameCache(address?: string) {
  if (address) cache.delete(address.toLowerCase());
  else cache.clear();
}
