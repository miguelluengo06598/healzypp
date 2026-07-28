import type { Bundle } from "@/lib/bundles";

/** Identificador único del pack en todo el catálogo. Antes era el `id`
 *  numérico, que se repetía entre productos y además se usaba como
 *  multiplicador de cantidad. */
export type BundleSku = Bundle["sku"];
