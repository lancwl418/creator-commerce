import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@creator-commerce/shared'],
  // 上传设计下单：设计图 + 预览图经 Server Action 提交
  experimental: { serverActions: { bodySizeLimit: '50mb' } },
};

export default nextConfig;
