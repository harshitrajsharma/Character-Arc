import { BotIcon, ChevronDownIcon, ShieldCheckIcon } from "lucide-react"
import { LandingContainer } from "@/components/landing/primitives"

const questions = [
  {
    title: "Do I need an AI agent?",
    answer:
      "No. Organize your syllabus, build assessments, take tests and review results directly in the app. Connecting an agent is optional.",
  },
  {
    title: "Which AI connections are supported?",
    answer:
      "Use an MCP client that supports Streamable HTTP and a custom Authorization Bearer header. Create a workspace key in Settings → AI & Agents. OAuth-only connectors and the older SSE transport are not supported.",
  },
  {
    title: "What controls an agent’s access?",
    answer:
      "Keys act with their creator’s current workspace access. Installed tools, their permissions and each item’s agent-access setting constrain what an agent can use. Workspace owners can revoke keys.",
  },
  {
    title: "Can I use Character Arc on my phone?",
    answer:
      "Yes, for preparation, assessment management and reviewing results. The timed exam room requires a viewport of at least 1024 × 600 pixels, typically a laptop or a large tablet in landscape.",
  },
]

export function LandingPrinciples() {
  return (
    <section
      id="agents"
      aria-labelledby="agents-title"
      className="scroll-mt-24 border-y border-border"
    >
      <LandingContainer className="grid gap-10 py-16 sm:py-24 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
        <div>
          <span className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-brand-cyan-ink">
            <BotIcon className="size-4" aria-hidden="true" />
            Work with an AI agent
          </span>
          <h2
            id="agents-title"
            className="max-w-md font-heading text-3xl font-semibold text-balance sm:text-4xl"
          >
            Your AI can help.
            <br />
            Your workspace keeps the work.
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            Ask a compatible agent to help create and organize your preparation.
            Its work lands in the same tools you use, so you can inspect it and
            carry on.
          </p>
          <p className="mt-6 inline-flex items-center gap-2 text-sm font-medium">
            <ShieldCheckIcon
              className="size-4 text-brand-cyan-ink"
              aria-hidden="true"
            />
            Workspace access stays under your control.
          </p>
        </div>
        <div className="divide-y divide-border border-y border-border">
          {questions.map((question) => (
            <details key={question.title} className="group py-1">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-semibold outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                {question.title}
                <ChevronDownIcon
                  className="size-4 shrink-0 text-muted-foreground group-open:rotate-180 motion-safe:transition-transform"
                  aria-hidden="true"
                />
              </summary>
              <p className="pb-5 text-sm leading-relaxed text-muted-foreground">
                {question.answer}
              </p>
            </details>
          ))}
        </div>
      </LandingContainer>
    </section>
  )
}
