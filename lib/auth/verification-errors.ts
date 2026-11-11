/** An outage cannot establish an identity, but it also does not prove logout. */
export function isAuthServiceUnavailable(error: unknown) {
  if (!error || typeof error !== "object") return false
  const candidate = error as {
    name?: string
    status?: number
    message?: string
  }
  return (
    candidate.status === 0 ||
    candidate.status === 429 ||
    (typeof candidate.status === "number" && candidate.status >= 500) ||
    candidate.name === "AuthRetryableFetchError" ||
    (candidate.name === "TypeError" &&
      /fetch|network/i.test(candidate.message ?? ""))
  )
}

export class AuthVerificationUnavailableError extends Error {
  constructor() {
    super("Sign-in verification is temporarily unavailable. Please try again.")
    this.name = "AuthVerificationUnavailableError"
  }
}

/** Opt-in server diagnostics contain no cookies, tokens, IDs or provider message. */
export function reportAuthVerificationFailure(stage: string, error: unknown) {
  if (process.env.AUTH_DIAGNOSTICS !== "1") return
  const failure = error as {
    name?: unknown
    code?: unknown
    status?: unknown
  } | null
  console.warn("Auth verification failed", {
    stage,
    name:
      typeof failure?.name === "string" ? failure.name : "UnverifiedIdentity",
    code: typeof failure?.code === "string" ? failure.code : undefined,
    status: typeof failure?.status === "number" ? failure.status : undefined,
  })
}
