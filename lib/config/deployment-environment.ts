type Environment = Record<string, string | undefined>

/** Reports variable names only; validation must never echo credentials. */
export function validateDeploymentEnvironment(
  environment: Environment,
  { production = false }: { production?: boolean } = {}
) {
  const errors: string[] = []
  const warnings: string[] = []
  const url = (key: string, protocols: string[], required = true) => {
    const raw = environment[key]?.trim()
    if (!raw) {
      if (required) errors.push(`${key} is required.`)
      return null
    }
    try {
      const parsed = new URL(raw)
      if (!protocols.includes(parsed.protocol) || !parsed.hostname)
        throw new Error()
      return parsed
    } catch {
      errors.push(`${key} has an invalid URL or protocol.`)
      return null
    }
  }
  const database = url("DATABASE_URL", ["postgres:", "postgresql:"])
  url("DIRECT_URL", ["postgres:", "postgresql:"], false)
  const supabase = url("NEXT_PUBLIC_SUPABASE_URL", [
    "https:",
    ...(production ? [] : ["http:"]),
  ])
  const site = url(
    "NEXT_PUBLIC_SITE_URL",
    ["https:", ...(production ? [] : ["http:"])],
    production
  )
  for (const [name, value] of [
    ["NEXT_PUBLIC_SUPABASE_URL", supabase],
    ["NEXT_PUBLIC_SITE_URL", site],
  ] as const) {
    if (
      value &&
      (value.username ||
        value.password ||
        value.search ||
        value.hash ||
        value.pathname !== "/")
    ) {
      errors.push(
        `${name} must be a plain origin without credentials, paths or query parameters.`
      )
    }
  }
  if (
    production &&
    site &&
    ["localhost", "127.0.0.1", "[::1]", "0.0.0.0"].includes(site.hostname)
  ) {
    errors.push(
      "NEXT_PUBLIC_SITE_URL must be the deployment's public HTTPS origin."
    )
  }
  const publicKey = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!publicKey)
    errors.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required.")
  if (publicKey?.startsWith("sb_secret_"))
    errors.push(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must not contain a server secret."
    )
  if (publicKey?.split(".").length === 3) {
    try {
      const payload = JSON.parse(
        Buffer.from(publicKey.split(".")[1], "base64url").toString("utf8")
      )
      if (payload.role === "service_role")
        errors.push(
          "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must not expose a service-role key."
        )
    } catch {
      errors.push(
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not a valid public key."
      )
    }
  }
  for (const entry of (environment.MCP_ALLOWED_ORIGINS ?? "")
    .split(",")
    .filter((value) => value.trim())) {
    try {
      const origin = new URL(entry.trim())
      if (
        origin.protocol !== "https:" ||
        origin.origin !== entry.trim() ||
        origin.username ||
        origin.password
      )
        throw new Error()
    } catch {
      errors.push(
        "MCP_ALLOWED_ORIGINS must contain exact HTTPS origins, without wildcards, credentials or paths."
      )
      break
    }
  }
  if (
    !environment.SUPABASE_SECRET_KEY &&
    !environment.SUPABASE_SERVICE_ROLE_KEY
  ) {
    warnings.push(
      "Question-image uploads are unavailable until a server-only storage key and private bucket are configured."
    )
  }
  if (production && database && !environment.DIRECT_URL)
    warnings.push(
      "Set DIRECT_URL to the migration connection before running Prisma migrations."
    )
  return { errors, warnings }
}
