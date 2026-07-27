import { NextRequest, NextResponse } from "next/server";
import { newArrivalsData } from "@/data/products";
import { productPath } from "@/lib/site";

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

  // ── URL canónica de producto: 301 si el slug no coincide ────────────────────
  // El redirect debe vivir aquí (no solo en la página): Next 16 hace streaming
  // del shell antes de que la página renderice, así que un permanentRedirect
  // dentro del componente ya no puede cambiar el status HTTP (queda como
  // redirect client-side). El middleware corre antes de todo y emite un 301 real.
  //
  // ⚠️ DEPENDENCIA DEL CATÁLOGO ESTÁTICO (src/data/products.ts): al migrar el
  // catálogo a Supabase, este bloque DEBE migrar a la vez que la página de
  // producto — si la página usa títulos de Supabase y esto sigue leyendo el
  // mock, un cambio de título produce un BUCLE de redirects (el middleware
  // redirige al slug viejo y la página al nuevo).
  const productMatch = pathname.match(/^\/shop\/product\/(\d+)(?:\/.*)?$/);
  if (productMatch) {
    const product = newArrivalsData.find((p) => p.id === Number(productMatch[1]));
    if (product) {
      const canonicalPath = productPath(product.id, product.title);
      let decodedPathname = pathname;
      try {
        decodedPathname = decodeURIComponent(pathname);
      } catch {}
      if (decodedPathname !== canonicalPath) {
        const url = req.nextUrl.clone();
        url.pathname = canonicalPath;
        return NextResponse.redirect(url, 301);
      }
    }
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
