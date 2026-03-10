import type { NextConfig } from 'next';
import rootPackage from '../package.json';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  env: { APP_VERSION: `v${rootPackage.version}` },
  webpack: (config) => {
    config.resolve.symlinks = false;

    return config;
  },
};

export default nextConfig;
