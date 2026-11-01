import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: ["ffmpeg-static", "ffprobe-static"],
  // Don't hot-reload the app when uploads, encoded videos or the database change.
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/node_modules/**", "**/.git/**", "**/storage/**", "**/prisma/*.db*", "**/*.mp4"],
      };
    }
    return config;
  },
  experimental: {
    serverActions: { bodySizeLimit: "2gb" },
  },
};

export default withNextIntl(nextConfig);
