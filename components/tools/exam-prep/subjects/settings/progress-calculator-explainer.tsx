import { BookOpenIcon, ClipboardCheckIcon, FlaskConicalIcon, RefreshCwIcon, TargetIcon, ShieldCheckIcon } from "lucide-react"

import type { SubjectProgressPolicy } from "@/lib/tools/exam-prep/progress/policy"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const stages = [
  { label: "Learn", weight: "25%", icon: BookOpenIcon, detail: "Mark a topic learned." },
  { label: "Revise", weight: "30%", icon: RefreshCwIcon, detail: "Revision count against its target." },
  { label: "Practice", weight: "30%", icon: FlaskConicalIcon, detail: "Practice count against its target." },
  { label: "Test", weight: "15%", icon: ClipboardCheckIcon, detail: "Test Records against their target." },
]

export function ProgressCalculatorExplainer({ policy, compact = false }: { policy: SubjectProgressPolicy; compact?: boolean }) {
  return (
    <Accordion className="w-full space-y-3 border-0 ">
      <AccordionItem value="progress" className="border rounded-xl bg-card overflow-hidden">
        <AccordionTrigger className={cn("hover:no-underline px-4 py-3", compact && "py-3")}>
          <div className="flex items-center gap-3 text-left">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-neon-soft text-brand-neon-ink transition-colors">
              <TargetIcon className="size-4" aria-hidden="true" />
            </div>
            <div>
              <div className="text-sm font-semibold text-brand-neon-ink">How overall progress works</div>
              <div className="text-xs font-normal text-muted-foreground mt-0.5">Understand how targets convert to percentage</div>
            </div>
          </div>
      </AccordionTrigger>
        <AccordionContent className="pt-2 pb-5 px-4">
          <section className="space-y-5" aria-labelledby="progress-explainer-title">
            <div className={compact ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 gap-3 lg:grid-cols-4"}>
              {stages.map(({ label, weight, icon: Icon, detail }) => (
                <div key={label} className="rounded-2xl bg-muted/30 border border-muted/40 p-4">
                  <div className="flex items-center gap-2 text-brand-neon-ink">
                    <Icon className="size-4" aria-hidden="true" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <p className="mt-3 font-heading text-2xl font-semibold">{weight}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 rounded-xl border border-muted/40 bg-muted/10 p-4">
              <p><span className="font-medium">Standard:</span> <span className="text-muted-foreground">{policy.revisionTarget} revisions and {policy.practiceTarget} practice sessions.</span></p>
              <p><span className="font-medium text-warning-ink">High-yield:</span> <span className="text-muted-foreground">{policy.highYieldRevisionTarget} revisions and {policy.highYieldPracticeTarget} practice sessions.</span></p>
              <p><span className="font-medium">Chapter tests:</span> <span className="text-muted-foreground">{policy.chapterTestTarget} Test Record{policy.chapterTestTarget === 1 ? "" : "s"} per chapter.</span></p>
              <p><span className="font-medium">Subject tests:</span> <span className="text-muted-foreground">{policy.subjectTestTarget} full-subject Test Record{policy.subjectTestTarget === 1 ? "" : "s"}.</span></p>
            </div>
          </section>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="foundation" className="border rounded-xl bg-card overflow-hidden">
        <AccordionTrigger className={cn("hover:no-underline px-4 py-3", compact && "py-3")}>
          <div className="flex items-center gap-3 text-left">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-cyan-soft text-brand-cyan-ink transition-colors">
              <ShieldCheckIcon className="size-4" aria-hidden="true" />
            </div>
            <div>
              <div className="text-sm font-semibold text-brand-cyan-ink">How foundation level is calculated</div>
              <div className="text-xs font-normal text-muted-foreground mt-0.5">Beginner, Moderate, or Advanced</div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-2 pb-5 px-4">
          <div className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Your Foundation Level is based directly on your overall weighted progress. It categorizes your readiness into three clear tiers, helping you assess at a glance whether you have a solid grasp of the subject material.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-muted/40 bg-muted/10 p-3">
                <Badge variant="outline" className="border-brand-cyan-line bg-brand-cyan-soft text-brand-cyan-ink hover:bg-brand-cyan-soft">Beginner</Badge>
                <div className="mt-2 text-xs text-muted-foreground">&lt; 50% weighted progress</div>
              </div>
              <div className="rounded-xl border border-muted/40 bg-muted/10 p-3">
                <Badge variant="outline" className="border-brand-amber-line bg-brand-amber-soft text-brand-amber-ink hover:bg-brand-amber-soft">Moderate</Badge>
                <div className="mt-2 text-xs text-muted-foreground">50% &ndash; 79% weighted progress</div>
              </div>
              <div className="rounded-xl border border-muted/40 bg-muted/10 p-3">
                <Badge variant="outline" className="border-brand-neon-line bg-brand-neon-soft text-brand-neon-ink hover:bg-brand-neon-soft">Advanced</Badge>
                <div className="mt-2 text-xs text-muted-foreground">&ge; 80% weighted progress</div>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
