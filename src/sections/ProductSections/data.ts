// Contenido por defecto de la tienda para ProductSections.
// Punto de adaptación: reescribir este archivo (o pasar props) en otro
// proyecto, sin tocar index.tsx.

export type BenefitItem = {
  id: number;
  title: string;
  description: string;
  image: string;
};

export type StepItem = {
  id: number;
  title: string;
  description: string;
};

export type InfoBlock = {
  id: number;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  imageRight: boolean;
};

export const defaultBenefits: BenefitItem[] = [
  {
    id: 1,
    title: "Mejora la digestión",
    description:
      "El vinagre de manzana ayuda a equilibrar el pH del estómago y favorece el crecimiento de bacterias beneficiosas, mejorando el tránsito intestinal de forma natural.",
    image: "/images/MEJORALADIGESTION.png",
  },
  {
    id: 2,
    title: "Aumenta la energía",
    description:
      "Los ácidos orgánicos del vinagre de manzana contribuyen a una liberación de energía más sostenida a lo largo del día, sin los picos de azúcar de otras alternativas.",
    image: "/images/AUMENTALAENERGIAVINDEMAN.png",
  },
  {
    id: 3,
    title: "Controla el peso",
    description:
      "Estudios sugieren que el ácido acético ayuda a reducir el apetito y a regular el metabolismo de los lípidos, apoyando un peso corporal saludable.",
    image: "/images/CONTROLDEPESOVINDEMAN.png",
  },
];

export const defaultSteps: StepItem[] = [
  {
    id: 1,
    title: "Toma 2 gominolas al día",
    description:
      "Consume 2 gominolas por la mañana, preferiblemente antes del desayuno, para aprovechar al máximo sus propiedades digestivas.",
  },
  {
    id: 2,
    title: "Mastica despacio",
    description:
      "Mastica cada gominola lentamente para que el vinagre de manzana se libere de forma gradual y tu cuerpo lo asimile correctamente.",
  },
  {
    id: 3,
    title: "Mantén la constancia",
    description:
      "Los mejores resultados se obtienen con un consumo regular. Incorpora las gominolas a tu rutina diaria durante al menos 4 semanas.",
  },
];

export const defaultInfoBlocks: InfoBlock[] = [
  {
    id: 1,
    title: "Ingredientes 100 % naturales",
    description:
      "Nuestras gominolas están elaboradas con vinagre de manzana orgánico certificado, sin colorantes artificiales ni conservantes. Cada unidad aporta la misma cantidad de ácido acético que un vasito de vinagre, pero con un sabor agradable y sin el ardor. Aptas para veganos y sin gluten.",
    image: "/images/PRODUCTOSNATURALES.png",
    imageAlt: "Ingredientes naturales de las gominolas",
    imageRight: false,
  },
  {
    id: 2,
    title: "Fabricación artesanal y sostenible",
    description:
      "Cada lote se produce en pequeñas cantidades para garantizar la máxima calidad. Utilizamos envases reciclables y reducimos al mínimo nuestra huella de carbono. Trabajamos con productores locales de manzana para apoyar la economía de proximidad y asegurar la frescura de las materias primas.",
    image: "/images/FABRICACIONARTESANALVINDEMAN.png",
    imageAlt: "Proceso de fabricación artesanal",
    imageRight: true,
  },
  {
    id: 3,
    title: "Respaldado por la ciencia",
    description:
      "El vinagre de manzana ha sido objeto de numerosos estudios clínicos que avalan sus beneficios sobre la glucemia, el colesterol y la microbiota intestinal. Nuestras gominolas ofrecen una dosis estandarizada y reproducible para que puedas confiar en cada toma. Consulta con tu médico si tomas medicación.",
    image: "/images/doctorvindeman.png",
    imageAlt: "Respaldo científico del producto",
    imageRight: false,
  },
];
