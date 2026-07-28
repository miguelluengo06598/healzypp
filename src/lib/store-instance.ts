// STORE_INSTANCE_ID separa datos de tracking entre despliegues de esta
// misma plantilla que comparten Supabase (p.ej. local dev vs producción).
// Es el id (UUID) de stores en el dashboard SaaS — lo genera automáticamente
// al conectar esta instancia como tienda desde "Conectar tienda nueva",
// junto a DASHBOARD_API_TOKEN. No es un texto libre inventado a mano: cada
// conexión tiene el suyo, único por construcción.
// Solo afecta a tracking_sessions y a lo que cuelga de una sesión
// (page_views, product_views, cart_actions, checkouts, conversions):
// pedidos, productos, etc. son datos reales de negocio, no de un entorno de
// prueba, y no se filtran por instancia.
export function getStoreInstanceId(): string | null {
  return process.env.STORE_INSTANCE_ID?.trim() || null
}
