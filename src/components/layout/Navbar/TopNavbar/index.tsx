import { cn } from "@/lib/utils";
import { integralCF } from "@/styles/fonts";
import Link from "next/link";
import React from "react";
import { NavMenu } from "../navbar.types";
import {
  NavigationMenu,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { MenuItem } from "./MenuItem";
import ResTopNavbar from "./ResTopNavbar";
import CartBtn from "./CartBtn";
import UserMenu from "@/components/navbar/UserMenu";

const data: NavMenu = [
  {
    id: 1,
    type: "MenuItem",
    label: "Inicio",
    url: "/",
    children: [],
  },
  {
    id: 2,
    type: "MenuItem",
    label: "Catálogo",
    url: "/shop",
    children: [],
  },
  {
    id: 3,
    type: "MenuItem",
    label: "Novedades",
    url: "/shop#new-arrivals",
    children: [],
  },
  {
    id: 4,
    type: "MenuItem",
    label: "Contacto",
    url: "/contact",
    children: [],
  },
];

const TopNavbar = () => {
  return (
    <nav className="sticky top-0 bg-white z-20">
      <div className="flex relative max-w-frame mx-auto items-center justify-between py-5 md:py-6 px-4 xl:px-0">
        {/* Left: hamburger (mobile) + logo */}
        <div className="flex items-center">
          <div className="block md:hidden mr-4">
            <ResTopNavbar data={data} />
          </div>
          <Link
            href="/"
            className={cn([
              integralCF.className,
              "text-2xl lg:text-[32px] mb-2",
            ])}
          >
            HEALZYP
          </Link>
        </div>

        {/* Center: nav links — absolutely centered on desktop */}
        <NavigationMenu className="hidden md:flex absolute left-1/2 -translate-x-1/2">
          <NavigationMenuList>
            {data.map((item) => (
              <MenuItem key={item.id} label={item.label} url={item.url} />
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Right: cart + user */}
        <div className="flex items-center gap-2">
          <CartBtn />
          <UserMenu />
        </div>
      </div>
    </nav>
  );
};

export default TopNavbar;
