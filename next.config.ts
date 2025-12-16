import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Transpile Supabase packages to fix ESM/CJS interop issues
  transpilePackages: ['@supabase/ssr', '@supabase/supabase-js'],
  
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.mjs': ['.mjs', '.mts'],
    };
    return config;
  },
};

export default nextConfig;
