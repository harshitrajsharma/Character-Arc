import type { Metadata } from "next"
import Link from "next/link"
import {
  BlocksIcon,
  BookOpenCheckIcon,
  CircleAlertIcon,
  PlusIcon,
  PlugZapIcon,
  TargetIcon,
  type LucideIcon,
} from "lucide-react"

import { AuthFeedback } from "@/components/auth/auth-feedback"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { requireVerifiedClaims } from "@/lib/auth/session"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Dashboard" }

type DashboardPageProps = {
  searchParams: Promise<{ notice?: string }>
}

type ToolPreview = {
  title: string
  description: string
  icon: LucideIcon
  iconClassName: string
}

const toolPreviews: ToolPreview[] = [
  {
    title: "Goals and paths",
    description:
      "Keep future options, decisions, and the next milestone visible.",
    icon: TargetIcon,
    iconClassName: "bg-brand-neon-soft text-brand-neon-ink",
  },
  {
    title: "Exam preparation",
    description:
      "Track subjects, practice, attempts, and evidence of progress.",
    icon: BookOpenCheckIcon,
    iconClassName: "bg-brand-cyan-soft text-brand-cyan-ink",
  },
  {
    title: "Connections",
    description: "Bring calendars and external AI agents into your system.",
    icon: PlugZapIcon,
    iconClassName: "bg-brand-violet-soft text-brand-violet-ink",
  },
]

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
  const supabase = await createServerSupabaseClient()

  const [profileResult, membershipResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url, timezone, locale")
      .eq("id", claims.sub)
      .maybeSingle(),
    supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", claims.sub)
      .limit(1)
      .maybeSingle(),
  ])

  const membership = membershipResult.data
  const workspaceResult = membership
    ? await supabase
        .from("workspaces")
        .select("id, name, slug, kind, created_at")
        .eq("id", membership.workspace_id)
        .maybeSingle()
    : { data: null, error: null }

  const profile = profileResult.data
  const workspace = workspaceResult.data
  const setupFailed =
    Boolean(profileResult.error) ||
    Boolean(membershipResult.error) ||
    Boolean(workspaceResult.error) ||
    !profile ||
    !membership ||
    !workspace
  const name = firstName(profile?.display_name, claims.email)

  return (
    <main className="mx-auto w-full max-w-6xl px-4 md:px-6 xl:px-10 pt-24 pb-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Today
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-normal sm:text-4xl">
            Good to see you, {name}.
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Pick one meaningful next move. Character Arc will keep the outcome
            ready for you and your agents.
          </p>
        </div>
        <Badge variant="outline" className="w-fit shrink-0">
          Personal workspace
        </Badge>
      </header>

      <div className="mt-6 max-w-3xl">
        <AuthFeedback notice={params.notice} />
      </div>

      {setupFailed ? (
        <Alert variant="destructive" className="mt-6 max-w-3xl">
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

      <section
        aria-labelledby="current-arc-title"
        className="mt-10 border-y py-14 sm:py-16"
      >
        <Empty className="mx-auto max-w-xl p-0">
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

      <section
        id="workspace"
        aria-labelledby="workspace-title"
        className="scroll-mt-24 border-b bg-background"
      >
        <h2 id="workspace-title" className="sr-only">
          Workspace status
        </h2>
        <div className="grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="py-6 md:px-6 md:first:pl-0">
            <p className="text-xs font-medium text-muted-foreground">
              PERSONAL WORKSPACE
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-md bg-brand-neon-soft text-brand-neon-ink">
                <BlocksIcon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-heading text-base font-medium">
                  {workspace?.name ?? "Not created"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Your private context boundary
                </p>
              </div>
            </div>
          </div>
          <div className="py-6 md:px-6">
            <p className="text-xs font-medium text-muted-foreground">ACCESS</p>
            <div className="mt-4 flex h-10 items-center gap-3">
              <Badge variant="outline" className="uppercase">
                {membership?.role ?? "missing"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                RLS protected
              </span>
            </div>
          </div>
          <div className="py-6 md:px-6 md:last:pr-0">
            <p className="text-xs font-medium text-muted-foreground">
              ACCOUNT SETUP
            </p>
            <div className="mt-4 flex h-10 items-center gap-3">
              <span
                className={`size-2 rounded-full ${setupFailed ? "bg-destructive" : "bg-chart-2"}`}
              />
              <span className="text-sm font-medium">
                {setupFailed ? "Needs attention" : "Ready to build"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section id="tools" className="mt-12 scroll-mt-24">
        <div className="flex items-end justify-between gap-4 border-b pb-5">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Tools</p>
            <h2 className="mt-1 font-heading text-2xl font-semibold">
              Choose your first useful loop
            </h2>
          </div>
          <Badge variant="secondary">Foundation</Badge>
        </div>

        <div>
          {toolPreviews.map((tool) => {
            const Icon = tool.icon

            return (
              <div
                key={tool.title}
                className="flex min-h-24 items-center gap-4 border-b py-4"
              >
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-md",
                    tool.iconClassName
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-base font-medium">
                    {tool.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {tool.description}
                  </p>
                </div>
                <Badge variant="outline">
                  <span className="sm:hidden">Soon</span>
                  <span className="hidden sm:inline">Coming next</span>
                </Badge>
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}
