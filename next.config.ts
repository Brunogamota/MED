import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Domain code is pure TS; keep the serverless bundle lean.
  serverExternalPackages: ['@prisma/client'],
};

export default nextConfig;
