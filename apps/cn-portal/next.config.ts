import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@creator-commerce/shared'],
  // 上传设计下单：设计图 + 预览图经 Server Action 提交
  experimental: { serverActions: { bodySizeLimit: '50mb' } },
  images: {
    // ERP 图片经 /api/erp/image?path= 代理，next/image 默认不允许带 query 的本地图片，这里放行
    localPatterns: [{ pathname: '/api/erp/image' }],
    // ERP 图片路径带时间戳、不会原地更新，优化后的缩图可以多留一会
    minimumCacheTTL: 7 * 24 * 60 * 60,
  },
};

export default nextConfig;
