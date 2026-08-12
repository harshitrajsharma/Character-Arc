"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import { createAssessmentAction } from "@/lib/tools/mock-tests/actions/assessment-actions"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

export function NewAssessmentForm({
  workspaceSlug,
}: {
  workspaceSlug: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    createIdempotencyKey()
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const title = String(formData.get("title") ?? "").trim()
    const durationRaw = String(formData.get("durationMinutes") ?? "").trim()
    const totalMarksRaw = String(formData.get("totalMarks") ?? "").trim()
    const instructions = String(formData.get("instructions") ?? "").trim()

    if (!title) {
      toast.warning("Incomplete form", {
        description: "Give your mock test a name.",
      })
      return
    }

    const durationMinutes = durationRaw === "" ? null : Number(durationRaw)
    const totalMarks = totalMarksRaw === "" ? null : Number(totalMarksRaw)
    if (durationMinutes !== null && (!Number.isInteger(durationMinutes) || durationMinutes < 1)) {
      toast.warning("Invalid duration", {
        description: "Duration must be a whole number of minutes.",
      })
      return
    }
    if (totalMarks !== null && (!Number.isFinite(totalMarks) || totalMarks <= 0)) {
      toast.warning("Invalid total marks", {
        description: "Total marks must be greater than zero.",
      })
      return
    }

    startTransition(async () => {
      try {
        const result = await createAssessmentAction({
          workspaceSlug,
          title,
          durationMinutes,
          totalMarks,
          instructions: instructions === "" ? null : instructions,
          idempotencyKey,
        })
        toast.success("Mock test created")
        router.push(
          workspaceRoutes.mockTests.detail(workspaceSlug, result.assessmentId)
        )
      } catch (error) {
        setIdempotencyKey(createIdempotencyKey())
        const message =
          error instanceof Error ? error.message : "Failed to create the test."
        toast.error("Error", { description: message })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="title">
          Test title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          name="title"
          placeholder="e.g., GATE CS Full Syllabus Mock #1"
          required
          maxLength={120}
          autoFocus
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="durationMinutes">
            Duration (minutes)
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              optional
            </span>
          </Label>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={1440}
            placeholder="e.g., 180 (leave blank for untimed)"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="totalMarks">
            Total marks
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              optional
            </span>
          </Label>
          <Input
            id="totalMarks"
            name="totalMarks"
            type="number"
            inputMode="decimal"
            min={0.01}
            step="any"
            placeholder="e.g., 100"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="instructions">
          Instructions
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            optional
          </span>
        </Label>
        <Textarea
          id="instructions"
          name="instructions"
          rows={4}
          maxLength={20000}
          placeholder="e.g., Each correct answer carries 3 marks; 1 mark is deducted for every wrong answer."
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2Icon className="animate-spin" aria-hidden="true" />
          ) : null}
          Create test
        </Button>
      </div>
    </form>
  )
}
