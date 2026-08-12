"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { BookOpenIcon, Loader2Icon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  attachSubjectAction,
  createSubjectAction,
  getAttachableSubjectsAction,
  type AttachableSubject,
} from "@/lib/tools/exam-prep/actions/subject-actions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface CreateSubjectDialogProps {
  workspaceSlug: string
  examId: string
  children: React.ReactElement
}

export function CreateSubjectDialog({
  workspaceSlug,
  examId,
  children,
}: CreateSubjectDialogProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"create" | "attach">("create")
  const [attachableSubjects, setAttachableSubjects] = useState<
    AttachableSubject[]
  >([])
  const [isLoadingAttachableSubjects, setIsLoadingAttachableSubjects] =
    useState(false)
  const [attachableSubjectsError, setAttachableSubjectsError] = useState<
    string | null
  >(null)
  const attachableSubjectsRequestIdRef = useRef(0)
  const [createState, createFormAction, isCreating] = useActionState(
    createSubjectAction,
    {
      status: "idle",
    }
  )
  const [attachState, attachFormAction, isAttaching] = useActionState(
    attachSubjectAction,
    {
      status: "idle",
    }
  )

  async function loadAttachableSubjects() {
    const requestId = ++attachableSubjectsRequestIdRef.current
    setIsLoadingAttachableSubjects(true)
    setAttachableSubjectsError(null)
    setAttachableSubjects([])

    try {
      const result = await getAttachableSubjectsAction(workspaceSlug, examId)
      if (requestId !== attachableSubjectsRequestIdRef.current) return
      setAttachableSubjects(result.subjects)
      setAttachableSubjectsError(result.message ?? null)
    } catch {
      if (requestId !== attachableSubjectsRequestIdRef.current) return
      setAttachableSubjectsError(
        "Reusable subjects could not be loaded. Please try again."
      )
    } finally {
      if (requestId === attachableSubjectsRequestIdRef.current) {
        setIsLoadingAttachableSubjects(false)
      }
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      attachableSubjectsRequestIdRef.current += 1
      setIsLoadingAttachableSubjects(false)
      return
    }

    if (mode === "attach") void loadAttachableSubjects()
  }

  function handleModeChange(value: string) {
    const nextMode = value as typeof mode
    setMode(nextMode)
    if (nextMode === "attach") {
      void loadAttachableSubjects()
    } else {
      attachableSubjectsRequestIdRef.current += 1
      setIsLoadingAttachableSubjects(false)
    }
  }

  useEffect(() => {
    if (createState.status === "error" && createState.message) {
      toast.error(createState.message)
    }
    if (createState.status === "success") {
      toast.success("Subject created and added to this exam.")
      const timer = window.setTimeout(() => setOpen(false), 0)
      return () => window.clearTimeout(timer)
    }
  }, [createState.message, createState.status])

  useEffect(() => {
    if (attachState.status === "error" && attachState.message) {
      toast.error(attachState.message)
    }
    if (attachState.status === "success") {
      toast.success("Subject added to this exam.")
      const timer = window.setTimeout(() => setOpen(false), 0)
      return () => window.clearTimeout(timer)
    }
  }, [attachState.message, attachState.status])

  const isPending = isCreating || isAttaching
  const activeState = mode === "create" ? createState : attachState
  const createTitleError = createState.fieldErrors?.title?.[0]
  const createSummaryError = createState.fieldErrors?.summary?.[0]
  const createWeightageError = createState.fieldErrors?.weightage?.[0]
  const attachSubjectError = attachState.fieldErrors?.subjectId?.[0]
  const attachWeightageError = attachState.fieldErrors?.weightage?.[0]

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Add a subject</DialogTitle>
          <DialogDescription>
            Create a new syllabus, or reuse one you already maintain in this
            workspace.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={handleModeChange}>
          <TabsList aria-label="Choose how to add a subject">
            <TabsTrigger value="create">
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              Create new
            </TabsTrigger>
            <TabsTrigger value="attach">
              <BookOpenIcon data-icon="inline-start" aria-hidden="true" />
              Use existing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="pt-6">
            <form action={createFormAction} className="flex flex-col gap-6">
              <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
              <input type="hidden" name="examId" value={examId} />

              <FieldGroup>
                <Field data-invalid={Boolean(createTitleError)}>
                  <FieldLabel htmlFor="subject-title">Subject title</FieldLabel>
                  <Input
                    id="subject-title"
                    name="title"
                    placeholder="e.g., Mathematics, Physics, History"
                    required
                    maxLength={120}
                    aria-invalid={Boolean(createTitleError)}
                    aria-errormessage={
                      createTitleError ? "subject-title-error" : undefined
                    }
                  />
                  <FieldError id="subject-title-error">
                    {createTitleError}
                  </FieldError>
                </Field>

                <Field data-invalid={Boolean(createSummaryError)}>
                  <FieldLabel htmlFor="subject-summary">
                    Summary (optional)
                  </FieldLabel>
                  <Textarea
                    id="subject-summary"
                    name="summary"
                    placeholder="Brief description of the subject"
                    maxLength={4000}
                    className="min-h-25 resize-y"
                    aria-invalid={Boolean(createSummaryError)}
                    aria-errormessage={
                      createSummaryError ? "subject-summary-error" : undefined
                    }
                  />
                  <FieldError id="subject-summary-error">
                    {createSummaryError}
                  </FieldError>
                </Field>

                <Field data-invalid={Boolean(createWeightageError)}>
                  <FieldLabel htmlFor="create-weightage">Weightage</FieldLabel>
                  <Input
                    id="create-weightage"
                    name="weightage"
                    placeholder="e.g., 10"
                    type="number"
                    min="0"
                    max="100"
                    required
                    aria-invalid={Boolean(createWeightageError)}
                    aria-describedby="create-weightage-description"
                    aria-errormessage={
                      createWeightageError
                        ? "create-weightage-error"
                        : undefined
                    }
                  />
                  <FieldDescription id="create-weightage-description">
                    Percentage of this exam covered by the subject.
                  </FieldDescription>
                  <FieldError id="create-weightage-error">
                    {createWeightageError}
                  </FieldError>
                </Field>
              </FieldGroup>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isCreating ? (
                    <>
                      <Loader2Icon
                        data-icon="inline-start"
                        className="animate-spin"
                        aria-hidden="true"
                      />
                      Creating…
                    </>
                  ) : (
                    "Create subject"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="attach" className="pt-6">
            <form action={attachFormAction} className="flex flex-col gap-6">
              <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
              <input type="hidden" name="examId" value={examId} />

              <FieldGroup>
                <Field
                  data-invalid={Boolean(
                    attachSubjectError || attachableSubjectsError
                  )}
                  data-disabled={isLoadingAttachableSubjects}
                >
                  <FieldLabel htmlFor="existing-subject">
                    Shared subject
                  </FieldLabel>
                  <Select
                    items={attachableSubjects.map((subject) => ({
                      label: `${subject.title} · ${subject.foundationLevel}`,
                      value: subject.id,
                    }))}
                    name="subjectId"
                    disabled={isLoadingAttachableSubjects}
                    required
                  >
                    <SelectTrigger
                      id="existing-subject"
                      aria-invalid={Boolean(attachSubjectError)}
                      aria-describedby={
                        attachableSubjectsError
                          ? "attachable-subjects-error"
                          : "existing-subject-description"
                      }
                      aria-errormessage={
                        attachSubjectError
                          ? "existing-subject-error"
                          : undefined
                      }
                    >
                      <SelectValue
                        placeholder={
                          isLoadingAttachableSubjects
                            ? "Loading subjects…"
                            : "Choose a subject"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {attachableSubjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.title} · {subject.foundationLevel}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldError id="existing-subject-error">
                    {attachSubjectError}
                  </FieldError>
                  {attachableSubjectsError ? (
                    <FieldError id="attachable-subjects-error">
                      {attachableSubjectsError}
                    </FieldError>
                  ) : attachableSubjects.length === 0 &&
                    !isLoadingAttachableSubjects ? (
                    <FieldDescription id="existing-subject-description">
                      No other reusable subjects are available in this
                      workspace.
                    </FieldDescription>
                  ) : (
                    <FieldDescription id="existing-subject-description">
                      This keeps its chapters, topics, and foundation level
                      shared.
                    </FieldDescription>
                  )}
                </Field>

                <Field data-invalid={Boolean(attachWeightageError)}>
                  <FieldLabel htmlFor="attach-weightage">Weightage</FieldLabel>
                  <Input
                    id="attach-weightage"
                    name="weightage"
                    placeholder="e.g., 10"
                    type="number"
                    min="0"
                    max="100"
                    required
                    aria-invalid={Boolean(attachWeightageError)}
                    aria-describedby="attach-weightage-description"
                    aria-errormessage={
                      attachWeightageError
                        ? "attach-weightage-error"
                        : undefined
                    }
                  />
                  <FieldDescription id="attach-weightage-description">
                    This exam&apos;s percentage for the subject.
                  </FieldDescription>
                  <FieldError id="attach-weightage-error">
                    {attachWeightageError}
                  </FieldError>
                </Field>
              </FieldGroup>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isPending ||
                    isLoadingAttachableSubjects ||
                    attachableSubjects.length === 0
                  }
                >
                  {isAttaching ? (
                    <>
                      <Loader2Icon
                        data-icon="inline-start"
                        className="animate-spin"
                        aria-hidden="true"
                      />
                      Adding…
                    </>
                  ) : (
                    "Add to exam"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>

        {activeState.status === "error" && activeState.message ? (
          <p className="sr-only" role="alert">
            {activeState.message}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
