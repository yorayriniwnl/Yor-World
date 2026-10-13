import type { NextConfig } from "next";
import { frozenModelPaths } from "./src/security/policy";

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["pg", "@electric-sql/pglite"],
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ] }, ...frozenModelPaths.map((source) => ({ source, headers: [
      { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
    ] }))];
  },
};

export default config;
