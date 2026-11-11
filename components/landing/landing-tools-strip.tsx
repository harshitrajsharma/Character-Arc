import { BookOpenIcon, FileTextIcon, CheckIcon } from "lucide-react"
import { LandingContainer } from "@/components/landing/primitives"

const tools = [
  {
    title: "Exam Prep",
    icon: BookOpenIcon,
    description: "A clear home for your syllabus and the work around it.",
    capabilities: [
      "Subjects, chapters and topics",
      "Learn, revise, practice and test",
      "Subject tests and study context",
    ],
  },
  {
    title: "Assessments",
    icon: FileTextIcon,
    description: "Build the paper, take the test and keep the outcome.",
    capabilities: [
      "Your papers and reusable question bank",
      "Community assessments to discover",
      "Chronological attempts and answer review",
    ],
  },
]

export function LandingToolsStrip() {
  return (
    <section
      id="product"
      aria-labelledby="product-title"
      className="scroll-mt-24"
    >
      <LandingContainer className="py-16 sm:py-24">
        <div className="grid items-start gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              The workspace
            </p>
            <h2
              id="product-title"
              className="mt-5 max-w-md font-heading text-3xl font-semibold text-balance sm:text-4xl"
            >
              Two tools.
              <br />
              One preparation flow.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              Your study plan and test library stay connected. Find a subject,
              choose its test and return with something to review.
            </p>
          </div>
          <div className="divide-y divide-border">
            {tools.map((tool) => (
              <div
                key={tool.title}
                className="flex gap-4 py-7 first:pt-0 last:pb-0"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-violet-soft text-brand-violet-ink">
                  <tool.icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-heading text-xl font-semibold">
                    {tool.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {tool.description}
                  </p>
                  <ul className="mt-4 flex flex-col gap-2.5">
                    {tool.capabilities.map((capability) => (
                      <li
                        key={capability}
                        className="flex items-start gap-2 text-sm"
                      >
                        <CheckIcon
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        {capability}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </LandingContainer>
    </section>
  )
}
