import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  // Enable the serverless runtime for API routes
  // and allow file system access
  experimental: {
    serverComponentsExternalPackages: ['fs', 'path', 'child_process'],
  },
};

export default nextConfig;
