import type { NextConfig } from "next";

const pagesBasePath = process.env.PAGES_BASE_PATH;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  ...(pagesBasePath
    ? {
        output: "export" as const,
        basePath: pagesBasePath,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
