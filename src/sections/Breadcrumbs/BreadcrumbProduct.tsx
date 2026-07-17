import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";

const BreadcrumbProduct = ({ title }: { title: string }) => {
  return (
    <Breadcrumb className="mb-5 sm:mb-9">
      <BreadcrumbList>
        {/* py + margen negativo: área táctil ~44px sin alterar el layout visual */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/" className="inline-flex items-center py-3 -my-3">
              Inicio
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/shop" className="inline-flex items-center py-3 -my-3">
              Tienda
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{title}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default BreadcrumbProduct;
