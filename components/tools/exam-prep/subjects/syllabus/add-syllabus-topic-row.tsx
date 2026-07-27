"use client"

import { useRef, useState, useTransition } from "react"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { createTopicAction } from "@/lib/tools/exam-prep/actions/syllabus-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import type { BaseTopic } from "@/types/progressapp/domain"

type AddSyllabusTopicRowProps = {
  workspaceSlug: string
  examId: string
  chapterId: string
  onCreated: (topic: BaseTopic) => void
  onDone: () => void
}

export function AddSyllabusTopicRow({ workspaceSlug, examId, chapterId, onCreated, onDone }: AddSyllabusTopicRowProps) {
  const [title, setTitle] = useState("")
  const [recentTopics, setRecentTopics] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function submit() {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return
    if (recentTopics.some((topic) => topic.toLocaleLowerCase() === trimmedTitle.toLocaleLowerCase())) {
      toast.error("This topic was already added.")
      return
    }

    setTitle("")
    setRecentTopics((current) => [...current, trimmedTitle])
    startTransition(async () => {
      const formData = new FormData()
      formData.set("workspaceSlug", workspaceSlug)
      formData.set("examId", examId)
      formData.set("chapterId", chapterId)
      formData.set("title", trimmedTitle)
      const result = await createTopicAction({ status: "idle" }, formData)

      if (result.status !== "success" || !result.topicId) {
        setTitle(trimmedTitle)
        setRecentTopics((current) => current.filter((topic) => topic !== trimmedTitle))
        toast.error(result.message ?? "Could not add the topic.")
        return
      }

      const now = new Date()
      onCreated({
        id: result.topicId,
        name: trimmedTitle,
        important: false,
        learningStatus: false,
        revisionCount: 0,
        practiceCount: 0,
        testCount: 0,
        position: 0,
        learningCompletedAt: null,
        lastRevised: null,
        lastPracticed: null,
        nextRevision: null,
        chapterId,
        createdAt: now,
        updatedAt: now,
      })
      requestAnimationFrame(() => inputRef.current?.focus())
    })
  }

  return (
    <div className="animate-in space-y-2 rounded-lg border border-brand-violet-line bg-brand-violet-soft p-2 fade-in-0 slide-in-from-top-2 duration-200">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          ref={inputRef}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              submit()
            } else if (event.key === "Escape") {
              if (title) setTitle("")
              else onDone()
            }
          }}
          placeholder="Type a topic, then press Enter"
          maxLength={120}
          disabled={isPending}
          autoComplete="off"
          autoFocus
          aria-label="New topic name"
        />
        <div className="flex gap-2">
          <Button type="button" className="min-w-20 flex-1 sm:flex-none" onClick={submit} disabled={isPending || !title.trim()}>
            {isPending ? <Spinner /> : <PlusIcon data-icon="inline-start" />}
            Add
          </Button>
          <Button type="button" className="flex-1 sm:flex-none" variant="outline" onClick={onDone} disabled={isPending}>
            Done
          </Button>
        </div>
      </div>
      {recentTopics.length > 0 ? (
        <p className="truncate px-1 text-xs text-muted-foreground">Added: {recentTopics.slice(-3).join(", ")}</p>
      ) : (
        <p className="px-1 text-xs text-muted-foreground">Keep typing to add several topics. Escape clears, then closes.</p>
      )}
    </div>
  )
}
