import {
  BookOpenIcon,
  FilePlus2Icon,
  ClipboardCheckIcon,
  ArrowRightIcon,
} from "lucide-react"
import { LandingContainer } from "@/components/landing/primitives"

const steps = [
  {
    title: "Start with a subject",
    description:
      "Organize exams, chapters and topics into a syllabus you can actually work through.",
    icon: BookOpenIcon,
    detail: "Know where to begin",
  },
  {
    title: "Build a test in context",
    description:
      "Create a draft or link an existing assessment. Add questions and open the test from its subject.",
    icon: FilePlus2Icon,
    detail: "Keep practice close to the syllabus",
  },
  {
    title: "Review, then move forward",
    description:
      "Continue unfinished attempts, revisit evaluated answers and keep your full test history.",
    icon: ClipboardCheckIcon,
    detail: "Have a record to learn from",
  },
]

export function LandingHowItWorks() {
  return (
    <section
      id="workflow"
      aria-labelledby="workflow-title"
      className="scroll-mt-24 border-y border-border"
    >
      <LandingContainer className="py-16 sm:py-20">
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            The connected study loop
          </p>
          <h2
            id="workflow-title"
            className="max-w-xl font-heading text-3xl font-semibold text-balance sm:text-4xl"
          >
            From your syllabus to your next attempt.
          </h2>
        </div>
        <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-10">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="min-w-0 border-t border-border pt-5"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-muted-foreground">
                  0{index + 1}
                </span>
                <step.icon
                  className="size-5 text-brand-violet-ink"
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-5 font-heading text-lg font-semibold">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
              <p className="mt-5 inline-flex items-center gap-2 text-xs font-medium">
                <ArrowRightIcon className="size-3.5" aria-hidden="true" />
                {step.detail}
              </p>
            </li>
          ))}
        </ol>
      </LandingContainer>
    </section>
  )
}
