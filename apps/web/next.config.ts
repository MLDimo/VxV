import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Internal packages are consumed from their TypeScript sources.
  transpilePackages: ["@vxv/bot", "@vxv/raid-data", "@vxv/server"],
  // The repository has its own CLAUDE.md at the root: no generated agent files in apps/web.
  agentRules: false,
  // The member guide, open to every visitor (owner's decision of 9 October): a page of its own in public/guide.
  async rewrites() {
    return [{ source: "/guide", destination: "/guide/index.html" }];
  },
};

export default nextConfig;
