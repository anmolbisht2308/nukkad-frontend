import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Bricolage_Grotesque, Mukta, Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/components/Auth";
import { Header } from "@/components/Header";
import { CouponProvider } from "@/components/ui/Coupon";
import { Toaster } from "@/components/ui/Toast";
import { CityProvider } from "@/components/City";
import { LangProvider } from "@/components/Lang";
import { BRAND } from "@/lib/brand";
import "./globals.css";

// variable fonts: one file each covers every weight we use
const display = Bricolage_Grotesque({ variable: "--nf-display", subsets: ["latin"], display: "swap", adjustFontFallback: true });
const body = Plus_Jakarta_Sans({ variable: "--nf-body", subsets: ["latin"], display: "swap" });
// Hindi glyphs only: never preloaded, the browser fetches it the first time Devanagari text appears
const deva = Mukta({ variable: "--nf-deva", subsets: ["devanagari"], weight: ["400", "600", "700"], display: "swap", preload: false });

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.city}, live`,
  description: BRAND.pitch,
};

export const viewport: Viewport = { themeColor: "#0B0B0F", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${deva.variable} antialiased`}>
      <body className="pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0">
        <LangProvider>
        <AuthProvider>
          <CityProvider>
          <CouponProvider>
            {/* Header reads the pathname, which suspends on dynamic routes like /b/[slug] */}
            <Suspense fallback={<div className="fixed inset-x-0 top-0 z-50 h-16" />}>
              <Header />
            </Suspense>
            {children}
            <Toaster />
          </CouponProvider>
          </CityProvider>
        </AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
