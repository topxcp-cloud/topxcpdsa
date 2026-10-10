import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  // Ensure the preserved route registry and its tiny compatibility router are
  // included in Node serverless output when deployed on Vercel.
  outputFileTracingIncludes: {
    '/*': ['./lib/api/route-registry.cjs', './lib/next-api-bridge.cjs'],
  },
};
export default nextConfig;
