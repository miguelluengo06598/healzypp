import type { Metadata, Viewport } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "@/styles/globals.css";
import { satoshi } from "@/styles/fonts";
import TopBanner from "@/sections/TopBanner";
import TopNavbar from "@/components/layout/Navbar/TopNavbar";
import Footer from "@/sections/Footer";
import HolyLoader from "holy-loader";
import Providers from "./providers";
import { TrackingProvider } from "@/components/tracking/TrackingProvider";
import CookieBanner from "@/components/ui/CookieBanner";
import MetaPixel from "@/components/tracking/MetaPixel"
import { MetaPageViewTracker } from "@/components/tracking/MetaPageViewTracker";

import StickySmartCart from "@/components/StickySmartCart";
import { ProductPreviewProvider } from "@/components/ProductPreviewContext";
import QuickProductPreviewModal from "@/components/QuickProductPreviewModal";
import AuthModal from "@/components/auth/AuthModal";
import AuthQueryHandler from "@/components/auth/AuthQueryHandler";
import MobileBottomNavigation from "@/components/MobileBottomNavigation";

const DEFAULT_DESCRIPTION =
  "Gominolas de vinagre de manzana veganas y sin gluten. Pago seguro con tarjeta y envío a toda España.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: DEFAULT_DESCRIPTION,
  icons: {
    icon: "/icons/favericonweb.png",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "es_ES",
    url: "/",
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    // 500x500 — única imagen de producto real disponible hoy; sustituir por un
    // asset dedicado 1200x630 cuando exista.
    images: [{ url: "/images/FL1.png", width: 500, height: 500, alt: "Gominolas de vinagre de manzana HEALZYP" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    images: ["/images/FL1.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={satoshi.className}>
        <HolyLoader color="#868686" />
        <TopBanner />
        <Providers>
          <TrackingProvider>
            <ProductPreviewProvider>
              <TopNavbar />
              {children}
              <StickySmartCart />
              <QuickProductPreviewModal />
              <AuthModal />
              <AuthQueryHandler />
              <MobileBottomNavigation />
            </ProductPreviewProvider>
          </TrackingProvider>
        </Providers>
        <Footer />
        <CookieBanner />
        <MetaPixel />
        <MetaPageViewTracker />
      </body>
    </html>
  );
}
