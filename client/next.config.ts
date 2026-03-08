import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  env: { APP_VERSION: `v${require('../package.json').version}` },
  webpack: (config) => {
    config.resolve.symlinks = false;

    return config;
  },
};

export default nextConfig;
