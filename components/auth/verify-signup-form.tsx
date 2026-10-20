"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import { CheckIcon, PencilIcon, RefreshCwIcon } from "lucide-react"

import { AuthFeedback } from "@/components/auth/auth-feedback"
import { AuthSteps } from "@/components/auth/auth-steps"
import { SubmitButton } from "@/components/auth/submit-button"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import {
  type OtpActionState,
  resendSignupOtp,
  restartSignup,
  verifySignupOtp,
} from "@/lib/auth/actions"

type VerifySignupFormProps = {
  maskedEmail: string
  next: string
}

const initialOtpActionState: OtpActionState = { status: "idle" }

export function VerifySignupForm({ maskedEmail, next }: VerifySignupFormProps) {
  const [code, setCode] = useState("")
  const [secondsLeft, setSecondsLeft] = useState(60)
  const formRef = useRef<HTMLFormElement>(null)
  const otpInputRef = useRef<HTMLInputElement>(null)
  const lastSubmittedCode = useRef("")
  const [verifyState, verifyAction, isVerifying] = useActionState(
    async (state: OtpActionState, formData: FormData) => {
      const result = await verifySignupOtp(state, formData)
      if (result.status === "error") {
        setCode("")
        lastSubmittedCode.current = ""
        otpInputRef.current?.focus()
      }
      return result
    },
    initialOtpActionState
  )
  const [resendState, resendAction] = useActionState(
    resendSignupOtp,
    initialOtpActionState
  )

  useEffect(() => {
    if (secondsLeft <= 0) {
      return
    }

    const timer = window.setTimeout(
      () => setSecondsLeft((value) => value - 1),
      1000
    )
    return () => window.clearTimeout(timer)
  }, [secondsLeft])

  useEffect(() => {
    if (
      code.length !== 6 ||
      isVerifying ||
      lastSubmittedCode.current === code
    ) {
      return
    }

    lastSubmittedCode.current = code
    formRef.current?.requestSubmit()
  }, [code, isVerifying])

  return (
    <FieldGroup className="gap-5">
      <AuthSteps current={3} total={3} />

      <div className="border-b border-border pb-4">
        <p className="text-xs text-muted-foreground">Code sent to</p>
        <p className="mt-1 text-sm font-medium text-foreground">
          {maskedEmail}
        </p>
      </div>

      <AuthFeedback error={verifyState.message} />

      <form ref={formRef} action={verifyAction}>
        <input type="hidden" name="next" value={next} />
        <FieldGroup className="gap-5">
          <Field data-invalid={verifyState.status === "error"}>
            <FieldLabel htmlFor="signup-code" className="text-foreground">
              Verification code
            </FieldLabel>
            <InputOTP
              id="signup-code"
              name="token"
              ref={otpInputRef}
              autoComplete="one-time-code"
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              containerClassName="w-full justify-center"
              value={code}
              onChange={setCode}
              aria-describedby="signup-code-help"
              autoFocus
              required
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className="size-11"
                    aria-invalid={verifyState.status === "error"}
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <FieldDescription
              id="signup-code-help"
              className="text-xs text-muted-foreground"
            >
              Paste the six-digit code. It submits automatically when complete.
            </FieldDescription>
          </Field>
          <SubmitButton
            className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
            pendingLabel="Checking code..."
          >
            <CheckIcon data-icon="inline-start" />
            Verify email
          </SubmitButton>
        </FieldGroup>
      </form>

      {resendState.message ? (
        <AuthFeedback
          error={
            resendState.status === "error" ? resendState.message : undefined
          }
          notice={
            resendState.status === "success" ? resendState.message : undefined
          }
        />
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <form
          action={resendAction}
          onSubmit={() => {
            setSecondsLeft(60)
            setCode("")
            lastSubmittedCode.current = ""
          }}
        >
          <SubmitButton
            type="submit"
            variant="ghost"
            size="sm"
            disabled={secondsLeft > 0}
            className="text-muted-foreground hover:bg-muted hover:text-foreground"
            pendingLabel="Sending..."
          >
            <RefreshCwIcon data-icon="inline-start" />
            {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"}
          </SubmitButton>
        </form>

        <form action={restartSignup}>
          <input type="hidden" name="next" value={next} />
          <SubmitButton
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:bg-muted hover:text-foreground"
            pendingLabel="Changing email..."
          >
            <PencilIcon data-icon="inline-start" />
            Change email
          </SubmitButton>
        </form>
      </div>
    </FieldGroup>
  )
}
