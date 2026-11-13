"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient> | null = null;

/** Client Supabase du navigateur (envoi des photos directement vers le stockage). */
export function browserClient() {
  client ??= createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}
