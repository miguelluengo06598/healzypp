import ProductListSec from "@/components/common/ProductListSec";
import Brands from "@/components/homepage/Brands";
import HeroSectionDynamica from "@/components/homepage/HeroSectionDynamica";
import HealzypBrand from "@/components/homepage/HealzypBrand";
import { getActiveProducts } from "@/lib/db/products";

export default async function Home() {
  const products = await getActiveProducts();

  return (
    <>
      <HeroSectionDynamica featuredProduct={products[0] ?? null} />
      <Brands />
      <main className="my-[50px] sm:my-[72px]">
        <ProductListSec
          title="NEW ARRIVALS"
          data={products}
          viewAllLink="/shop#new-arrivals"
        />
        <div className="max-w-frame mx-auto px-4 xl:px-0">
          <hr className="h-[1px] border-t-black/10 my-10 sm:my-16" />
        </div>
        <div className="mb-[50px] sm:mb-20">
          <ProductListSec
            title="top selling"
            data={products}
            viewAllLink="/shop#top-selling"
          />
        </div>
        <div className="mb-[50px] sm:mb-20">
          <HealzypBrand />
        </div>
      </main>
    </>
  );
}
