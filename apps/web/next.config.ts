import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const routes = [
      "/admin/:path*",
      "/buzz",
      "/claim",
      "/collection/:path*",
      "/curator/:path*",
      "/curators",
      "/platform/:path*",
      "/reclaim",
      "/reset-password",
      "/search",
      "/settings",
      "/signin",
      "/title/:path*",
      "/titles",
    ];

    return routes.map((source) => ({
      source,
      destination: `/kilig${source}`,
    }));
  },
};

export default nextConfig;
