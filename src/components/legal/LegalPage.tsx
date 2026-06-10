import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { integralCF } from "@/styles/fonts";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LegalSection {
  title: string;
  content: React.ReactNode;
}

interface LegalPageProps {
  title: string;
  subtitle?: string;
  lastUpdated: string;
  sections: LegalSection[];
  breadcrumb: { label: string; href: string }[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LegalPage({
  title,
  subtitle,
  lastUpdated,
  sections,
  breadcrumb,
}: LegalPageProps) {
  return (
    <main className="pb-20">
      <div className="max-w-frame mx-auto px-4 xl:px-0">
        {/* Top rule */}
        <hr className="h-[1px] border-t-black/10 mb-5 sm:mb-6" />

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-black/50 mb-8">
          <Link href="/" className="hover:text-black transition-colors">
            Inicio
          </Link>
          {breadcrumb.map((crumb) => (
            <React.Fragment key={crumb.href}>
              <span>/</span>
              <Link
                href={crumb.href}
                className="hover:text-black transition-colors last:text-black last:pointer-events-none"
              >
                {crumb.label}
              </Link>
            </React.Fragment>
          ))}
        </nav>

        {/* Header */}
        <div className="mb-10 md:mb-14">
          <h1
            className={cn(
              integralCF.className,
              "text-[32px] md:text-[48px] leading-tight mb-3"
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-black/60 text-base md:text-lg max-w-2xl">
              {subtitle}
            </p>
          )}
          <p className="text-sm text-black/40 mt-4">
            Última actualización:{" "}
            <span className="font-medium text-black/60">{lastUpdated}</span>
          </p>
        </div>

        <hr className="h-[1px] border-t-black/10 mb-10 md:mb-14" />

        {/* Two-column layout on large screens: TOC + content */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
          {/* Table of contents — sticky on desktop */}
          <aside className="hidden lg:block w-[240px] shrink-0 sticky top-8">
            <p className="text-xs font-medium uppercase tracking-widest text-black/40 mb-4">
              Contenido
            </p>
            <nav className="flex flex-col gap-2">
              {sections.map((section, i) => (
                <a
                  key={i}
                  href={`#section-${i}`}
                  className="text-sm text-black/60 hover:text-[#487D26] transition-colors py-1 border-l-2 border-black/10 hover:border-[#487D26] pl-3"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {sections.map((section, i) => (
              <section
                key={i}
                id={`section-${i}`}
                className="mb-10 md:mb-12 scroll-mt-8"
              >
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-sm font-bold text-[#487D26] shrink-0 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="font-bold text-lg md:text-xl text-black">
                    {section.title}
                  </h2>
                </div>
                <div className="pl-8 text-black/70 text-sm md:text-base leading-relaxed space-y-3">
                  {section.content}
                </div>
              </section>
            ))}

            <hr className="h-[1px] border-t-black/10 mt-4 mb-8" />

            {/* Footer note */}
            <p className="text-xs text-black/40 leading-relaxed">
              Si tienes preguntas sobre este documento, puedes contactarnos en{" "}
              <a
                href="mailto:info@shopco.com"
                className="text-[#487D26] hover:underline"
              >
                info@shopco.com
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
