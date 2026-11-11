import { writeFile } from "node:fs/promises"
import type { Page, Request } from "playwright"

type BrowserSession = { access_token?: string }
function sessionToken(cookies: Array<{ name: string; value: string }>) {
  const parts = cookies
    .filter((cookie) => /-auth-token(?:\.\d+)?$/.test(cookie.name))
    .sort(
      (a, b) =>
        Number(a.name.split(".").at(-1) ?? 0) -
        Number(b.name.split(".").at(-1) ?? 0)
    )
  const encoded = parts.map((cookie) => cookie.value).join("")
  try {
    return (
      JSON.parse(
        encoded.startsWith("base64-")
          ? Buffer.from(encoded.slice(7), "base64url").toString("utf8")
          : decodeURIComponent(encoded)
      ) as BrowserSession
    ).access_token
  } catch {
    return undefined
  }
}
function cookiePairs(value: string) {
  return value
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const i = item.indexOf("=")
      return { name: item.slice(0, i), value: item.slice(i + 1) }
    })
}
function safeRedirect(value: string | undefined, base: string) {
  if (!value) return null
  try {
    const url = new URL(value.split(";")[0], base)
    return {
      origin: url.origin,
      path: url.pathname,
      next: url.searchParams.get("next"),
    }
  } catch {
    return "present"
  }
}

/** Records presence/status only. Credentials stay in memory and are never returned or saved. */
export function attachBrowserAuthDiagnostics(page: Page, base: string) {
  const actions: Array<Record<string, unknown>> = []
  const records = new Map<Request, Record<string, unknown>>()
  const pending: Promise<unknown>[] = []
  let lastToken: string | undefined
  page.on("request", (request) => {
    if (request.method() !== "POST" || !request.headers()["next-action"]) return
    const record: Record<string, unknown> = {
      path: new URL(request.url()).pathname,
      startedAt: new Date().toISOString(),
    }
    records.set(request, record)
    actions.push(record)
    pending.push(
      (async () => {
        const headers = await request.allHeaders()
        const cookies = cookiePairs(headers.cookie ?? "")
        lastToken = sessionToken(cookies) ?? lastToken
        Object.assign(record, {
          cookiePresent: !!headers.cookie,
          cookieCount: cookies.length,
          authCookieChunkCount: cookies.filter((c) =>
            /-auth-token(?:\.\d+)?$/.test(c.name)
          ).length,
        })
      })().catch(() => {
        record.requestHeaderInspection = "unavailable"
      })
    )
  })
  page.on("response", (response) => {
    const record = records.get(response.request())
    if (!record) return
    pending.push(
      (async () => {
        const headers = await response.allHeaders()
        Object.assign(record, {
          status: response.status(),
          location: safeRedirect(headers.location, base),
          actionRedirect: safeRedirect(headers["x-action-redirect"], base),
          setCookiePresent: !!headers["set-cookie"],
          clearedAuthCookie:
            !!headers["set-cookie"] &&
            /-auth-token[^=]*=;(?:[^\n]*Max-Age=0)?/i.test(
              headers["set-cookie"]
            ),
        })
      })().catch(() => {
        record.responseHeaderInspection = "unavailable"
      })
    )
  })
  return async (label: string) => {
    await Promise.allSettled(pending)
    const cookies = await page.context().cookies(base)
    const token = sessionToken(cookies) ?? lastToken
    let tokenState: Record<string, unknown> = {
      present: !!token,
      source: sessionToken(cookies)
        ? "current-browser-cookie"
        : "last-action-cookie",
    }
    let directGetUser: Record<string, unknown> = { attempted: false }
    if (token) {
      try {
        const payload = JSON.parse(
          Buffer.from(token.split(".")[1], "base64url").toString("utf8")
        ) as { exp?: number; sub?: string }
        tokenState = {
          ...tokenState,
          secondsUntilExpiry: payload.exp
            ? payload.exp - Math.floor(Date.now() / 1000)
            : null,
        }
        const authUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        if (authUrl && key) {
          const started = Date.now()
          try {
            const response = await fetch(new URL("/auth/v1/user", authUrl), {
              headers: { apikey: key, Authorization: `Bearer ${token}` },
              signal: AbortSignal.timeout(15000),
            })
            const result = (await response.json()) as {
              id?: string
              code?: string
              error_code?: string
            }
            const errorCode = result.error_code ?? result.code
            directGetUser = {
              attempted: true,
              status: response.status,
              durationMs: Date.now() - started,
              userMatchesToken: response.ok && result.id === payload.sub,
              errorCode:
                errorCode && /^[a-zA-Z0-9_-]{1,80}$/.test(errorCode)
                  ? errorCode
                  : undefined,
            }
          } catch (error) {
            const errorName = error instanceof Error ? error.name : "Unknown"
            const cause = error instanceof Error ? error.cause : undefined
            const causeCode =
              cause && typeof cause === "object" && "code" in cause
                ? String(cause.code)
                : undefined
            directGetUser = {
              attempted: true,
              status: "probe-error",
              errorName,
              causeCode:
                causeCode && /^[a-zA-Z0-9_-]{1,80}$/.test(causeCode)
                  ? causeCode
                  : undefined,
              durationMs: Date.now() - started,
            }
          }
        }
      } catch {
        tokenState = { present: true, decodable: false }
      }
    }
    const current = new URL(page.url())
    const report = {
      label,
      base,
      currentUrl: {
        origin: current.origin,
        path: current.pathname,
        next: current.searchParams.get("next"),
      },
      cookieCount: cookies.length,
      authCookieChunkCount: cookies.filter((c) =>
        /-auth-token(?:\.\d+)?$/.test(c.name)
      ).length,
      tokenState,
      directGetUser,
      actions,
    }
    await writeFile(
      `scratch/release-auth-diagnostics-${new URL(base).port || "default"}.json`,
      JSON.stringify(report, null, 2)
    )
    console.log(
      `[Auth diagnostics] ${label}: ${current.pathname}; cookies=${cookies.length}; directGetUser=${directGetUser.status ?? "not-attempted"}. No credentials recorded.`
    )
  }
}
