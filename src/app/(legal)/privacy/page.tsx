import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Política de Privacidad | HEALZYP",
  description:
    "Información sobre el tratamiento de tus datos personales conforme al RGPD y la LOPDGDD.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de Privacidad"
      subtitle="Información sobre el tratamiento de tus datos personales conforme al Reglamento General de Protección de Datos (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD)."
      lastUpdated="22 de abril de 2026"
      breadcrumb={[{ label: "Política de Privacidad", href: "/privacy" }]}
      sections={[
        {
          title: "Responsable del Tratamiento",
          content: (
            <>
              <p>
                El responsable del tratamiento de los datos personales recabados
                a través de este sitio web es:
              </p>
              <ul className="mt-2 space-y-1 list-none">
                <li>
                  <strong>Razón social:</strong> Nombre Tienda S.L.
                </li>
                <li>
                  <strong>CIF:</strong> B-XXXXXXXX
                </li>
                <li>
                  <strong>Domicilio:</strong> Calle Ejemplo, 1 — 28001 Madrid,
                  España
                </li>
                <li>
                  <strong>Correo electrónico:</strong>{" "}
                  <a
                    href="mailto:privacidad@shopco.com"
                    className="text-[#487D26] hover:underline"
                  >
                    privacidad@shopco.com
                  </a>
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Datos que Recopilamos",
          content: (
            <>
              <p>
                Recopilamos únicamente los datos necesarios para prestarte el
                servicio solicitado:
              </p>
              <ul className="mt-2 space-y-1.5 list-disc list-inside">
                <li>
                  <strong>Datos de contacto:</strong> nombre completo, número de
                  teléfono y dirección de correo electrónico.
                </li>
                <li>
                  <strong>Datos de envío:</strong> dirección postal, ciudad,
                  provincia y código postal.
                </li>
                <li>
                  <strong>Datos de navegación:</strong> dirección IP, tipo de
                  navegador y páginas visitadas (a través de cookies técnicas).
                </li>
                <li>
                  <strong>Datos de pago:</strong> procesados íntegramente por
                  Stripe. No almacenamos datos de tarjeta en nuestros servidores.
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Base Legal del Tratamiento",
          content: (
            <ul className="space-y-2 list-disc list-inside">
              <li>
                <strong>Ejecución de contrato</strong> (Art. 6.1.b RGPD): para
                gestionar tu pedido, procesar el pago y coordinar el envío.
              </li>
              <li>
                <strong>Interés legítimo</strong> (Art. 6.1.f RGPD): para
                prevenir fraudes y mejorar la experiencia de usuario.
              </li>
              <li>
                <strong>Obligación legal</strong> (Art. 6.1.c RGPD): para
                cumplir con obligaciones contables, fiscales y mercantiles.
              </li>
              <li>
                <strong>Consentimiento</strong> (Art. 6.1.a RGPD): para el
                envío de comunicaciones comerciales, cuando lo hayas otorgado
                expresamente.
              </li>
            </ul>
          ),
        },
        {
          title: "Finalidades del Tratamiento",
          content: (
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Gestionar y tramitar tus pedidos.</li>
              <li>Coordinar la entrega de los productos adquiridos.</li>
              <li>
                Atender solicitudes, consultas o reclamaciones que nos dirijas.
              </li>
              <li>
                Cumplir con las obligaciones legales aplicables (fiscales,
                contables, de consumo).
              </li>
              <li>
                Enviarte comunicaciones comerciales sobre nuestros productos,
                siempre con tu consentimiento previo.
              </li>
            </ul>
          ),
        },
        {
          title: "Conservación de los Datos",
          content: (
            <p>
              Conservaremos tus datos mientras sea necesario para la prestación
              del servicio contratado y, posteriormente, durante los plazos
              legalmente exigidos: 5 años para datos de transacciones comerciales
              (Código de Comercio), 4 años para obligaciones fiscales (Ley
              General Tributaria) y 3 años para datos de comunicaciones
              comerciales contados desde la última interacción.
            </p>
          ),
        },
        {
          title: "Destinatarios y Transferencias Internacionales",
          content: (
            <>
              <p>
                Tus datos podrán ser comunicados a los siguientes terceros,
                únicamente en la medida necesaria para prestar el servicio:
              </p>
              <ul className="mt-2 space-y-1.5 list-disc list-inside">
                <li>
                  <strong>Stripe Payments Europe, Ltd.</strong> — procesador de
                  pagos (con adecuadas garantías RGPD).
                </li>
                <li>
                  <strong>Transportistas y mensajerías</strong> — para la
                  entrega de pedidos en España.
                </li>
                <li>
                  <strong>Supabase Inc.</strong> — proveedor de base de datos y
                  autenticación (servidores en la UE).
                </li>
              </ul>
              <p className="mt-3">
                No realizamos transferencias internacionales de datos fuera del
                Espacio Económico Europeo sin garantías adecuadas.
              </p>
            </>
          ),
        },
        {
          title: "Tus Derechos",
          content: (
            <>
              <p>
                De acuerdo con el RGPD, puedes ejercer en cualquier momento los
                siguientes derechos:
              </p>
              <ul className="mt-2 space-y-1.5 list-disc list-inside">
                <li>
                  <strong>Acceso:</strong> conocer qué datos tratamos sobre ti.
                </li>
                <li>
                  <strong>Rectificación:</strong> corregir datos inexactos o
                  incompletos.
                </li>
                <li>
                  <strong>Supresión:</strong> solicitar la eliminación de tus
                  datos cuando no sean necesarios.
                </li>
                <li>
                  <strong>Oposición:</strong> oponerte al tratamiento basado en
                  interés legítimo o con fines de marketing.
                </li>
                <li>
                  <strong>Limitación:</strong> solicitar la suspensión del
                  tratamiento en determinadas circunstancias.
                </li>
                <li>
                  <strong>Portabilidad:</strong> recibir tus datos en formato
                  estructurado y de uso común.
                </li>
              </ul>
              <p className="mt-3">
                Para ejercerlos, escríbenos a{" "}
                <a
                  href="mailto:privacidad@shopco.com"
                  className="text-[#487D26] hover:underline"
                >
                  privacidad@shopco.com
                </a>{" "}
                adjuntando una copia de tu DNI o documento identificativo. También
                tienes derecho a presentar una reclamación ante la{" "}
                <strong>Agencia Española de Protección de Datos</strong>{" "}
                (www.aepd.es).
              </p>
            </>
          ),
        },
        {
          title: "Política de Cookies",
          content: (
            <>
              <p>
                Utilizamos exclusivamente cookies técnicas necesarias para el
                funcionamiento del sitio web (gestión de sesión, carrito de
                compra). No empleamos cookies de seguimiento o publicidad
                comportamental sin tu consentimiento previo.
              </p>
              <p>
                Puedes configurar tu navegador para bloquear o eliminar cookies.
                Ten en cuenta que deshabilitar ciertas cookies puede afectar a
                la funcionalidad del sitio.
              </p>
            </>
          ),
        },
        {
          title: "Modificaciones de esta Política",
          content: (
            <p>
              Nos reservamos el derecho a actualizar esta política para adaptarla
              a cambios legislativos o funcionales. Te notificaremos cualquier
              modificación relevante a través de un aviso visible en el sitio web.
              La fecha de «última actualización» en la cabecera de este documento
              indica cuándo se realizó el último cambio.
            </p>
          ),
        },
      ]}
    />
  );
}
