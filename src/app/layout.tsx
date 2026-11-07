import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

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
        {/* Fase 10: se retiró <MotionProvider> del layout raíz.
            Era lo que obligaba a cargar framer-motion (~227 KB) en la primera
            visita de cualquier página pública. Ahora el sitio público usa
            animaciones CSS (globals.css) y `prefers-reduced-motion` se respeta
            con la regla @media correspondiente, sin JavaScript.
            El panel de administración sí lo conserva, pero cargado bajo demanda. */}
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
        {/* Fase 9 (4.5): Vercel Web Analytics.
            Sólo recoge rutas visitadas y métricas agregadas; no usa cookies de
            seguimiento ni datos personales.

            Se monta ÚNICAMENTE en Vercel. El script vive en /_vercel/insights/,
            que no existe en local: montarlo siempre provocaba un 404 y un error
            de MIME type en la consola. Vercel define VERCEL=1 automáticamente. */}
        {process.env.VERCEL === '1' && <Analytics />}
      </body>
    </html>
  );
}
