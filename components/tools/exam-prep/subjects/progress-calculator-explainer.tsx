import { BookOpenIcon, ClipboardCheckIcon, FlaskConicalIcon, RefreshCwIcon } from "lucide-react"

import type { SubjectProgressPolicy } from "@/lib/tools/exam-prep/progress/policy"

const stages = [
  { label: "Learn", weight: "25%", icon: BookOpenIcon, detail: "Mark a topic learned." },
  { label: "Revise", weight: "30%", icon: RefreshCwIcon, detail: "Revision count against its target." },
  { label: "Practice", weight: "30%", icon: FlaskConicalIcon, detail: "Practice count against its target." },
  { label: "Test", weight: "15%", icon: ClipboardCheckIcon, detail: "Test Records against their target." },
]

export function ProgressCalculatorExplainer({ policy, compact = false }: { policy: SubjectProgressPolicy; compact?: boolean }) {
  return (
    <section className="space-y-5" aria-labelledby="progress-explainer-title">
      <div className="max-w-2xl">
        <h2 id="progress-explainer-title" className="font-heading text-xl font-semibold">How progress works</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Each stage contributes a fixed share. Targets cap the percentage calculation, not your effort.
        </p>
      </div>
      <div className={compact ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 gap-3 lg:grid-cols-4"}>
        {stages.map(({ label, weight, icon: Icon, detail }) => (
          <div key={label} className="rounded-2xl bg-muted/45 p-4">
            <div className="flex items-center gap-2 text-brand-violet-ink">
              <Icon className="size-4" aria-hidden="true" />
              <span className="text-sm font-medium">{label}</span>
            </div>
            <p className="mt-3 font-heading text-2xl font-semibold">{weight}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        <p><span className="font-medium">Standard:</span> <span className="text-muted-foreground">{policy.revisionTarget} revisions and {policy.practiceTarget} practice sessions.</span></p>
        <p><span className="font-medium text-warning-ink">High-yield:</span> <span className="text-muted-foreground">{policy.highYieldRevisionTarget} revisions and {policy.highYieldPracticeTarget} practice sessions.</span></p>
        <p><span className="font-medium">Chapter tests:</span> <span className="text-muted-foreground">{policy.chapterTestTarget} Test Record{policy.chapterTestTarget === 1 ? "" : "s"} per chapter.</span></p>
        <p><span className="font-medium">Subject tests:</span> <span className="text-muted-foreground">{policy.subjectTestTarget} full-subject Test Record{policy.subjectTestTarget === 1 ? "" : "s"}.</span></p>
      </div>
    </section>
  )
}
