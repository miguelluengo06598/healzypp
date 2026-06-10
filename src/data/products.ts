import type { Product } from "@/types/product.types";
import type { Review } from "@/types/review.types";

// TODO: reemplaza srcUrl y gallery con las imágenes reales del producto.
// NOTE: El precio aquí refleja el precio de entrada del pack de 1 bote.
// TODO: conectar con la tabla `products` de Supabase para carga dinámica de precios.
//       No se hace ahora porque requeriría una query async que podría romper el flujo
//       del carrito (Redux) si el esquema de Supabase cambia.
const gominolasProduct: Product = {
  id: 1,
  title: "Gominolas de vinagre de manzana",
  srcUrl: "/images/FL1.png",
  gallery: ["/images/FL1.png", "/images/FL2.png", "/images/FL3.png","/images/FL4.png"],
  // Precio real del pack de 1 bote (sin descuento artificial)
  price: 29,
  discount: { amount: 0, percentage: 20 },
  rating: 4.8,
  reviewsCount: 128,
  stock: 3,
  location: "Popular en Madrid",
  badge: "sale",
  colors: [
    { name: "Natural", code: "bg-[#E8DCC4]" },
    { name: "Verde", code: "bg-[#487D26]" },
  ],
  sizes: ["1 Bote", "2 Botes", "3 Botes"],
};

export const newArrivalsData: Product[] = [gominolasProduct];
export const topSellingData: Product[] = [gominolasProduct];
export const relatedProductData: Product[] = [gominolasProduct];

export const reviewsData: Review[] = [
  {
    id: 1,
    user: "Alex K.",
    content:
      '"Finding clothes that align with my personal style used to be a challenge until I discovered HEALZYP. The range of options they offer is truly remarkable, catering to a variety of tastes and occasions."',
    rating: 5,
    date: "August 14, 2023",
  },
  {
    id: 2,
    user: "Sarah M.",
    content: `"I'm blown away by the quality and style of the clothes I received from HEALZYP. From casual wear to elegant dresses, every piece I've bought has exceeded my expectations."`,
    rating: 5,
    date: "August 15, 2023",
  },
  {
    id: 3,
    user: "Ethan R.",
    content: `"This t-shirt is a must-have for anyone who appreciates good design. The minimalistic yet stylish pattern caught my eye, and the fit is perfect. I can see the designer's touch in every aspect of this shirt."`,
    rating: 5,
    date: "August 16, 2023",
  },
  {
    id: 4,
    user: "Olivia P.",
    content: `"As a UI/UX enthusiast, I value simplicity and functionality. This t-shirt not only represents those principles but also feels great to wear. It's evident that the designer poured their creativity into making this t-shirt stand out."`,
    rating: 5,
    date: "August 17, 2023",
  },
  {
    id: 5,
    user: "Liam K.",
    content: `"This t-shirt is a fusion of comfort and creativity. The fabric is soft, and the design speaks volumes about the designer's skill. It's like wearing a piece of art that reflects my passion for both design and fashion."`,
    rating: 5,
    date: "August 18, 2023",
  },
  {
    id: 6,
    user: "Samantha D.",
    content: `"I absolutely love this t-shirt! The design is unique and the fabric feels so comfortable. As a fellow designer, I appreciate the attention to detail. It's become my favorite go-to shirt."`,
    rating: 5,
    date: "August 19, 2023",
  },
];
