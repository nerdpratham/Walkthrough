import type { NextConfig } from "next";

const viewer = process.env.VIEWER_BUILD === '1';

const nextConfig: NextConfig = {
  output: viewer ? 'export' : 'standalone',
  trailingSlash: viewer ? true : undefined,
  images: viewer ? { unoptimized: true } : undefined,
  transpilePackages: [
    '@photo-sphere-viewer/core',
    '@photo-sphere-viewer/virtual-tour-plugin',
    '@photo-sphere-viewer/markers-plugin',
  ],
  experimental: {
    // Studio uploads pass through proxy.ts which buffers the body; raw captures
    // are 20-30MB. Irrelevant to the viewer build, harmless to keep.
    proxyClientMaxBodySize: '50mb',
  },
};

export default nextConfig;
