import BreadcrumbShop from "@/components/shop-page/BreadcrumbShop";
import ProductCard from "@/components/common/ProductCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { newArrivalsData } from "@/data/products";

export default function ShopPage() {
  const realProducts = newArrivalsData;

  return (
    <main className="pb-20">
      <div className="max-w-frame mx-auto px-4 xl:px-0">
        <hr className="h-[1px] border-t-black/10 mb-5 sm:mb-6" />
        <BreadcrumbShop />
        <div className="flex flex-col w-full space-y-5">
          <div className="flex flex-col lg:flex-row lg:justify-between">
            <div>
              <h1 className="font-bold text-2xl md:text-[32px]">Todos los productos</h1>
            </div>
            <div className="flex flex-col sm:items-center sm:flex-row">
              <span className="text-sm md:text-base text-black/60 mr-3">
                {realProducts.length} {realProducts.length === 1 ? "producto" : "productos"}
              </span>
              <div className="flex items-center">
                Ordenar por:{" "}
                <Select defaultValue="most-popular">
                  <SelectTrigger className="font-medium text-sm px-1.5 sm:text-base w-fit text-black bg-transparent shadow-none border-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="most-popular">Más Popular</SelectItem>
                    <SelectItem value="low-price">Precio más bajo</SelectItem>
                    <SelectItem value="high-price">Precio más alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Solo productos REALES con página funcional */}
          {realProducts.length > 0 ? (
            <div className="w-full grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
              {realProducts.map((product) => (
                <ProductCard key={product.id} data={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-black/40">
              No hay productos disponibles en este momento.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
