import { headers } from "next/headers"

export function safeNextPath(
  value: FormDataEntryValue | string | null | undefined
) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020\u007f]/.test(value)
  ) {
    return "/workspace"
  }

  try {
    const base = "https://character-arc.invalid"
    const destination = new URL(value, base)
    const pathname = decodeURIComponent(destination.pathname)
    if (
      destination.origin !== base ||
      pathname.startsWith("//") ||
      /[\\\u0000-\u001f\u007f]/.test(pathname)
    )
      return "/workspace"
    return value
  } catch {
    return "/workspace"
  }
}

export async function getApplicationOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL)
    if (
      !["http:", "https:"].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash ||
      (process.env.NODE_ENV === "production" && origin.protocol !== "https:")
    )
      throw new Error(
        "NEXT_PUBLIC_SITE_URL must be a trusted HTTP(S) origin (HTTPS in production)."
      )
    return origin.origin
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Set NEXT_PUBLIC_SITE_URL before serving production authentication flows."
    )
  }

  const requestHeaders = await headers()
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http"

  return host ? `${protocol}://${host}` : "http://localhost:3000"
}

export function feedbackPath(
  pathname: string,
  kind: "error" | "notice",
  message: string,
  next?: string
) {
  const params = new URLSearchParams({ [kind]: message })

  if (next) {
    params.set("next", safeNextPath(next))
  }

  return `${pathname}?${params.toString()}`
}
