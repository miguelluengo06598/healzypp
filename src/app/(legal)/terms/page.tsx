import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Términos y Condiciones | HEALZYP",
  description:
    "Condiciones generales de contratación aplicables a todas las compras realizadas en HEALZYP.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Términos y Condiciones"
      subtitle="Condiciones generales de contratación que regulan la compra de productos en HEALZYP. Al realizar un pedido, aceptas estas condiciones en su totalidad."
      lastUpdated="22 de abril de 2026"
      breadcrumb={[{ label: "Términos y Condiciones", href: "/terms" }]}
      sections={[
        {
          title: "Partes del Contrato e Identificación",
          content: (
            <>
              <p>
                Las presentes condiciones regulan la relación contractual de
                compraventa entre:
              </p>
              <ul className="mt-2 space-y-1 list-none">
                <li>
                  <strong>Vendedor:</strong> Nombre Tienda S.L., CIF B-XXXXXXXX,
                  con domicilio en Calle Ejemplo, 1 — 28001 Madrid.
                </li>
                <li>
                  <strong>Comprador:</strong> cualquier persona física o jurídica
                  que realice un pedido a través de este sitio web.
                </li>
              </ul>
              <p className="mt-3">
                Para realizar una compra debes ser mayor de 18 años y tener
                capacidad legal para contratar.
              </p>
            </>
          ),
        },
        {
          title: "Proceso de Compra",
          content: (
            <>
              <p>El proceso de compra consta de los siguientes pasos:</p>
              <ol className="mt-2 space-y-1.5 list-decimal list-inside">
                <li>Selección del producto y del formato deseado.</li>
                <li>
                  Introducción de los datos de envío y método de pago en el
                  formulario de checkout.
                </li>
                <li>
                  Revisión del resumen del pedido y confirmación de la compra.
                </li>
                <li>
                  Recepción de confirmación por correo electrónico o SMS,
                  incluyendo el número de pedido.
                </li>
              </ol>
              <p className="mt-3">
                El contrato se perfecciona en el momento en que recibes la
                confirmación de pedido. Conserva ese mensaje como justificante.
              </p>
            </>
          ),
        },
        {
          title: "Precios, Impuestos y Disponibilidad",
          content: (
            <>
              <p>
                Todos los precios mostrados en el sitio web incluyen el IVA
                aplicable conforme a la legislación española vigente. Los gastos
                de envío, si los hubiere, se indicarán antes de confirmar el
                pedido.
              </p>
              <p>
                Nos reservamos el derecho a modificar los precios en cualquier
                momento, si bien los cambios no afectarán a los pedidos ya
                confirmados. En caso de error de precio manifiesto, te
                contactaremos para ofrecerte la opción de confirmar el pedido al
                precio correcto o cancelarlo sin coste.
              </p>
            </>
          ),
        },
        {
          title: "Métodos de Pago",
          content: (
            <>
              <p>Aceptamos los siguientes métodos de pago:</p>
              <ul className="mt-2 space-y-1.5 list-disc list-inside">
                <li>
                  <strong>Pago con tarjeta</strong> (Visa, Mastercard, AMEX) —
                  procesado de forma segura por Stripe, conforme a PCI DSS
                  Nivel 1.
                </li>
                <li>
                  <strong>Contra reembolso (COD)</strong> — pago en efectivo al
                  repartidor en el momento de la entrega.
                </li>
              </ul>
              <p className="mt-3">
                Nos reservamos el derecho a rechazar pedidos que presenten
                indicios de fraude o que no superen nuestras verificaciones de
                seguridad.
              </p>
            </>
          ),
        },
        {
          title: "Envío y Plazos de Entrega",
          content: (
            <>
              <p>
                Realizamos envíos únicamente a territorio español peninsular,
                Islas Baleares, Islas Canarias, Ceuta y Melilla. El plazo
                estimado de entrega es de <strong>2 a 5 días laborables</strong>{" "}
                desde la confirmación del pedido.
              </p>
              <p>
                El riesgo sobre los productos se transfiere al comprador en el
                momento de la entrega. Si el transportista no puede localizar la
                dirección indicada, intentará la entrega dos veces adicionales
                antes de devolver el paquete al almacén.
              </p>
            </>
          ),
        },
        {
          title: "Derecho de Desistimiento",
          content: (
            <>
              <p>
                De acuerdo con el Real Decreto Legislativo 1/2007 (TRLGDCU),
                tienes derecho a desistir del contrato en un plazo de{" "}
                <strong>14 días naturales</strong> desde la recepción del
                producto, sin necesidad de justificación.
              </p>
              <p>
                Para ejercer este derecho, notifícanos tu decisión a{" "}
                <a
                  href="mailto:devoluciones@shopco.com"
                  className="text-[#487D26] hover:underline"
                >
                  devoluciones@shopco.com
                </a>{" "}
                indicando el número de pedido. Los gastos de devolución corren a
                cargo del comprador salvo que el producto presente un defecto.
                El reembolso se realizará en un plazo máximo de 14 días desde
                la recepción del producto devuelto.
              </p>
              <p>
                <strong>Excepciones:</strong> no aplica el derecho de
                desistimiento a productos sellados que hayan sido abiertos por
                razones de salud o higiene.
              </p>
            </>
          ),
        },
        {
          title: "Garantías y Productos Defectuosos",
          content: (
            <p>
              Todos nuestros productos están sujetos a la garantía legal de
              conformidad de <strong>3 años</strong> prevista en el TRLGDCU. Si
              recibes un producto defectuoso o diferente al pedido, contáctanos
              en un plazo de 2 meses desde que detectes la disconformidad. En
              ese caso, nos haremos cargo de la recogida y la reposición o
              reembolso sin coste alguno para ti.
            </p>
          ),
        },
        {
          title: "Limitación de Responsabilidad",
          content: (
            <p>
              No seremos responsables de daños indirectos, pérdidas de beneficios
              o perjuicios derivados del uso de nuestros productos más allá de lo
              establecido por la normativa de consumo vigente. Nuestra
              responsabilidad máxima estará limitada al importe del pedido
              afectado.
            </p>
          ),
        },
        {
          title: "Legislación Aplicable y Resolución de Conflictos",
          content: (
            <>
              <p>
                Las presentes condiciones se rigen por la legislación española.
                Para la resolución de controversias, las partes se someten a los
                Juzgados y Tribunales del domicilio del consumidor, conforme al
                art. 52 LEC.
              </p>
              <p>
                Como alternativa, puedes utilizar la plataforma de resolución de
                litigios en línea de la Comisión Europea:{" "}
                <span className="text-[#487D26]">
                  ec.europa.eu/consumers/odr
                </span>
                .
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
