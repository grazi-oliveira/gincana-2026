import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  if (error) {
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(error)}`, requestUrl.origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/", requestUrl.origin));
  }

  let response = NextResponse.redirect(new URL(next, requestUrl.origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://cbejsfrgzdjuteoenekn.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      "sb_publishable_k3F8lp0HDmjKdQje9e5",
    {
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
    }
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      new URL(
        `/?auth_error=${encodeURIComponent(exchangeError.message)}`,
        requestUrl.origin
      )
    );
  }

  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
