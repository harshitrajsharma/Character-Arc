import type { NextConfig } from "next"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

const nextConfig: NextConfig = {
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
  allowedDevOrigins: ["10.41.226.162", "127.0.0.1", "localhost"],
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
