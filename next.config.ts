import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: [
    "127.0.0.1",
    "0.0.0.0",
    "172.30.0.2",
    "172.17.0.1",
    "*.cursor.sh",
    "**.cursor.sh",
    "*.cursor.com",
    "**.cursor.com",
    "*.cursorvm.com",
    "**.cursorvm.com",
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
