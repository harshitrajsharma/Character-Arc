import type { Metadata } from "next"
import { notFound } from "next/navigation"

import {
  getCommunityPaperDetail,
  getCommunityPaperLeaderboard,
} from "@/lib/tools/definitions/mock-tests/repository"
import { getAppShellData } from "@/lib/workspaces/workspace-access"
import { getVerifiedClaims } from "@/lib/auth/session"
import { CommunityPaperLanding } from "@/components/tools/mock-tests/community-paper-landing"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ assessmentId: string }>
}): Promise<Metadata> {
  const { assessmentId } = await params
  const paper = await getCommunityPaperDetail(assessmentId)
  if (!paper) {
    return { title: "Mock Test Paper Not Found" }
  }
  return {
    title: `${paper.title} — Mock Test Paper`,
    description:
      paper.summary ??
      `Practice ${paper.title} with ${paper.questionCount} questions and live cohort leaderboard.`,
  }
}

export default async function CommunityPaperSharePage({
  params,
}: {
  params: Promise<{ assessmentId: string }>
}) {
  const { assessmentId } = await params
  const [paper, leaderboard, memberships] = await Promise.all([
    getCommunityPaperDetail(assessmentId),
    getCommunityPaperLeaderboard(assessmentId),
    getVerifiedClaims().then((claims) => (claims ? getAppShellData() : [])),
  ])

  if (!paper) {
    notFound()
  }

  // Find user's active/default workspace slug
  const userWorkspaceSlug = memberships[0]?.slug
  const isAuthorOrInSameWorkspace = memberships.some(
    (m) => m.slug === paper.workspaceSlug
  )

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-20 pb-12 sm:pb-16 md:px-6 xl:px-8">
      <CommunityPaperLanding
        paper={paper}
        leaderboard={leaderboard}
        userWorkspaceSlug={userWorkspaceSlug}
        isAuthorOrInSameWorkspace={isAuthorOrInSameWorkspace}
      />
    </main>
  )
}
