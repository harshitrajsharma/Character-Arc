import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getVerifiedClaims } from "@/lib/auth/session"
import { LandingPage } from "@/components/landing/landing-page"

export const metadata: Metadata = {
  title: {
    absolute: "Character Arc — turn AI conversations into progress you can trust",
  },
  description:
    "Install strict tools like Exam Prep, Goals & Paths, and Mock Tests, use them yourself or through any AI agent, and see plans, practice, decisions, skills, and progress in one trustworthy place.",
}

export default async function HomePage() {
  const claims = await getVerifiedClaims()

  if (claims) {
    redirect("/dashboard")
  }

  return <LandingPage />
}
