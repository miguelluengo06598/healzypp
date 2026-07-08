import { newArrivalsData, relatedProductData } from "@/data/products";
import ProductListSec from "@/components/common/ProductListSec";
import BreadcrumbProduct from "@/components/product-page/BreadcrumbProduct";
import Header from "@/components/product-page/Header";
import ProductSections from "@/components/product-page/ProductSections";
import ProductPageTracker from "@/components/tracking/ProductPageTracker";
import ProductMetaTracker from "@/components/tracking/ProductMetaTracker";
import ProductSectionWrapper from "@/components/tracking/ProductSectionWrapper";
import { notFound } from "next/navigation";

const data = newArrivalsData;

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

  return (
    <main>
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
            <Header data={productData} />
          </section>
        </div>
      </ProductSectionWrapper>

      {/* ── Secciones de marketing: beneficios, pasos e información ── */}
      <ProductSections />

      <ProductSectionWrapper section="footer">
        <div className="mb-[50px] sm:mb-20">
          <ProductListSec title="You might also like" data={relatedProductData} />
        </div>
      </ProductSectionWrapper>
    </main>
  );
}
