import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AuthFormSurface } from "@/components/auth/auth-form-surface"
import { VerifySignupForm } from "@/components/auth/verify-signup-form"
import { getPendingSignupEmail, maskEmail } from "@/lib/auth/pending-signup"
import { safeNextPath } from "@/lib/auth/urls"

export const metadata: Metadata = { title: "Verify your email" }

type VerifySignupPageProps = {
  searchParams: Promise<{ next?: string }>
}

export default async function VerifySignupPage({
  searchParams,
}: VerifySignupPageProps) {
  const email = await getPendingSignupEmail()
  const params = await searchParams
  const next = safeNextPath(params.next)

  if (!email) {
    redirect(`/signup?next=${encodeURIComponent(next)}`)
  }

  return (
    <AuthFormSurface
      eyebrow="One last step"
      title="Check your inbox."
      description="Enter the six-digit code to verify your email and finish creating your account."
    >
      <VerifySignupForm maskedEmail={maskEmail(email)} next={next} />
    </AuthFormSurface>
  )
}
