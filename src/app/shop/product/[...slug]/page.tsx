import type { Metadata } from "next";
import { newArrivalsData, relatedProductData } from "@/data/products";
import ProductListSec from "@/sections/ProductListSec";
import ProductCard from "@/components/common/ProductCard";
import BreadcrumbProduct from "@/sections/Breadcrumbs/BreadcrumbProduct";
import ProductHeader from "@/sections/ProductHeader";
import ProductSections from "@/sections/ProductSections";
import ProductPageTracker from "@/components/tracking/ProductPageTracker";
import ProductMetaTracker from "@/components/tracking/ProductMetaTracker";
import ProductSectionWrapper from "@/components/tracking/ProductSectionWrapper";
import { notFound, permanentRedirect } from "next/navigation";
import { SITE_NAME, SITE_URL, productPath, slugify } from "@/lib/site";
import { getBundlesForProduct } from "@/lib/bundles";
import type { Product } from "@/types/product.types";

const data = newArrivalsData;

// Pre-genera cada ficha en build time (SSG): el catálogo vive en memoria, así
// que no hay razón para pagar un render por request. Las URLs con slug no
// canónico no se listan aquí — se renderizan bajo demanda (dynamicParams=true
// por defecto) y salen por el permanentRedirect de abajo, igual que antes.
// Al conectar el catálogo a Supabase, sustituir por ISR (`revalidate`).
export function generateStaticParams() {
  return data.map((product) => ({
    slug: [String(product.id), slugify(product.title)],
  }));
}

// Sin rating/nº de reseñas: los valores del mock (4.8, 128) son placeholders
// sin respaldo real — no indexar cifras inventadas.
function productDescription(product: Product): string {
  return `Compra ${product.title} online en ${SITE_NAME}. Pago seguro con tarjeta y envío a toda España.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = data.find((p) => p.id === Number(slug[0]));

  // Producto inexistente: la página renderiza notFound(); no hay metadata que aportar
  if (!product) return {};

  const title = `${product.title} | ${SITE_NAME}`;
  const description = productDescription(product);
  const canonical = `${SITE_URL}${productPath(product.id, product.title)}`;
  const image = `${SITE_URL}${product.gallery?.[0] ?? product.srcUrl}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      // Next.js no admite og:type "product" en su API tipada; "website" es el
      // fallback estándar y no afecta al preview de la imagen/título.
      type: "website",
      siteName: SITE_NAME,
      locale: "es_ES",
      url: canonical,
      title,
      description,
      images: [{ url: image, alt: product.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const productData = data.find(
    (product) => product.id === Number(slug[0])
  );

  if (!productData?.title) {
    notFound();
  }

  // Redirect permanente a la URL canónica si el slug no coincide — evita que
  // /shop/product/1, /shop/product/1/Lo-Que-Sea o variantes con mayúsculas/
  // acentos indexen como contenido duplicado. permanentRedirect emite 308
  // (Next.js no expone 301 desde server components); Google lo consolida
  // exactamente igual que un 301.
  const canonicalSlug = slugify(productData.title);
  const providedSlug = slug.length === 2 ? decodeURIComponent(slug[1]) : null;
  if (providedSlug !== canonicalSlug) {
    permanentRedirect(productPath(productData.id, productData.title));
  }

  const canonicalUrl = `${SITE_URL}${productPath(productData.id, productData.title)}`;

  // Precio de entrada: el pack más barato DE ESTE producto. Sale del mismo
  // catálogo en código que usa el endpoint de pago para cobrar, así que no
  // puede divergir de lo que se cobra.
  const productBundles = getBundlesForProduct(productData.slug);
  const entryPriceEur = (
    Math.min(...productBundles.map((b) => b.priceInCents)) / 100
  ).toFixed(2);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productData.title,
    image: (productData.gallery ?? [productData.srcUrl]).map((src) => `${SITE_URL}${src}`),
    description: productDescription(productData),
    sku: String(productData.id),
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      price: entryPriceEur,
      priceCurrency: "EUR",
      availability:
        (productData.stock ?? 0) > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      url: canonicalUrl,
    },
    // Sin aggregateRating: rating/reviewsCount del mock son placeholders y las
    // estrellas falsas en rich snippets son motivo de acción manual de Google.
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    // Debe coincidir con el breadcrumb visible (BreadcrumbProduct): Inicio → Tienda → título
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Tienda", item: `${SITE_URL}/shop` },
      { "@type": "ListItem", position: 3, name: productData.title, item: canonicalUrl },
    ],
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <ProductPageTracker productId={productData.id} productSlug={slug[0]} />
      <ProductMetaTracker
        productId={productData.id}
        productSlug={slug[0]}
        productName={productData.title}
        price={productData.price}
      />

      <ProductSectionWrapper section="hero">
        <div className="max-w-frame mx-auto px-4 xl:px-0">
          <hr className="h-[1px] border-t-black/10 mb-5 sm:mb-6" />
          <BreadcrumbProduct title={productData?.title ?? "product"} />
          <section className="mb-11">
            <ProductHeader data={productData} />
          </section>
        </div>
      </ProductSectionWrapper>

      {/* ── Secciones de marketing: beneficios, pasos e información ── */}
      <ProductSections SectionWrapper={ProductSectionWrapper} />

      <ProductSectionWrapper section="footer">
        <div className="mb-[50px] sm:mb-20">
          <ProductListSec
            title="You might also like"
            data={relatedProductData}
            renderItem={(product) => <ProductCard data={product} />}
          />
        </div>
      </ProductSectionWrapper>
    </main>
  );
}
