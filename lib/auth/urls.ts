import { headers } from "next/headers"

export function safeNextPath(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard"
  }

  return value
}

export async function getApplicationOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
  }

  const requestHeaders = await headers()
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http"

  return host ? `${protocol}://${host}` : "http://localhost:3000"
}

export function feedbackPath(
  pathname: string,
  kind: "error" | "notice",
  message: string,
  next?: string,
) {
  const params = new URLSearchParams({ [kind]: message })

  if (next) {
    params.set("next", safeNextPath(next))
  }

  return `${pathname}?${params.toString()}`
}
