import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  // Always start with a passthrough response
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars are not present in the deployment environment, do NOT crash the Edge function.
  // This prevents MIDDLEWARE_INVOCATION_FAILED and allows the app to load (though auth refresh won't run).
  if (!url || !anonKey) {
    console.error(
      "Supabase env vars missing in proxy. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel."
    );
    return response;
  }

  try {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    // Refresh auth cookies if needed
    await supabase.auth.getUser();
  } catch (e) {
    // Never take down the site due to a middleware/proxy auth refresh failure
    console.error("Proxy Supabase auth refresh failed:", e);
  }

  return response;
}

export const config = {
  matcher: [
    // run proxy on all routes except Next internals/static
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
