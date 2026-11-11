import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getVerifiedClaims } from "@/lib/auth/session"
import { LandingPage } from "@/components/landing/landing-page"

export const metadata: Metadata = {
  title: {
    absolute: "Character Arc — your exam preparation, connected",
  },
  description:
    "Keep your syllabus, subject tests and attempt history together. Prepare with Exam Prep and Assessments, and connect a compatible AI agent when you need help.",
}

export default async function HomePage() {
  const claims = await getVerifiedClaims()

  if (claims) {
    redirect("/workspace")
  }

  return <LandingPage />
}
