import type { NextConfig } from "next"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

const nextConfig: NextConfig = {
  experimental: {
    turbopackFileSystemCacheForDev: false,
    serverActions: { bodySizeLimit: "6mb" },
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "recharts",
      "katex",
      "@tanstack/react-table",
      "motion",
      "@tanstack/react-query",
    ],
  },
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
  allowedDevOrigins: [
    "10.143.81.162",
    "192.168.0.172",
    "127.0.0.1",
    "localhost",
  ],
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: "/mock-test/:path*",
        destination: "/assessments/:path*",
        permanent: false,
      },
      {
        source: "/assesments/:path*",
        destination: "/assessments/:path*",
        permanent: false,
      },
      {
        source: "/workspace/:slug/mock-tests",
        destination: "/workspace/:slug/assessments",
        permanent: false,
      },
      {
        source: "/workspace/:slug/mock-tests/:path*",
        destination: "/workspace/:slug/assessments/:path*",
        permanent: false,
      },
      {
        source: "/workspace/:slug/mock-test",
        destination: "/workspace/:slug/assessments",
        permanent: false,
      },
      {
        source: "/workspace/:slug/mock-test/:path*",
        destination: "/workspace/:slug/assessments/:path*",
        permanent: false,
      },
      {
        source: "/workspace/:slug/assesments",
        destination: "/workspace/:slug/assessments",
        permanent: false,
      },
      {
        source: "/workspace/:slug/assesments/:path*",
        destination: "/workspace/:slug/assessments/:path*",
        permanent: false,
      },
    ]
  },
}

export default nextConfig
