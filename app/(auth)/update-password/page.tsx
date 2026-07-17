import type { Metadata } from "next"
import { KeyRoundIcon } from "lucide-react"

import { AuthFeedback } from "@/components/auth/auth-feedback"
import { AuthFormSurface } from "@/components/auth/auth-form-surface"
import { PasswordInput } from "@/components/auth/password-input"
import { SubmitButton } from "@/components/auth/submit-button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { updatePassword } from "@/lib/auth/actions"

export const metadata: Metadata = { title: "Choose new password" }

type UpdatePasswordPageProps = {
  searchParams: Promise<{ error?: string; notice?: string }>
}

export default async function UpdatePasswordPage({
  searchParams,
}: UpdatePasswordPageProps) {
  const params = await searchParams

  return (
    <AuthFormSurface
      eyebrow="Account recovery"
      title="Choose a new password."
      description="Use at least 8 characters and make it different from your old password."
    >
      <form action={updatePassword}>
        <FieldGroup className="gap-5">
          <AuthFeedback error={params.error} notice={params.notice} />
          <Field>
            <FieldLabel htmlFor="password" className="text-foreground">
              New password
            </FieldLabel>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="confirmPassword" className="text-foreground">
              Confirm new password
            </FieldLabel>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>
          <SubmitButton
            className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
            pendingLabel="Updating password..."
          >
            <KeyRoundIcon data-icon="inline-start" />
            Update password
          </SubmitButton>
        </FieldGroup>
      </form>
    </AuthFormSurface>
  )
}
