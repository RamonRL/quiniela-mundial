import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolvePostSignInRedirect } from "@/lib/auth/post-signin";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL(`/auth/error?reason=missing_code`, request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/error?reason=${encodeURIComponent(error.message)}`, request.url),
    );
  }

  // Profile creation, invite-cookie consumption y decisión de onboarding vs
  // destino están centralizados en este helper, compartido con el flow de
  // OTP por email — un solo sitio que mantener al cambiar la post-auth.
  const redirectTo = await resolvePostSignInRedirect(next);
  return NextResponse.redirect(new URL(redirectTo, request.url));
}
