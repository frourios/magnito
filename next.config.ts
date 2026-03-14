import type { NextConfig } from 'next';
import packageJson from './package.json';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  env: { APP_VERSION: `v${packageJson.version}` },
};

export default nextConfig;
