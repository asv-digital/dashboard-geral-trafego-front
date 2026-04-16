import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  rewrites: async () => [
    {
      // Proxy todas as chamadas /api/* para o backend Express
      source: "/api/:path*",
      destination: `${process.env.BACKEND_URL || "http://localhost:3001"}/api/:path*`,
    },
  ],
};

export default nextConfig;
