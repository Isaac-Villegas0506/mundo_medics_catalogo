import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "whsonrlkbmnudwmxpfii.supabase.co",
      },
      {
        // Fase 11: las imágenes nuevas se sirven desde ImageKit.
        protocol: "https",
        hostname: "ik.imagekit.io",
      },
      {
        // Se mantiene para las imágenes antiguas que aún viven en Cloudinary.
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        // Fase 6: foto por defecto del modal de ubicación (Ajustes → mapa).
        // Si el dueño configura su propia URL, también debe ser https pública.
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
