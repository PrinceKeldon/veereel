import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/kilig",
        destination: "https://veereel-5oav838ag-keldontechnolog.vercel.app/kilig",
      },
      {
        source: "/kilig/:path*",
        destination: "https://veereel-5oav838ag-keldontechnolog.vercel.app/kilig/:path*",
      },
    ];
  },
};

export default nextConfig;
