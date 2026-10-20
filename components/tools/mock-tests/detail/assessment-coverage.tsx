import Link from "next/link"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type { AssessmentDetail } from "@/lib/tools/definitions/mock-tests/repository"
import { formatNumber } from "@/lib/tools/mock-tests/kind-labels"
type Target = NonNullable<AssessmentDetail["questions"][number]["targets"]>[number]
export function AssessmentCoverage({ assessment, workspaceSlug }: { assessment: AssessmentDetail; workspaceSlug: string }) {
 const targets = new Map<string, { target: Target; questions: Set<string>; marks: number }>()
 let unmapped = 0
 for (const question of assessment.questions) {
  if (!question.targets?.length) unmapped++
  for (const target of question.targets ?? []) {
   const row = targets.get(target.blockId) ?? { target, questions: new Set<string>(), marks: 0 }
   if (!row.questions.has(question.id)) { row.questions.add(question.id); row.marks += question.marks }
   targets.set(target.blockId,row)
  }
 }
 const marks = assessment.questions.reduce((sum,q)=>sum+q.marks,0)
 return <section aria-label="Topic coverage" className="overflow-hidden rounded-2xl border border-border bg-card">
  <div className="flex flex-col gap-2 border-b border-border p-4 sm:p-6"><h2 className="font-heading text-base font-bold">Topic coverage</h2><p className="text-sm text-muted-foreground">Syllabus areas linked to this paper’s questions.</p><p className="text-xs text-muted-foreground">{assessment.questions.length} questions · {formatNumber(marks)} question marks</p>
  {assessment.totalMarks !== null && marks !== assessment.totalMarks && <p className="text-xs text-muted-foreground">Configured total: {formatNumber(assessment.totalMarks)} marks. Current questions: {formatNumber(marks)} marks. Check the paper in the builder.</p>}</div>
  <div className="divide-y divide-border">{[...targets].map(([id,row])=><details key={id} className="p-4 sm:px-6"><summary className="min-h-11 cursor-pointer break-words text-sm font-medium">{row.target.title} <span className="text-xs text-muted-foreground">({row.questions.size} questions)</span></summary>
   {(row.target.paths ?? []).map(path=><div key={path.subjectId} className="py-2 text-xs text-muted-foreground">{path.examId ? <Link className="underline underline-offset-4" href={workspaceRoutes.examPrep.subject(workspaceSlug,path.examId,path.subjectId)}>{path.subjectTitle}</Link> : path.subjectTitle}{path.chapterTitle ? ` / ${path.chapterTitle}` : ""}</div>)}
   <p className="pt-2 text-xs text-muted-foreground">{row.target.blockTypeKey.split(".").pop()} · {formatNumber(row.marks)} linked question marks</p>
  </details>)}
  {unmapped > 0 && <p className="p-4 text-sm text-muted-foreground sm:px-6">Topics not assigned · {unmapped} questions</p>}
  {!assessment.questions.length && <p className="p-6 text-sm text-muted-foreground">Add questions in the builder to define coverage.</p>}</div>
  {targets.size > 0 && <p className="border-t border-border p-4 text-xs text-muted-foreground">Questions can cover multiple areas. Counts and marks across areas may overlap.</p>}
 </section>
}
