import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { AuthProvider } from "@/components/Auth";
import { Header } from "@/components/Header";
import { CouponProvider } from "@/components/ui/Coupon";
import { Toaster } from "@/components/ui/Toast";
import { CityProvider } from "@/components/City";
import { LangProvider } from "@/components/Lang";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const display = Bricolage_Grotesque({ variable: "--nf-display", subsets: ["latin"], weight: ["500", "700", "800"] });
const inter = Inter({ variable: "--nf-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.city}, live`,
  description: BRAND.pitch,
};

export const viewport: Viewport = { themeColor: "#0B0B0F" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${inter.variable} antialiased`}>
      <body className="pb-16 md:pb-0">
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
