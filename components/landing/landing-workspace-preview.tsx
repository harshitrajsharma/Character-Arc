"use client"

import { useState } from "react"
import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  FileTextIcon,
  LinkIcon,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type PreviewStage = "subject" | "tests" | "review"
const topics = [
  "Matrices and determinants",
  "Vector spaces",
  "Eigenvalues and eigenvectors",
]

/** An illustrative, local-only walkthrough. It never queries or changes account data. */
export function LandingWorkspacePreview() {
  const [stage, setStage] = useState<PreviewStage>("subject")
  return (
    <figure className="min-w-0" aria-labelledby="workspace-preview-caption">
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4 sm:px-6">
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-7 items-center justify-center rounded-md bg-brand-violet-soft text-brand-violet-ink">
              <BookOpenIcon className="size-4" aria-hidden="true" />
            </span>{" "}
            Your workspace
          </span>
          <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            Product walkthrough
          </span>
        </div>
        <Tabs
          value={stage}
          onValueChange={(value) => setStage(value as PreviewStage)}
          className="gap-0"
        >
          <div className="border-b border-border px-3 py-3 sm:px-5">
            <TabsList
              aria-label="Explore the example workspace"
              variant="line"
              className="h-11! w-full justify-between gap-0"
            >
              <TabsTrigger
                value="subject"
                className="min-h-11 gap-1.5 px-2 sm:px-3"
              >
                <BookOpenIcon aria-hidden="true" />
                Subject
              </TabsTrigger>
              <TabsTrigger
                value="tests"
                className="min-h-11 gap-1.5 px-2 sm:px-3"
              >
                <FileTextIcon aria-hidden="true" />
                Tests
              </TabsTrigger>
              <TabsTrigger
                value="review"
                className="min-h-11 gap-1.5 px-2 sm:px-3"
              >
                <ClipboardCheckIcon aria-hidden="true" />
                Review
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="subject" className="m-0 min-h-80 p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <span>GATE DA</span>
              <ChevronRightIcon className="size-3" aria-hidden="true" />
              <span>Engineering Mathematics</span>
            </div>
            <h2 className="font-heading text-xl font-semibold">
              Linear Algebra
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep the syllabus and its tests in the same place.
            </p>
            <ul className="mt-5 divide-y divide-border">
              {topics.map((topic, index) => (
                <li
                  key={topic}
                  className="flex min-h-11 items-center gap-2.5 py-2 text-sm"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground">
                    {index === 0 ? (
                      <CheckIcon className="size-3" aria-hidden="true" />
                    ) : (
                      <span className="size-1 rounded-full bg-muted-foreground" />
                    )}
                  </span>
                  {topic}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="mt-5 min-h-11 w-full justify-between"
              onClick={() => setStage("tests")}
            >
              Open subject tests
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </TabsContent>
          <TabsContent value="tests" className="m-0 min-h-80 p-5 sm:p-6">
            <p className="text-xs text-muted-foreground">
              Linear Algebra / Tests
            </p>
            <h2 className="mt-2 font-heading text-xl font-semibold">
              A test that belongs here.
            </h2>
            <div className="mt-5 overflow-hidden rounded-lg border border-border">
              <div className="p-4">
                <p className="font-medium">Linear Algebra — Subject test</p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <LinkIcon className="size-3" aria-hidden="true" />
                  Linked to this subject
                </p>
              </div>
              <dl className="grid grid-cols-3 divide-x divide-border border-t border-border bg-muted/30 text-sm">
                <div className="px-3 py-3">
                  <dt className="text-xs text-muted-foreground">Questions</dt>
                  <dd className="mt-1 font-semibold">30</dd>
                </div>
                <div className="px-3 py-3">
                  <dt className="text-xs text-muted-foreground">Duration</dt>
                  <dd className="mt-1 font-semibold">90 min</dd>
                </div>
                <div className="px-3 py-3">
                  <dt className="text-xs text-muted-foreground">Marks</dt>
                  <dd className="mt-1 font-semibold">60</dd>
                </div>
              </dl>
            </div>
            <Button
              variant="outline"
              className="mt-5 min-h-11 w-full justify-between"
              onClick={() => setStage("review")}
            >
              Explore an answer review
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </TabsContent>
          <TabsContent value="review" className="m-0 min-h-80 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Linear Algebra / Attempt review
              </p>
              <Badge variant="secondary">Answer review</Badge>
            </div>
            <h2 className="mt-4 font-heading text-xl font-semibold">
              Understand the answer.
            </h2>
            <p className="mt-4 text-sm leading-relaxed">
              For a 2 × 2 identity matrix, what is its rank?
            </p>
            <div className="mt-4 rounded-lg border border-success-line bg-success-soft p-4 text-sm">
              <p className="inline-flex items-center gap-2 font-semibold text-success-ink">
                <CheckIcon className="size-4" aria-hidden="true" />
                Correct answer: 2
              </p>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                Its two columns are linearly independent, so the rank is 2.
              </p>
            </div>
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              Answers, explanations and linked topics give you a useful place to
              start your next session.
            </p>
          </TabsContent>
        </Tabs>
        <div className="flex items-center gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground sm:px-6">
          <LinkIcon className="size-3.5 shrink-0" aria-hidden="true" />
          One subject. A connected test and result.
        </div>
      </div>
      <figcaption
        id="workspace-preview-caption"
        className="mt-3 text-center text-xs text-muted-foreground"
      >
        Interactive example · Illustrative content, not live account data
      </figcaption>
    </figure>
  )
}
