import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Transpile Supabase packages to fix ESM/CJS interop issues
  transpilePackages: ['@supabase/ssr', '@supabase/supabase-js'],
};

export default nextConfig;
