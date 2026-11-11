"use client"

import {
  useId,
  useState,
  useSyncExternalStore,
  useTransition,
  type TransitionStartFunction,
} from "react"
import {
  CheckIcon,
  CopyIcon,
  GlobeIcon,
  LinkIcon,
  LockKeyholeIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { updateAssessmentSharingAction } from "@/lib/tools/mock-tests/actions/assessment-actions"
import type { AssessmentVisibility } from "@/lib/tools/definitions/mock-tests/repository"
import { cn } from "@/lib/utils"

export interface ShareAssessmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceSlug: string
  assessment: {
    id: string
    title: string
    revision?: number
    visibility?: AssessmentVisibility
    allowCloning?: boolean
  }
  onUpdated?: () => void
}

const audiences = [
  {
    value: "private",
    label: "Private",
    description: "Only members of this workspace can access it.",
    icon: LockKeyholeIcon,
  },
  {
    value: "unlisted",
    label: "Link only",
    description: "Anyone with the link can view the shared assessment.",
    icon: LinkIcon,
  },
  {
    value: "public",
    label: "Community Hub",
    description:
      "People can discover it in the community and view its shared page.",
    icon: GlobeIcon,
  },
] as const

const subscribeOrigin = () => () => {}
const clientOrigin = () => window.location.origin
const serverOrigin = () => ""

export function ShareAssessmentDialog(props: ShareAssessmentDialogProps) {
  const [pending, startTransition] = useTransition()
  return (
    <Dialog
      open={props.open}
      onOpenChange={(next) => {
        if (!pending) props.onOpenChange(next)
      }}
    >
      {props.open ? (
        <SharingForm
          key={`${props.assessment.id}:${props.assessment.revision}`}
          {...props}
          pending={pending}
          startTransition={startTransition}
        />
      ) : null}
    </Dialog>
  )
}

function SharingForm({
  onOpenChange,
  workspaceSlug,
  assessment,
  onUpdated,
  pending,
  startTransition,
}: ShareAssessmentDialogProps & {
  pending: boolean
  startTransition: TransitionStartFunction
}) {
  const id = useId()
  const [visibility, setVisibility] = useState<AssessmentVisibility>(
    assessment.visibility ?? "private"
  )
  const [allowCloning, setAllowCloning] = useState(
    assessment.allowCloning !== false
  )
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const origin = useSyncExternalStore(
    subscribeOrigin,
    clientOrigin,
    serverOrigin
  )
  const shareUrl = `${origin}/assessments/share/${assessment.id}`
  const savedVisibility = assessment.visibility ?? "private"
  const changed =
    visibility !== savedVisibility ||
    allowCloning !== (assessment.allowCloning !== false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        new URL(shareUrl, window.location.origin).href
      )
      setCopied(true)
      toast.success("Share link copied")
    } catch {
      toast.error("Could not copy the link. Select and copy it from the field.")
    }
  }
  function save() {
    setError(null)
    startTransition(async () => {
      try {
        await updateAssessmentSharingAction({
          workspaceSlug,
          assessmentId: assessment.id,
          expectedRevision: assessment.revision,
          visibility,
          allowCloning,
        })
        toast.success("Sharing settings saved")
        onUpdated?.()
        onOpenChange(false)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not save sharing settings. Try again."
        )
      }
    })
  }
  return (
    <DialogContent className="flex max-h-[min(42rem,calc(100dvh-2rem))] flex-col gap-0 sm:max-w-xl [&_[data-slot=dialog-close]]:size-11">
      <DialogHeader className="shrink-0">
        <DialogTitle>Share assessment</DialogTitle>
        <DialogDescription className="break-words">
          Choose who can access {assessment.title}.
        </DialogDescription>
      </DialogHeader>
      <form
        className="flex min-h-0 flex-col"
        onSubmit={(event) => {
          event.preventDefault()
          if (changed && !pending) save()
        }}
      >
        <div className="min-h-0 overflow-y-auto py-5">
          <FieldGroup>
            <FieldSet disabled={pending}>
              <FieldLegend variant="label">Visibility</FieldLegend>
              <div className="flex flex-col gap-2">
                {audiences.map((audience) => (
                  <label
                    key={audience.value}
                    htmlFor={`${id}-${audience.value}`}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border p-3 has-focus-visible:ring-2 has-focus-visible:ring-ring",
                      visibility === audience.value && "bg-accent"
                    )}
                  >
                    <input
                      className="mt-1 size-4 shrink-0 accent-primary"
                      type="radio"
                      id={`${id}-${audience.value}`}
                      name={`${id}-visibility`}
                      value={audience.value}
                      checked={visibility === audience.value}
                      onChange={() => setVisibility(audience.value)}
                    />
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <audience.icon className="size-4" aria-hidden="true" />
                        {audience.label}
                      </span>
                      <span className="text-xs leading-relaxed text-muted-foreground">
                        {audience.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </FieldSet>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor={`${id}-cloning`} className="min-h-11">
                  Allow workspace copies
                </FieldLabel>
                <FieldDescription>
                  People with access can sign in and copy this assessment into
                  their own workspace for practice or editing.
                </FieldDescription>
              </FieldContent>
              <Switch
                id={`${id}-cloning`}
                checked={allowCloning}
                onCheckedChange={setAllowCloning}
                disabled={pending}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-link`}>Share link</FieldLabel>
              <div className="flex min-w-0 gap-2">
                <Input
                  id={`${id}-link`}
                  value={savedVisibility === "private" ? "" : shareUrl}
                  placeholder="Save link-only or public visibility to enable sharing"
                  readOnly
                  className="h-11 min-w-0"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={copy}
                  disabled={savedVisibility === "private" || pending}
                >
                  {copied ? (
                    <CheckIcon aria-hidden="true" />
                  ) : (
                    <CopyIcon aria-hidden="true" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <FieldDescription>
                {savedVisibility === "private"
                  ? "Your saved assessment is private. Save a sharing option to enable this link."
                  : "Visibility and copy permissions change when you save."}
              </FieldDescription>
            </Field>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </FieldGroup>
        </div>
        <DialogFooter className="shrink-0">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" className="h-11" disabled={pending || !changed}>
            {pending ? "Saving…" : "Save settings"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
