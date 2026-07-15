import ProductListSec from "@/sections/ProductListSec";
import ProductCard from "@/components/common/ProductCard";
import Brands from "@/sections/Brands";
import Hero from "@/sections/Hero";
import HealzypBrand from "@/sections/HealzypBrand";
import { newArrivalsData, topSellingData } from "@/data/products";

export default function Home() {
  return (
    <>
      <Hero />
      <Brands />
      <main className="my-[50px] sm:my-[72px]">
        <ProductListSec
          title="NEW ARRIVALS"
          data={newArrivalsData}
          viewAllLink="/shop#new-arrivals"
          renderItem={(product) => <ProductCard data={product} />}
        />
        <div className="max-w-frame mx-auto px-4 xl:px-0">
          <hr className="h-[1px] border-t-black/10 my-10 sm:my-16" />
        </div>
        <div className="mb-[50px] sm:mb-20">
          <ProductListSec
            title="top selling"
            data={topSellingData}
            viewAllLink="/shop#top-selling"
            renderItem={(product) => <ProductCard data={product} />}
          />
        </div>
        <div className="mb-[50px] sm:mb-20">
          <HealzypBrand />
        </div>
      </main>
    </>
  );
}
