"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import {
  clearPendingSignupEmail,
  getPendingSignupEmail,
  setPendingSignupEmail,
} from "@/lib/auth/pending-signup"
import {
  feedbackPath,
  getApplicationOrigin,
  safeNextPath,
} from "@/lib/auth/urls"

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
})

const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your name."),
    email: z.email("Enter a valid email address."),
    password: z.string().min(8, "Use at least 8 characters for your password."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "The passwords do not match.",
    path: ["confirmPassword"],
  })

const emailSchema = z.object({
  email: z.email("Enter a valid email address."),
})

const passwordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters for your password."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "The passwords do not match.",
    path: ["confirmPassword"],
  })

const signupOtpSchema = z.object({
  token: z.string().regex(/^\d{6}$/, "Enter the six-digit code."),
})

type SignUpField = "fullName" | "email" | "password" | "confirmPassword"

export type SignUpActionState = {
  status: "idle" | "error"
  code?: "account_may_exist"
  message?: string
  fieldErrors?: Partial<Record<SignUpField, string>>
}

export type OtpActionState = {
  status: "idle" | "error" | "success"
  message?: string
  sentAt?: number
}

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check the details and try again."
}

function authErrorMessage(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes("invalid login credentials")) {
    return "The email or password is incorrect."
  }

  if (normalized.includes("email not confirmed")) {
    return "Confirm your email before signing in."
  }

  if (normalized.includes("provider is not enabled")) {
    return "Google sign-in is not configured yet."
  }

  if (normalized.includes("user already registered")) {
    return "An account with this email already exists."
  }

  if (
    normalized.includes("rate limit") ||
    normalized.includes("too many requests")
  ) {
    return "You've requested too many signups/emails. Please try again later or use a different email."
  }

  return "Authentication could not be completed. Please try again."
}

export async function signInWithPassword(formData: FormData) {
  const next = safeNextPath(formData.get("next"))
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    redirect(feedbackPath("/login", "error", firstIssue(parsed.error), next))
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    redirect(
      feedbackPath("/login", "error", authErrorMessage(error.message), next)
    )
  }

  redirect(next)
}

export async function signUpWithPassword(
  _previousState: SignUpActionState,
  formData: FormData
): Promise<SignUpActionState> {
  const next = safeNextPath(formData.get("next"))
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  })

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors

    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors: {
        fullName: errors.fullName?.[0],
        email: errors.email?.[0],
        password: errors.password?.[0],
        confirmPassword: errors.confirmPassword?.[0],
      },
    }
  }

  const supabase = await createServerSupabaseClient()
  const origin = await getApplicationOrigin()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error) {
    console.error("Supabase Auth Error:", error)
    return { status: "error", message: authErrorMessage(error.message) }
  }

  if (
    data.user &&
    Array.isArray(data.user.identities) &&
    data.user.identities.length === 0
  ) {
    await clearPendingSignupEmail()

    return {
      status: "error",
      code: "account_may_exist",
      message:
        "No verification email was sent. This address may already have an account.",
    }
  }

  if (data.session) {
    await clearPendingSignupEmail()
    redirect(next)
  }

  await setPendingSignupEmail(parsed.data.email)
  redirect(`/signup/verify?next=${encodeURIComponent(next)}`)
}

export async function verifySignupOtp(
  _previousState: OtpActionState,
  formData: FormData
): Promise<OtpActionState> {
  const next = safeNextPath(formData.get("next"))
  const email = await getPendingSignupEmail()
  const parsed = signupOtpSchema.safeParse({ token: formData.get("token") })

  if (!email) {
    return {
      status: "error",
      message:
        "Your verification session expired. Start again with your email.",
    }
  }

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) }
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: parsed.data.token,
    type: "email",
  })

  if (error) {
    return {
      status: "error",
      message:
        "That code is incorrect or expired. Check the code and try again.",
    }
  }

  await clearPendingSignupEmail()
  redirect(next)
}

export async function resendSignupOtp(
  _previousState: OtpActionState,
  _formData: FormData
): Promise<OtpActionState> {
  void _previousState
  void _formData

  const email = await getPendingSignupEmail()

  if (!email) {
    return {
      status: "error",
      message: "Your verification session expired. Start the signup again.",
    }
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.resend({ type: "signup", email })

  if (error) {
    return {
      status: "error",
      message: "A new code could not be sent yet. Wait a moment and try again.",
    }
  }

  return {
    status: "success",
    message: "A fresh code is on its way.",
    sentAt: Date.now(),
  }
}

export async function restartSignup(formData: FormData) {
  const next = safeNextPath(formData.get("next"))
  await clearPendingSignupEmail()
  redirect(`/signup?next=${encodeURIComponent(next)}`)
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNextPath(formData.get("next"))
  const authPath = formData.get("authPath") === "/signup" ? "/signup" : "/login"
  const origin = await getApplicationOrigin()
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error || !data.url) {
    redirect(
      feedbackPath(
        authPath,
        "error",
        authErrorMessage(error?.message ?? "OAuth URL was not returned"),
        next
      )
    )
  }

  redirect(data.url)
}

export async function requestPasswordReset(formData: FormData) {
  const parsed = emailSchema.safeParse({ email: formData.get("email") })

  if (!parsed.success) {
    redirect(
      feedbackPath("/forgot-password", "error", firstIssue(parsed.error))
    )
  }

  const origin = await getApplicationOrigin()
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${origin}/auth/callback?next=/update-password`,
    }
  )

  if (error) {
    redirect(
      feedbackPath(
        "/forgot-password",
        "error",
        "The reset email could not be sent. Please try again."
      )
    )
  }

  redirect(
    feedbackPath(
      "/forgot-password",
      "notice",
      "If an account exists for that email, a reset link is on its way."
    )
  )
}

export async function updatePassword(formData: FormData) {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  })

  if (!parsed.success) {
    redirect(
      feedbackPath("/update-password", "error", firstIssue(parsed.error))
    )
  }

  const supabase = await createServerSupabaseClient()
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims()

  if (claimsError || !claimsData?.claims?.sub) {
    redirect(
      feedbackPath(
        "/forgot-password",
        "error",
        "That reset link is invalid or has expired. Request a new one."
      )
    )
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    redirect(
      feedbackPath(
        "/update-password",
        "error",
        "Your password could not be updated. Please try again."
      )
    )
  }

  redirect(feedbackPath("/dashboard", "notice", "Your password was updated."))
}

export async function signOut() {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect(feedbackPath("/login", "notice", "You have been signed out."))
}
