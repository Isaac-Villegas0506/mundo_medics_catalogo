import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MotionProvider } from "@/components/MotionProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mundo Medics",
  description: "Catálogo Digital de Indumentaria Médica",
};

// R13: viewport-fit=cover para que las barras respeten el notch/barra de gestos.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Fase 6: la fuente de iconos se descubre tarde porque está referenciada
            desde el CSS. Precargarla evita el retraso en el primer pintado de
            iconos (Lighthouse: "Font display, est savings 340 ms").
            `font-display: block` se mantiene a propósito: con `swap` se vería el
            texto de la ligadura ("menu", "search") mientras carga. */}
        <link
          rel="preload"
          href="/fonts/material-symbols-subset.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${inter.className} min-h-screen bg-background`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <MotionProvider>{children}</MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
