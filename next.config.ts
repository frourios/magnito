import type { NextConfig } from 'next';
import packageJson from './package.json';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  env: { APP_VERSION: `v${packageJson.version}` },
  headers() {
    return [
      {
        source: '/',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: '*' },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'amz-sdk-invocation-id,amz-sdk-request,cache-control,content-type,x-amz-target,x-amz-user-agent',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
