import { Product } from "@/types/product.types";

const ADJECTIVES = [
  "Premium", "Natural", "Orgánico", "Puro", "Saludable", "Vital",
  "Energía", "Bienestar", "Equilibrio", "Active", "Daily", "Power",
  "Green", "Raw", "Clean", "Boost", "Zen", "Flow", "Glow", "Core",
];

const NOUNS = [
  "Vinagre de manzana", "Colágeno", "Magnesio", "Omega-3", "Vitamina D",
  "Probióticos", "Melatonina", "Ashwagandha", "Spirulina", "Jengibre",
  "Cúrcuma", "Zinc", "Hierro", "Calcio", "Biotina", "Glucosamina",
  "Quercetina", "Resveratrol", "Creatina", "Electrolitos",
];

const VARIANTS = [
  "Gominolas", "Cápsulas", "Polvo", "Gotas", "Tabletas", "Jarabe", "Stick",
];

const IMAGES = [
  "/images/FL1.png",
  "/images/FL2.png",
  "/images/FL3.png",
  "/images/FL4.png",
  "/images/FOTOPRODUCT1.png",
  "/images/FOTOVINDEMANPORT.png",
  "/images/MEJORALADIGESTION.png",
  "/images/CONTROLDEPESOVINDEMAN.png",
  "/images/AUMENTALAENERGIAVINDEMAN.png",
  "/images/PRODUCTOSNATURALES.png",
];

const COLORS = [
  { name: "Natural", code: "bg-[#E8DCC4]" },
  { name: "Verde", code: "bg-[#487D26]" },
  { name: "Azul", code: "bg-[#31344F]" },
  { name: "Rojo", code: "bg-[#8B3A3A]" },
];

const SIZES = ["1 Unidad", "Pack 2", "Pack 3", "Pack Familiar"];

const LOCATIONS = [
  "Popular en Madrid",
  "Popular en Barcelona",
  "Popular en Valencia",
  "Tendencia España",
  "Más vendido",
  null,
  null,
];

const BADGES: Array<"trending" | "new" | "sale" | null> = [
  "trending",
  "new",
  "sale",
  null,
  null,
  null,
];

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 9301;
  return x - Math.floor(x);
}

export function generateDummyProducts(count: number): Product[] {
  return Array.from({ length: count }, (_, i): Product => {
    const seed = i + 1;
    const adj = ADJECTIVES[Math.floor(seededRandom(seed * 7) * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(seededRandom(seed * 13) * NOUNS.length)];
    const variant = VARIANTS[Math.floor(seededRandom(seed * 17) * VARIANTS.length)];
    const priceBase = 15 + Math.floor(seededRandom(seed * 23) * 45); // 15-60€
    const discountPct = seededRandom(seed * 29) > 0.7 ? Math.floor(seededRandom(seed * 31) * 30) + 10 : 0;
    const rating = 3.5 + seededRandom(seed * 37) * 1.5;
    const stock = Math.floor(seededRandom(seed * 41) * 20);
    const imageIdx = Math.floor(seededRandom(seed * 43) * IMAGES.length);

    return {
      id: seed,
      title: `${adj} ${noun} — ${variant}`,
      srcUrl: IMAGES[imageIdx],
      gallery: [
        IMAGES[imageIdx],
        IMAGES[(imageIdx + 1) % IMAGES.length],
        IMAGES[(imageIdx + 2) % IMAGES.length],
      ],
      price: priceBase,
      discount: {
        amount: 0,
        percentage: discountPct,
      },
      rating: Math.round(rating * 10) / 10,
      reviewsCount: Math.floor(seededRandom(seed * 47) * 500) + 10,
      stock,
      location: LOCATIONS[Math.floor(seededRandom(seed * 53) * LOCATIONS.length)] ?? undefined,
      badge: BADGES[Math.floor(seededRandom(seed * 59) * BADGES.length)],
      colors: COLORS.slice(0, Math.floor(seededRandom(seed * 61) * 3) + 1),
      sizes: SIZES.slice(0, Math.floor(seededRandom(seed * 67) * 3) + 2),
    };
  });
}
