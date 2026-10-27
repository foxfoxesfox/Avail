import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Organizer links carry a secret in the path: never leak it via Referer.
  async headers() {
    const noReferrer = [{ key: "Referrer-Policy", value: "no-referrer" }];
    // /sign-in can carry an organizer path in ?next=; /invite carries the invite secret.
    // Every page: no framing (clickjacking), no MIME sniffing, no device APIs.
    const everywhere = [
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    return [
      { source: "/:path*", headers: everywhere },
      { source: "/s/:path*", headers: noReferrer }, { source: "/sign-in", headers: noReferrer }, { source: "/invite/:path*", headers: noReferrer },
    ];
  },
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
