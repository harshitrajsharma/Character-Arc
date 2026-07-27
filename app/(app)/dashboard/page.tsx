import type { Metadata } from "next"
import Link from "next/link"
import {
  BlocksIcon,
  BookOpenCheckIcon,
  CircleAlertIcon,
  CompassIcon,
  PlugZapIcon,
  PlusIcon,
  SparklesIcon,
  TargetIcon,
  type LucideIcon,
} from "lucide-react"

import { AuthFeedback } from "@/components/auth/auth-feedback"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { requireVerifiedClaims } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Dashboard" }

type DashboardPageProps = {
  searchParams: Promise<{ notice?: string }>
}

type ToolPreview = {
  title: string
  description: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
}

const toolPreviews: ToolPreview[] = [
  {
    title: "Goals and paths",
    description:
      "Keep future options, decisions, and the next milestone visible.",
    icon: TargetIcon,
    iconBg: "bg-brand-neon-soft",
    iconColor: "text-brand-neon-ink",
  },
  {
    title: "Exam preparation",
    description:
      "Track subjects, practice, attempts, and evidence of progress.",
    icon: BookOpenCheckIcon,
    iconBg: "bg-brand-cyan-soft",
    iconColor: "text-brand-cyan-ink",
  },
  {
    title: "Connections",
    description: "Bring calendars and external AI agents into your system.",
    icon: PlugZapIcon,
    iconBg: "bg-brand-violet-soft",
    iconColor: "text-brand-violet-ink",
  },
]

const colorForVariant = {
  neon: "border-brand-neon-line bg-brand-neon-soft/40",
  cyan: "border-brand-cyan-line bg-brand-cyan-soft/40",
  violet: "border-brand-violet-line bg-brand-violet-soft/40",
} as const

function firstName(displayName: string | null | undefined, email: unknown) {
  if (displayName?.trim()) {
    return displayName.trim().split(" ")[0]
  }

  return typeof email === "string" ? email.split("@")[0] : "there"
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams
  const claims = await requireVerifiedClaims()

  const [profile, membership] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: claims.sub },
      select: { displayName: true, avatarUrl: true, timezone: true, locale: true },
    }),
    prisma.workspaceMember.findFirst({
      where: { userId: claims.sub },
      select: { workspaceId: true, role: true },
    }),
  ])

  const workspace = membership
    ? await prisma.workspace.findUnique({
        where: { id: membership.workspaceId },
        select: { id: true, name: true, slug: true, kind: true, createdAt: true },
      })
    : null

  const setupFailed = !profile || !membership || !workspace
  const name = firstName(profile?.displayName, claims.email)

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-24 pb-8 md:px-6 xl:px-10">
      <div className="rounded-4xl border border-brand-violet-line bg-brand-violet-soft/30 px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Today
            </p>
            <h1 className="font-heading text-3xl font-semibold tracking-normal sm:text-4xl">
              Good to see you, {name}.
            </h1>
            <p className="mt-2 max-w-lg text-base leading-7 text-muted-foreground">
              Pick one meaningful next move. Character Arc will keep the outcome
              ready for you and your agents.
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 self-start sm:mt-1">
            {workspace?.name ?? "Personal workspace"}
          </Badge>
        </div>

        <div className="mt-6 max-w-3xl">
          <AuthFeedback notice={params.notice} />
        </div>

        {setupFailed ? (
          <Alert variant="destructive" className="mt-6">
            <CircleAlertIcon />
            <AlertTitle>
              Your account exists, but its workspace is incomplete
            </AlertTitle>
            <AlertDescription>
              Check the Supabase signup trigger and RLS policies before creating
              app data.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-8 grid divide-y rounded-3xl border border-foreground/5 bg-background/50 md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="flex items-center gap-3 px-5 py-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-neon-soft text-brand-neon-ink">
              <BlocksIcon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{workspace?.name}</p>
              <p className="text-xs text-muted-foreground">Personal workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 py-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-cyan-soft text-brand-cyan-ink">
              <SparklesIcon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium capitalize">
                {membership?.role.toLowerCase() ?? "member"}
              </p>
              <p className="text-xs text-muted-foreground">Workspace role</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 py-4">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl",
                setupFailed
                  ? "bg-destructive/10 text-destructive"
                  : "bg-success/10 text-success-ink"
              )}
            >
              <CompassIcon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {setupFailed ? "Needs attention" : "Ready to build"}
              </p>
              <p className="text-xs text-muted-foreground">Account status</p>
            </div>
          </div>
        </div>
      </div>

      <section aria-labelledby="current-arc-title" className="mt-12">
        <Empty className="mx-auto max-w-xl">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TargetIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle id="current-arc-title">
              Choose your current arc
            </EmptyTitle>
            <EmptyDescription>
              Start with the part of life you want to move forward. Your first
              installed tool will turn it into a clear, repeatable loop.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              href="/tools"
              className={buttonVariants({ variant: "secondary" })}
            >
              <PlusIcon aria-hidden="true" />
              Choose a starting tool
            </Link>
          </EmptyContent>
        </Empty>
      </section>

      <section id="tools" className="mt-14 scroll-mt-24">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Tools
            </p>
            <h2 className="mt-1 font-heading text-2xl font-semibold">
              Choose your first useful loop
            </h2>
          </div>
          <Badge variant="secondary" className="shrink-0">
            Foundation
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {toolPreviews.map((tool) => {
            const Icon = tool.icon

            return (
              <Card
                key={tool.title}
                size="sm"
                className="group/card transition-all duration-200 hover:shadow-lg"
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        tool.iconBg,
                        tool.iconColor
                      )}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <CardTitle>{tool.title}</CardTitle>
                      <CardDescription className="mt-1.5 line-clamp-2">
                        {tool.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex w-fit items-center gap-1.5 rounded-full border border-foreground/5 bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors group-hover/card:bg-muted">
                    <span className="size-1.5 rounded-full bg-brand-amber" />
                    Coming next
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>
    </main>
  )
}
