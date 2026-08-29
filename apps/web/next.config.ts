import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbopack: false, // Disable Turbopack, use SWC instead
  },
};

export default nextConfig;
