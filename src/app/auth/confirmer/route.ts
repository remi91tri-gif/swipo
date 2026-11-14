import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Arrivée depuis un lien reçu par e-mail (mot de passe oublié, confirmation d'adresse).
 * Fonctionne avec le jeton du lien (token_hash, valable sur n'importe quel appareil)
 * comme avec le code renvoyé par Supabase (même navigateur).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const raw = searchParams.get("next") ?? "/aujourdhui";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/aujourdhui";
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const supabase = await createClient();

  let ok = false;
  if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  else if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;

  if (ok) return NextResponse.redirect(new URL(next, origin));
  const fail = new URL(next === "/nouveau-mot-de-passe" ? "/mot-de-passe-oublie" : "/connexion", origin);
  fail.searchParams.set("lien", "expire");
  return NextResponse.redirect(fail);
}
