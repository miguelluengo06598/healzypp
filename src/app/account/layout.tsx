import { Metadata } from "next";
import Link from "next/link";
import { ReactNode } from "react";
import {
  ShoppingBag,
  Ticket,
  UserCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Mi cuenta | HEALZYP",
};

const navItems = [
  { href: "/account/orders", label: "Mis pedidos", icon: ShoppingBag },
  { href: "/account/coupons", label: "Mis cupones", icon: Ticket },
  { href: "/account/profile", label: "Mis datos", icon: UserCircle },
];

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[60vh] bg-gray-50">
      <div className="max-w-frame mx-auto px-4 xl:px-0 py-8 md:py-12">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Mi cuenta</h1>

        <div className="flex flex-col md:flex-row gap-6 md:gap-10">
          {/* Sidebar */}
          <aside className="w-full md:w-64 shrink-0">
            <nav className="flex flex-row md:flex-col gap-1 bg-white md:bg-transparent rounded-2xl md:rounded-none p-2 md:p-0 border md:border-0 border-gray-100 overflow-x-auto">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-black transition whitespace-nowrap"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
