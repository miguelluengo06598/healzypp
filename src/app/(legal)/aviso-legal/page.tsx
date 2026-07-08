import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Aviso Legal | HEALZYP",
  description:
    "Información legal sobre el titular del sitio web HEALZYP, conforme a la Ley 34/2002 de Servicios de la Sociedad de la Información (LSSI-CE).",
};

export default function AvisoLegalPage() {
  return (
    <LegalPage
      title="Aviso Legal"
      subtitle="Información legal del titular del sitio web conforme a la Ley 34/2002 de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE)."
      lastUpdated="22 de abril de 2026"
      breadcrumb={[{ label: "Aviso Legal", href: "/aviso-legal" }]}
      sections={[
        {
          title: "Datos del Titular",
          content: (
            <>
              <p>
                En cumplimiento del artículo 10 de la LSSI-CE, se facilitan los
                siguientes datos identificativos del titular del sitio web:
              </p>
              <ul className="mt-2 space-y-1 list-none">
                <li>
                  <strong>Denominación social:</strong> Nombre Tienda S.L.
                </li>
                <li>
                  <strong>CIF:</strong> B-XXXXXXXX
                </li>
                <li>
                  <strong>Domicilio social:</strong> Calle Ejemplo, 1 — 28001
                  Madrid, España
                </li>
                <li>
                  <strong>Inscripción:</strong> Registro Mercantil de Madrid,
                  Tomo XXXXX, Folio XXX, Hoja M-XXXXXX
                </li>
                <li>
                  <strong>Correo de contacto:</strong>{" "}
                  <a
                    href="mailto:info@shopco.com"
                    className="text-[#487D26] hover:underline"
                  >
                    info@shopco.com
                  </a>
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Objeto y Ámbito de Aplicación",
          content: (
            <p>
              El presente aviso legal regula el acceso y uso del sitio web
              accesible en el dominio <strong>healzyp.com</strong> (en adelante,
              «el Sitio»). El acceso al Sitio implica la aceptación plena y sin
              reservas de las condiciones aquí expuestas. El titular se reserva
              el derecho a modificar estas condiciones en cualquier momento;
              cualquier modificación será efectiva desde su publicación en el
              Sitio.
            </p>
          ),
        },
        {
          title: "Condiciones de Acceso y Uso",
          content: (
            <>
              <p>
                El acceso al Sitio es gratuito y no requiere registro previo,
                salvo para las funcionalidades que así lo indiquen. El usuario se
                compromete a hacer un uso lícito del Sitio, absteniéndose de:
              </p>
              <ul className="mt-2 space-y-1.5 list-disc list-inside">
                <li>
                  Introducir o difundir contenidos ilícitos, dañinos, falsos o
                  que vulneren derechos de terceros.
                </li>
                <li>
                  Utilizar técnicas de scraping automatizado o bots sin
                  autorización expresa.
                </li>
                <li>
                  Intentar acceder a áreas restringidas del Sitio o de nuestros
                  sistemas informáticos.
                </li>
                <li>
                  Reproducir, copiar, distribuir o comunicar públicamente
                  contenidos del Sitio sin autorización.
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Propiedad Intelectual e Industrial",
          content: (
            <p>
              Todos los contenidos del Sitio — incluyendo, sin limitación, textos,
              imágenes, logotipos, diseños, código fuente y bases de datos — son
              propiedad exclusiva del titular o cuenta con las licencias
              correspondientes, y están protegidos por la legislación española e
              internacional sobre propiedad intelectual e industrial. Queda
              expresamente prohibida su reproducción total o parcial, distribución,
              comunicación pública o transformación sin la autorización escrita
              previa del titular.
            </p>
          ),
        },
        {
          title: "Exclusión de Garantías y Responsabilidad",
          content: (
            <>
              <p>
                El titular no garantiza la disponibilidad, continuidad o
                infalibilidad del Sitio, y no será responsable de los daños
                producidos por su interrupción, defecto o desconexión,
                especialmente cuando tengan causa de fuerza mayor.
              </p>
              <p>
                Asimismo, no se hace responsable de los contenidos de sitios web
                de terceros a los que el Sitio pueda enlazar, ni de las prácticas
                de privacidad de dichos terceros.
              </p>
            </>
          ),
        },
        {
          title: "Hipervínculos",
          content: (
            <p>
              Los enlaces a sitios externos se ofrecen únicamente como referencia
              informativa. El titular no controla ni respalda los contenidos de
              dichos sitios y declina toda responsabilidad por los daños que
              pudieran derivarse de su acceso o uso. Si deseas incluir un enlace
              a este Sitio, deberás obtener autorización previa por escrito.
            </p>
          ),
        },
        {
          title: "Legislación Aplicable y Jurisdicción",
          content: (
            <p>
              Las relaciones entre el titular y los usuarios del Sitio se rigen
              por la legislación española, en particular la LSSI-CE, el TRLGDCU y
              el RGPD. Para la resolución de cualquier controversia derivada del
              uso del Sitio, las partes se someten a la jurisdicción de los
              Juzgados y Tribunales de la ciudad de Madrid, con renuncia expresa a
              cualquier otro fuero que pudiera corresponderles, sin perjuicio de
              los derechos que la normativa de consumidores otorga a los usuarios
              respecto al fuero de su domicilio.
            </p>
          ),
        },
      ]}
    />
  );
}
