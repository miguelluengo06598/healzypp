import Link from "next/link";
import React from "react";
import { MdKeyboardArrowRight } from "react-icons/md";

type Category = {
  title: string;
  slug: string;
};

const categoriesData: Category[] = [
  {
    title: "Digestión",
    slug: "/shop?category=digestion",
  },
  {
    title: "Energía",
    slug: "/shop?category=energia",
  },
  {
    title: "Control de peso",
    slug: "/shop?category=peso",
  },
  {
    title: "Detox",
    slug: "/shop?category=detox",
  },
  {
    title: "Pack ahorro",
    slug: "/shop?category=packs",
  },
];

const CategoriesSection = () => {
  return (
    <div className="flex flex-col space-y-0.5 text-black/60">
      {categoriesData.map((category, idx) => (
        <Link
          key={idx}
          href={category.slug}
          className="flex items-center justify-between py-2"
        >
          {category.title} <MdKeyboardArrowRight />
        </Link>
      ))}
    </div>
  );
};

export default CategoriesSection;
