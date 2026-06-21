import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "whsonrlkbmnudwmxpfii.supabase.co",
      },
    ],
  },
};

export default nextConfig;
