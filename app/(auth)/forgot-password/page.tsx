import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeftIcon, SendIcon } from "lucide-react"

import { AuthFeedback } from "@/components/auth/auth-feedback"
import { AuthFormSurface } from "@/components/auth/auth-form-surface"
import { AuthInput } from "@/components/auth/auth-input"
import { SubmitButton } from "@/components/auth/submit-button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { requestPasswordReset } from "@/lib/auth/actions"

export const metadata: Metadata = { title: "Reset password" }

type ForgotPasswordPageProps = {
  searchParams: Promise<{ error?: string; notice?: string }>
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams

  return (
    <AuthFormSurface
      eyebrow="Account recovery"
      title="Find your way back."
      description="Enter your email and we will send you a secure password reset link."
    >
      <form action={requestPasswordReset}>
        <FieldGroup className="gap-5">
          <AuthFeedback error={params.error} notice={params.notice} />
          <Field>
            <FieldLabel htmlFor="email" className="text-foreground">
              Email
            </FieldLabel>
            <AuthInput
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </Field>
          <SubmitButton
            className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
            pendingLabel="Sending link..."
          >
            <SendIcon data-icon="inline-start" />
            Send reset link
          </SubmitButton>
          <Link
            href="/login"
            className="mx-auto inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            Back to sign in
          </Link>
        </FieldGroup>
      </form>
    </AuthFormSurface>
  )
}
