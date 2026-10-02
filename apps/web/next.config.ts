import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Internal packages are consumed from their TypeScript sources.
  transpilePackages: ["@vxv/raid-data"],
};

export default nextConfig;
