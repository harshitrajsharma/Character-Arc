import { config } from "dotenv"

config({ path: ".env.local", quiet: true })
config({ quiet: true })

/** Browser verification must use explicit local secrets, never source literals. */
export function getBrowserTestConfig(
  environment: Record<string, string | undefined> = process.env
) {
  const required = (key: string) => {
    const value = environment[key]
    if (!value?.trim()) {
      throw new Error(
        `Set ${key} in your local environment before browser verification.`
      )
    }
    return value
  }
  const email = required("E2E_USER_EMAIL").trim()
  const password = required("E2E_USER_PASSWORD")
  const workspaceSlug = required("E2E_WORKSPACE_SLUG").trim()
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(workspaceSlug) ||
    workspaceSlug.length > 200
  ) {
    throw new Error(
      "E2E_WORKSPACE_SLUG must be a workspace slug, not a URL or path."
    )
  }
  let baseUrl: URL
  try {
    baseUrl = new URL(environment.E2E_BASE_URL || "http://127.0.0.1:3000")
  } catch {
    throw new Error("E2E_BASE_URL must be an HTTP(S) origin.")
  }
  if (
    !["http:", "https:"].includes(baseUrl.protocol) ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.search ||
    baseUrl.hash ||
    baseUrl.pathname !== "/"
  ) {
    throw new Error(
      "E2E_BASE_URL must be an HTTP(S) origin without credentials, a path or query."
    )
  }
  return { baseUrl: baseUrl.origin, email, password, workspaceSlug }
}

export function requireBrowserMutationOptIn(
  environment: Record<string, string | undefined> = process.env
) {
  if (environment.E2E_ALLOW_MUTATIONS !== "1") {
    throw new Error(
      "The full browser suite creates test records. Use a review mode, or set E2E_ALLOW_MUTATIONS=1 only for an authorized disposable workspace."
    )
  }
}
