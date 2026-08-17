import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/kilig",

  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
