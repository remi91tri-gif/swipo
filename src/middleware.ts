import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|brand/|icon.svg|apple-icon.png|manifest.webmanifest|favicon.ico|sw.js|robots.txt|sitemap.xml|opengraph-image|twitter-image|google[0-9a-z]+\\.html).*)"],
};
