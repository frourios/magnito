import fs from 'fs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  env: { APP_VERSION: `v${JSON.parse(fs.readFileSync('../package.json', 'utf8')).version}` },
  webpack: (config) => {
    config.resolve.symlinks = false;

    return config;
  },
};

export default nextConfig;
