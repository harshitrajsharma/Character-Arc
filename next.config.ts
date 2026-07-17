import type { NextConfig } from "next"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

const nextConfig: NextConfig = {
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
  allowedDevOrigins: ['10.180.195.162'],
}


export default nextConfig
