"use client"

import { FormEvent, useActionState, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeftIcon, ArrowRightIcon, UserPlusIcon } from "lucide-react"

import { AuthFeedback } from "@/components/auth/auth-feedback"
import { AuthInput } from "@/components/auth/auth-input"
import { PasswordInput } from "@/components/auth/password-input"
import { SubmitButton } from "@/components/auth/submit-button"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import {
  type SignUpActionState,
  signInWithGoogle,
  signUpWithPassword,
} from "@/lib/auth/actions"

type SignupFlowProps = {
  next: string
  initialError?: string
  initialNotice?: string
}

const initialSignUpActionState: SignUpActionState = { status: "idle" }

function StepProgress({ step }: { step: 1 | 2 }) {
  return (
    <div
      className="mb-5 flex items-center gap-3"
      aria-label={`Step ${step} of 3`}
    >
      <span className="text-xs font-medium text-muted-foreground">
        {step} / 3
      </span>
      <div className="flex flex-1 gap-1.5" aria-hidden="true">
        {[1, 2, 3].map((item) => (
          <span
            key={item}
            className={`h-1 flex-1 rounded-full ${item <= step ? "bg-brand-neon" : "bg-border"}`}
          />
        ))}
      </div>
    </div>
  )
}

export function SignupFlow({
  next,
  initialError,
  initialNotice,
}: SignupFlowProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState("")
  const [state, signupAction] = useActionState(
    signUpWithPassword,
    initialSignUpActionState
  )

  function continueWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!event.currentTarget.reportValidity()) {
      return
    }

    setEmail((current) => current.trim())
    setStep(2)
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {step === 1 ? (
        <motion.div
          key="method"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <StepProgress step={1} />
          <FieldGroup className="gap-5">
            <AuthFeedback error={initialError} notice={initialNotice} />
            <form action={signInWithGoogle}>
              <input type="hidden" name="next" value={next} />
              <input type="hidden" name="authPath" value="/signup" />
              <SubmitButton
                variant="outline"
                className="h-11 w-full space-x-2 border-border bg-card/70 text-foreground hover:bg-muted hover:text-foreground"
                pendingLabel="Opening Google..."
              >
                <Image alt="" src="/g-logo.png" height={16} width={16} />
                Continue with Google
              </SubmitButton>
            </form>

            <FieldSeparator className="field-separator text-muted-foreground">
              or use email
            </FieldSeparator>

            <form onSubmit={continueWithEmail}>
              <FieldGroup className="gap-5">
                <Field>
                  <FieldLabel
                    htmlFor="signup-email"
                    className="text-foreground"
                  >
                    Email
                  </FieldLabel>
                  <AuthInput
                    id="signup-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoFocus
                  />
                </Field>
                <Button
                  type="submit"
                  className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Continue
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              </FieldGroup>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href={`/login?next=${encodeURIComponent(next)}`}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </FieldGroup>
        </motion.div>
      ) : (
        <motion.div
          key="details"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <StepProgress step={2} />
          <div className="mb-5 flex items-center justify-between gap-4 border-b border-border pb-4">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                Creating an account for
              </p>
              <p className="truncate text-sm font-medium text-foreground">
                {email}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setStep(1)}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Change
            </Button>
          </div>

          <form action={signupAction}>
            <input type="hidden" name="next" value={next} />
            <input type="hidden" name="email" value={email} />
            <FieldGroup className="gap-5">
              <AuthFeedback error={state.message} />
              {state.code === "account_may_exist" ? (
                <div className="flex items-center justify-between gap-4 border-b border-border pb-4 text-sm">
                  <span className="text-muted-foreground">
                    Already registered?
                  </span>
                  <Link
                    href={`/login?next=${encodeURIComponent(next)}`}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Sign in instead
                  </Link>
                </div>
              ) : null}
              <Field data-invalid={Boolean(state.fieldErrors?.fullName)}>
                <FieldLabel htmlFor="fullName" className="text-foreground">
                  Name
                </FieldLabel>
                <AuthInput
                  id="fullName"
                  name="fullName"
                  autoComplete="name"
                  placeholder="Your name"
                  aria-invalid={Boolean(state.fieldErrors?.fullName)}
                  required
                  autoFocus
                />
                <FieldError>{state.fieldErrors?.fullName}</FieldError>
              </Field>
              <Field data-invalid={Boolean(state.fieldErrors?.password)}>
                <FieldLabel htmlFor="password" className="text-foreground">
                  Password
                </FieldLabel>
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  placeholder="Create a password"
                  minLength={8}
                  aria-invalid={Boolean(state.fieldErrors?.password)}
                  required
                />
                <FieldDescription className="text-xs text-muted-foreground">
                  Use at least 8 characters.
                </FieldDescription>
                <FieldError>{state.fieldErrors?.password}</FieldError>
              </Field>
              <Field data-invalid={Boolean(state.fieldErrors?.confirmPassword)}>
                <FieldLabel
                  htmlFor="confirmPassword"
                  className="text-foreground"
                >
                  Confirm password
                </FieldLabel>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder="Type it again"
                  minLength={8}
                  aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
                  required
                />
                <FieldError>{state.fieldErrors?.confirmPassword}</FieldError>
              </Field>
              <SubmitButton
                className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                pendingLabel="Creating account..."
              >
                <UserPlusIcon data-icon="inline-start" />
                Create account
              </SubmitButton>
            </FieldGroup>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
