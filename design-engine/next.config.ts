import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@creator-commerce/shared'],
};

export default nextConfig;
