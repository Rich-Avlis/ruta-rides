import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Túneles de desarrollo (Cloudflare quick tunnel) para probar en teléfono.
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
