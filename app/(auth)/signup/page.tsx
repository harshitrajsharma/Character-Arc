import type { Metadata } from "next"

import { AuthFormSurface } from "@/components/auth/auth-form-surface"
import { SignupFlow } from "@/components/auth/signup-flow"
import { safeNextPath } from "@/lib/auth/urls"

export const metadata: Metadata = { title: "Create account" }

type SignUpPageProps = {
  searchParams: Promise<{ error?: string; notice?: string; next?: string }>
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams
  const next = safeNextPath(params.next)

  return (
    <AuthFormSurface
      eyebrow="New chapter"
      title="Start your Character Arc."
      description="Begin with an email or use Google."
    >
      <SignupFlow
        next={next}
        initialError={params.error}
        initialNotice={params.notice}
      />
    </AuthFormSurface>
  )
}
