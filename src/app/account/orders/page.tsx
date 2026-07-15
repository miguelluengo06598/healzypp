import { Metadata } from "next";
import { ShoppingBag, AlertCircle } from "lucide-react";
import { getOrdersByUser } from "@/lib/db/user-orders";
import OrderTimeline from "@/sections/OrderTimeline";
import type { OrderStatusEnum } from "@/types/database.types";

export const metadata: Metadata = {
  title: "Mis pedidos | HEALZYP",
};

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, { label: string; className: string }> = {
  pendiente: { label: "Pendiente de pago", className: "bg-amber-100 text-amber-800" },
  pagado: { label: "Pagado", className: "bg-emerald-100 text-emerald-800" },
  procesando: { label: "Procesando", className: "bg-emerald-100 text-emerald-800" },
  enviado: { label: "Enviado", className: "bg-blue-100 text-blue-800" },
  entregado: { label: "Entregado", className: "bg-emerald-100 text-emerald-800" },
  fallido: { label: "Pago fallido", className: "bg-red-100 text-red-700" },
  cancelado: { label: "Cancelado", className: "bg-gray-200 text-gray-600" },
  reembolsado: { label: "Reembolsado", className: "bg-gray-200 text-gray-600" },
};

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtEur(n: number): string {
  return Number(n).toFixed(2).replace(".", ",") + " €";
}

export default async function OrdersPage() {
  const orders = await getOrdersByUser();

  // Error de consulta (distinto de "sin pedidos")
  if (orders === null) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-4">Mis pedidos</h2>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-gray-900 font-medium">No pudimos cargar tus pedidos</p>
          <p className="text-sm text-gray-500 mt-1">
            Inténtalo de nuevo en unos minutos.
          </p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-4">Mis pedidos</h2>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <ShoppingBag className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-900 font-medium">Aún no tienes pedidos</p>
          <p className="text-sm text-gray-500 mt-1">
            Cuando realices una compra, aparecerá aquí.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-6">Mis pedidos</h2>

      <div className="flex flex-col gap-8">
        {orders.map((order) => {
          const badge =
            ESTADO_BADGE[order.estado] ?? {
              label: order.estado,
              className: "bg-gray-200 text-gray-600",
            };

          // El pedido alcanzó 'pagado' (o un estado posterior de la escalera):
          // fecha_actualizacion es la mejor aproximación a la fecha de pago
          // mientras los pedidos antiguos no tengan evento 'pagado' en tracking.
          const reachedPaid = ["pagado", "procesando", "enviado", "entregado"].includes(
            order.estado
          );

          return (
            <article
              key={order.id}
              className="border border-gray-100 rounded-2xl overflow-hidden"
            >
              {/* ── Cabecera del pedido ── */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-gray-50">
                <div>
                  <p className="text-sm font-bold text-black">
                    Pedido {order.numero_pedido}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {fmtFecha(order.fecha_creacion)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                  <span className="text-sm font-bold text-black">
                    {fmtEur(order.total)}
                  </span>
                </div>
              </div>

              {/* ── Líneas de producto ── */}
              <ul className="px-5 py-3 border-b border-gray-100">
                {order.order_items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between py-1 text-sm"
                  >
                    <span className="text-gray-700">
                      {item.nombre_producto}
                      {item.cantidad > 1 && (
                        <span className="text-gray-400"> × {item.cantidad}</span>
                      )}
                    </span>
                    <span className="text-gray-500">{fmtEur(item.precio_total)}</span>
                  </li>
                ))}
              </ul>

              {/* ── Timeline honesto (datos reales) ── */}
              <div className="p-4 sm:p-5">
                <OrderTimeline
                  estado={order.estado as OrderStatusEnum}
                  confirmedAt={order.fecha_creacion}
                  paidAt={reachedPaid ? order.fecha_actualizacion : null}
                  trackingEvents={order.order_tracking}
                  className="border-0 shadow-none"
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
