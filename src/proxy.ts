import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Bloquear acceso directo a variables de entorno expuestas por error ──────
  if (pathname.startsWith("/.env") || pathname.startsWith("/env")) {
    return new NextResponse(null, { status: 404 });
  }

  // ── Forzar HTTPS en producción ──────────────────────────────────────────────
  if (
    process.env.NODE_ENV === "production" &&
    req.headers.get("x-forwarded-proto") === "http"
  ) {
    return NextResponse.redirect(
      `https://${req.headers.get("host")}${req.nextUrl.pathname}${req.nextUrl.search}`,
      301
    );
  }

  // ── Proteger rutas de cuenta ────────────────────────────────────────────────
  if (pathname.startsWith("/account")) {
    const sessionCookie = req.cookies.get("healzyp-session")?.value;
    if (!sessionCookie) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/";
      redirectUrl.searchParams.set("auth", "required");
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Aplicar a todas las rutas excepto assets estáticos y _next
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
