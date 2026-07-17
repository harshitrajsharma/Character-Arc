import type { Metadata } from "next"
import Link from "next/link"
import { LogInIcon } from "lucide-react"

import { AuthFeedback } from "@/components/auth/auth-feedback"
import { AuthFormSurface } from "@/components/auth/auth-form-surface"
import { AuthInput } from "@/components/auth/auth-input"
import { PasswordInput } from "@/components/auth/password-input"
import { SubmitButton } from "@/components/auth/submit-button"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { signInWithGoogle, signInWithPassword } from "@/lib/auth/actions"
import { safeNextPath } from "@/lib/auth/urls"
import Image from "next/image"

export const metadata: Metadata = { title: "Sign in" }

type LoginPageProps = {
  searchParams: Promise<{
    error?: string
    notice?: string
    next?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const next = safeNextPath(params.next)

  return (
    <AuthFormSurface
      eyebrow="Welcome back"
      title="Continue your arc."
      description="Your lore and next moves are right where you left them."
    >
      <FieldGroup className="gap-5">
        <AuthFeedback error={params.error} notice={params.notice} />

        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="authPath" value="/login" />
          <SubmitButton
            variant="outline"
            className="h-11 w-full space-x-2 border-border bg-card/70 text-foreground hover:bg-muted hover:text-foreground"
            pendingLabel="Opening Google..."
          >
            <Image alt="google" src="/g-logo.png" height={16} width={16} />
            <p>Continue with Google</p>
          </SubmitButton>
        </form>

        <FieldSeparator className="field-separator text-muted-foreground">
          or use email
        </FieldSeparator>

        <form action={signInWithPassword}>
          <input type="hidden" name="next" value={next} />
          <FieldGroup className="gap-5">
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
            <Field>
              <div className="flex items-center justify-between gap-4">
                <FieldLabel htmlFor="password" className="text-foreground">
                  Password
                </FieldLabel>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </Field>
            <SubmitButton
              className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              pendingLabel="Signing in..."
            >
              <LogInIcon data-icon="inline-start" />
              Sign in
            </SubmitButton>
          </FieldGroup>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          New to Character Arc?{" "}
          <Link
            href={`/signup?next=${encodeURIComponent(next)}`}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </FieldGroup>
    </AuthFormSurface>
  )
}
