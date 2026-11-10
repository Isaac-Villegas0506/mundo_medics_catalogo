import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import PageViewTracker from "@/components/PageViewTracker";

const inter = Inter({ subsets: ["latin"] });

/* Fase 21 — SEO: `metadataBase` es obligatorio para que las URLs relativas de
   `alternates.canonical` se resuelvan a absolutas.
   PageSpeed reportaba: «El documento no tiene un atributo rel=canonical válido
   — No es una URL absoluta (/)». Con esto, `canonical: '/'` pasa a ser
   `https://mundo-medics-catalogo.vercel.app/`.

   Se toma de NEXT_PUBLIC_SITE_URL y se cae a la URL de producción si falta,
   para que el canonical nunca quede vacío. */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://mundo-medics-catalogo.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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

        {/* Fase 21 — PageSpeed: «No hay orígenes con los que se haya
            establecido conexión previamente».

            Las imágenes de producto viven en Supabase Storage y ImageKit. Abrir
            la conexión (DNS + TLS) antes de que el navegador descubra la primera
            <img> ahorra parte de la latencia del LCP.

            `dns-prefetch` se deja como respaldo para navegadores sin preconnect. */}
        <link rel="preconnect" href="https://whsonrlkbmnudwmxpfii.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://whsonrlkbmnudwmxpfii.supabase.co" />
        <link rel="preconnect" href="https://ik.imagekit.io" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://ik.imagekit.io" />
      </head>
      <body className={`${inter.className} min-h-screen bg-background`} suppressHydrationWarning>
        {/* Fase 10: se retiró <MotionProvider> del layout raíz.
            Era lo que obligaba a cargar framer-motion (~227 KB) en la primera
            visita de cualquier página pública. Ahora el sitio público usa
            animaciones CSS (globals.css) y `prefers-reduced-motion` se respeta
            con la regla @media correspondiente, sin JavaScript.
            El panel de administración sí lo conserva, pero cargado bajo demanda. */}
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {/* Fase 33: registra las visitas de la tienda pública para el
              dashboard del panel. Solo cuenta la ruta; no usa cookies ni
              guarda datos personales. Se ignora en /admin y /api. */}
          <PageViewTracker />
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
