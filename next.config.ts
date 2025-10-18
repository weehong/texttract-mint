import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization for S3 URLs
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.amazonaws.com", // S3 bucket domain
      },
    ],
  },

  // Environment variable validation
  // Required environment variables for the application:
  // - AWS_REGION
  // - AWS_ACCESS_KEY_ID
  // - AWS_SECRET_ACCESS_KEY
  // - AWS_S3_BUCKET_NAME
  // - NEXT_PUBLIC_APP_URL
};

export default nextConfig;
