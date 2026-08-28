"use client"

import { useEffect, useRef } from "react"
import { CircleAlertIcon, CircleCheckIcon } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const ERROR_NEXT_STEPS: Array<{ match: RegExp; nextStep: string }> = [
  {
    match: /email or password is incorrect/i,
    nextStep: "Check your email and password, then try again.",
  },
  {
    match: /confirm your email/i,
    nextStep: "Open the verification link in your inbox, then sign in again.",
  },
  {
    match: /already (registered|exists|have an account)/i,
    nextStep: "Sign in instead, or use a different email address.",
  },
  {
    match: /rate limit|too many/i,
    nextStep: "Wait a few minutes before requesting more emails.",
  },
  {
    match: /reset link is invalid or has expired/i,
    nextStep: "Request a fresh reset link from the forgot-password page.",
  },
  {
    match: /code is incorrect or expired/i,
    nextStep: "Type a fresh code from your inbox, or resend a new one.",
  },
  {
    match: /code could not be sent/i,
    nextStep: "Wait a few seconds, then press Resend code again.",
  },
  {
    match: /could not be sent/i,
    nextStep: "Check your connection and try again in a moment.",
  },
  {
    match: /could not be updated/i,
    nextStep: "Try again, or request a new reset link if it keeps failing.",
  },
  {
    match: /passwords do not match/i,
    nextStep: "Re-enter both passwords so they are identical.",
  },
  {
    match: /at least 8 characters/i,
    nextStep: "Add a few more characters and try again.",
  },
  {
    match: /google sign-in is not configured/i,
    nextStep: "Use email sign-in meanwhile.",
  },
  {
    match: /session expired/i,
    nextStep: "Start again with your email to continue.",
  },
  {
    match: /highlighted fields/i,
    nextStep: "Fix the fields marked below, then submit again.",
  },
]

function nextStepFor(message: string) {
  return ERROR_NEXT_STEPS.find((entry) => entry.match.test(message))?.nextStep
}

export function AuthFeedback({
  error,
  notice,
  className,
}: {
  error?: string
  notice?: string
  className?: string
}) {
  const lastShownError = useRef<string | undefined>(undefined)
  const lastShownNotice = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (error && error !== lastShownError.current) {
      toast.error(error)
      lastShownError.current = error
    }

    if (notice && notice !== lastShownNotice.current) {
      toast.success(notice)
      lastShownNotice.current = notice
    }
  }, [error, notice])

  if (!error && !notice) {
    return null
  }

  if (notice) {
    return (
      <Alert className={className}>
        <CircleCheckIcon aria-hidden="true" />
        <AlertTitle>{notice}</AlertTitle>
      </Alert>
    )
  }

  const nextStep = nextStepFor(error ?? "")

  return (
    <Alert variant="destructive" className={className}>
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>{error}</AlertTitle>
      <AlertDescription>
        {nextStep ?? "Check the details and try again."}
      </AlertDescription>
    </Alert>
  )
}
