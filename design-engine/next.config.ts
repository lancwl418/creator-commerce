import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const origins = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .join(' ') ?? '';

    return [
      {
        source: '/embed',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors 'self' ${origins}`.trim(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
