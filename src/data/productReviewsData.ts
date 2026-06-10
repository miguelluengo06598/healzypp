// ─────────────────────────────────────────────────────────────────────────────
// Datos de reseñas de clientes del producto
// TODO: reemplaza con reseñas reales o conéctalas a tu backend/CMS
// ─────────────────────────────────────────────────────────────────────────────

export type ProductReview = {
  id: number;
  name: string;
  rating: number;
  comment: string;
  verified: boolean;
  date: string; // formato ISO: "YYYY-MM-DD"
};

export const productReviewsData: ProductReview[] = [
  {
    id: 1,
    name: "Carmen López",
    rating: 5,
    comment:
      "Llevo 3 semanas tomándolas y noto mucha menos hinchazón después de comer. Al principio era escéptica pero funcionan de verdad.",
    verified: true,
    date: "2024-03-15",
  },
  {
    id: 2,
    name: "Javier M.",
    rating: 4,
    comment:
      "Están bien, el sabor no es malo aunque tampoco increíble. Lo importante es que sí noto mejoría en la digestión.",
    verified: true,
    date: "2024-03-12",
  },
  {
    id: 3,
    name: "María Fernández",
    rating: 5,
    comment:
      "Mi madre me las recomendó y ahora las tomo cada mañana. He notado que tengo más energía y menos antojos de dulce a media tarde.",
    verified: true,
    date: "2024-03-10",
  },
  {
    id: 4,
    name: "Alberto S.",
    rating: 3,
    comment:
      "No me han hecho milagros pero tampoco están mal. Quizá necesite más tiempo para ver resultados claros.",
    verified: true,
    date: "2024-03-08",
  },
  {
    id: 5,
    name: "Laura Jiménez",
    rating: 5,
    comment:
      "Las compré por el tema de controlar el apetito y funcionan bastante bien. Ya voy por mi segundo bote.",
    verified: true,
    date: "2024-03-05",
  },
  {
    id: 6,
    name: "Pedro García",
    rating: 4,
    comment:
      "El envío llegó rápido. Las gominolas tienen buen sabor, parecen chuches normales jaja. Aún es pronto para ver resultados grandes.",
    verified: true,
    date: "2024-03-03",
  },
  {
    id: 7,
    name: "Ana Ruiz",
    rating: 5,
    comment:
      "Desde que las tomo he mejorado mucho las digestiones pesadas. Antes me sentía fatal después de comer y ahora mucho mejor.",
    verified: true,
    date: "2024-03-01",
  },
  {
    id: 8,
    name: "Carlos Martín",
    rating: 5,
    comment:
      "Mi mujer y yo las tomamos juntos. A ella le van genial para la hinchazón, a mí me ayudan con el tema de controlar lo que como.",
    verified: true,
    date: "2024-02-28",
  },
  {
    id: 9,
    name: "Isabel V.",
    rating: 4,
    comment:
      "Buen producto, el precio está bien si pillas el pack de 2. El sabor es agradable, nada ácido como pensaba.",
    verified: true,
    date: "2024-02-26",
  },
  {
    id: 10,
    name: "Diego Sánchez",
    rating: 5,
    comment:
      "Llevo un mes tomándolas y he notado cambios. Me siento menos pesado después de las comidas y con más ganas de moverme.",
    verified: true,
    date: "2024-02-24",
  },
  {
    id: 11,
    name: "Rocío Morales",
    rating: 5,
    comment:
      "Las vi en Instagram y me animé a probarlas. La verdad es que sí funcionan, sobre todo para la hinchazón abdominal.",
    verified: true,
    date: "2024-02-22",
  },
  {
    id: 12,
    name: "Miguel Ángel P.",
    rating: 4,
    comment:
      "Están bien, cumplen lo que prometen. No son mágicas pero ayudan si llevas una dieta decente.",
    verified: true,
    date: "2024-02-20",
  },
  {
    id: 13,
    name: "Patricia Navarro",
    rating: 5,
    comment:
      "¡Me encantan! Saben bien y funcionan. Ya he recomendado a varias amigas y todas contentas.",
    verified: true,
    date: "2024-02-18",
  },
  {
    id: 14,
    name: "Raúl Torres",
    rating: 5,
    comment:
      "Pedí el pack de 3 botes. Voy por el primero y de momento genial. Se nota en la digestión y en cómo me siento de ligero.",
    verified: true,
    date: "2024-02-16",
  },
  {
    id: 15,
    name: "Marta Domínguez",
    rating: 4,
    comment:
      "El envío fue rápido, contra reembolso perfecto. Las gominolas están bien, me ayudan con los gases que tenía después de comer.",
    verified: true,
    date: "2024-02-14",
  },
  {
    id: 16,
    name: "Francisco J.",
    rating: 5,
    comment:
      "Estoy sorprendido la verdad. No esperaba mucho pero funcionan mejor de lo que pensaba. Repetiré seguro.",
    verified: true,
    date: "2024-02-12",
  },
  {
    id: 17,
    name: "Cristina Vega",
    rating: 5,
    comment:
      "Tengo problemas digestivos desde hace años y estas gominolas me han ayudado más que muchas cosas que he probado.",
    verified: true,
    date: "2024-02-10",
  },
  {
    id: 18,
    name: "Andrés Romero",
    rating: 4,
    comment:
      "Por el precio están bien. No son milagrosas pero notas que hacen algo. El sabor es agradable.",
    verified: true,
    date: "2024-02-08",
  },
  {
    id: 19,
    name: "Elena Castro",
    rating: 5,
    comment:
      "Las tomo cada mañana antes del desayuno. He perdido un poco de peso sin hacer dieta estricta, solo comiendo más consciente.",
    verified: true,
    date: "2024-02-06",
  },
  {
    id: 20,
    name: "José Luis G.",
    rating: 5,
    comment:
      "Mi hija me las regaló porque siempre me quejo de las digestiones. ¡Pues funcionan! Ya llevo 2 botes.",
    verified: true,
    date: "2024-02-04",
  },
  {
    id: 21,
    name: "Lucía Prieto",
    rating: 4,
    comment:
      "Están bien, aunque al principio no notaba nada. A partir de la segunda semana sí empecé a notar mejoras.",
    verified: true,
    date: "2024-02-02",
  },
  {
    id: 22,
    name: "Sergio Ortiz",
    rating: 5,
    comment:
      "Buenísimas. Las uso como parte de mi rutina de salud y van genial. Nada de molestias después de comer.",
    verified: true,
    date: "2024-01-31",
  },
  {
    id: 23,
    name: "Rosa María L.",
    rating: 5,
    comment:
      "Pedí el pack de 2 y acerté. El pago contra reembolso me da más confianza. Producto totalmente recomendable.",
    verified: true,
    date: "2024-01-29",
  },
  {
    id: 24,
    name: "Pablo Herrera",
    rating: 4,
    comment:
      "Las llevo tomando un mes. No he perdido peso milagrosamente pero sí me siento mejor en general.",
    verified: true,
    date: "2024-01-27",
  },
  {
    id: 25,
    name: "Silvia Medina",
    rating: 5,
    comment:
      "¡Me gustan mucho! Son fáciles de tomar porque saben bien y funcionan. Ya no me siento hinchada todo el día.",
    verified: true,
    date: "2024-01-25",
  },
  {
    id: 26,
    name: "Manuel R.",
    rating: 5,
    comment:
      "Compré por probar y la verdad es que repetiré. Mejoran la digestión y me ayudan a no picar entre horas.",
    verified: true,
    date: "2024-01-23",
  },
  {
    id: 27,
    name: "Beatriz Gil",
    rating: 4,
    comment:
      "Buen producto. El sabor es agradable y se notan los efectos después de unas semanas. Relación calidad-precio correcta.",
    verified: true,
    date: "2024-01-21",
  },
  {
    id: 28,
    name: "Antonio Molina",
    rating: 5,
    comment:
      "Las tomo desde hace 3 semanas y estoy muy contento. Digestiones mucho mejor y más energía durante el día.",
    verified: true,
    date: "2024-01-19",
  },
  {
    id: 29,
    name: "Nuria Santos",
    rating: 5,
    comment:
      "¡Super recomendables! Funcionan de verdad. Ya he pedido más para mi hermana que también quiere probarlas.",
    verified: true,
    date: "2024-01-17",
  },
  {
    id: 30,
    name: "Víctor Campos",
    rating: 4,
    comment:
      "Están bien. No son la solución a todo pero ayudan bastante con la digestión y el control del apetito.",
    verified: true,
    date: "2024-01-15",
  },
];
