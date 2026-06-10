/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

// Content-Security-Policy
// 'unsafe-eval' solo en dev (Next.js lo necesita en desarrollo)
const csp = [
  "default-src 'self'",
  // Scripts: propio dominio + Stripe + Mapbox
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://js.stripe.com https://api.mapbox.com https://events.mapbox.com`,
  // Estilos: propio dominio + inline (Tailwind/Stripe Elements los necesita)
  "style-src 'self' 'unsafe-inline'",
  // Imágenes: propio dominio + Supabase Storage + Stripe + data URIs
  "img-src 'self' data: blob: https://achzefxiylozwnuglvyz.supabase.co https://*.stripe.com",
  // Fuentes
  "font-src 'self' data:",
  // Conexiones: propio dominio + Stripe + Supabase + Mapbox
  "connect-src 'self' https://api.stripe.com https://*.supabase.co https://api.mapbox.com https://events.mapbox.com",
  // iframes: solo Stripe (para 3D Secure)
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  // Formularios solo al propio dominio
  "form-action 'self'",
  // No permite ser embebido en iframes de otros dominios
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  // Evita que el navegador detecte el tipo MIME incorrectamente
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Bloquea el clickjacking
  { key: "X-Frame-Options", value: "DENY" },
  // Política de referrer estricta
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deshabilita funcionalidades del navegador innecesarias
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HSTS — solo HTTPS en producción (incluye subdominios)
  ...(!isDev
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
  // Content-Security-Policy
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        // Supabase Storage — para imágenes de producto subidas desde el panel
        protocol: "https",
        hostname: "achzefxiylozwnuglvyz.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
