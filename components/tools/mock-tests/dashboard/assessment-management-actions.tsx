"use client"

import { useId, useRef, useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import {
  EllipsisVerticalIcon,
  Loader2Icon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { manageAssessmentAction } from "@/lib/tools/mock-tests/actions/assessment-actions"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

export function AssessmentManagementActions({
  workspaceSlug,
  item,
}: {
  workspaceSlug: string
  item: { id: string; title: string; revision: number }
}) {
  const router = useRouter()
  const inputId = useId()
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [operation, setOperation] = useState<"rename" | "delete" | null>(null)
  const [title, setTitle] = useState(item.title)
  const [error, setError] = useState("")
  const [activeTip, setActiveTip] = useState<"rename" | "delete" | null>(null)
  const [pending, startTransition] = useTransition()

  function open(next: "rename" | "delete") {
    setActiveTip(null)
    setTitle(item.title)
    setError("")
    setOperation(next)
  }
  function close() {
    if (!pending) setOperation(null)
  }
  function save(event?: FormEvent) {
    event?.preventDefault()
    if (!operation || pending) return
    if (
      operation === "rename" &&
      (!title.trim() || title.trim().length > 200)
    ) {
      setError("Enter a name between 1 and 200 characters.")
      nameInputRef.current?.focus()
      return
    }
    const requested = operation
    setError("")
    startTransition(async () => {
      try {
        const result = await manageAssessmentAction({
          workspaceSlug,
          assessmentId: item.id,
          expectedRevision: item.revision,
          operation: requested,
          ...(requested === "rename" ? { title: title.trim() } : {}),
          idempotencyKey: createIdempotencyKey(),
        })
        if (!result.ok) {
          setError(result.error)
          return
        }
        setOperation(null)
        toast.success(
          requested === "rename" ? "Assessment renamed" : "Assessment deleted"
        )
        router.refresh()
      } catch {
        setError("The change could not be saved. Please try again.")
      }
    })
  }

  return (
    <>
      <div
        className="absolute top-2 right-2 z-20 md:hidden"
        data-assessment-mobile-actions
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Actions for ${item.title}`}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "size-11"
            )}
          >
            <EllipsisVerticalIcon aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="min-h-11"
                onClick={() => open("rename")}
              >
                <PencilIcon aria-hidden="true" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                className="min-h-11"
                variant="destructive"
                onClick={() => open("delete")}
              >
                <Trash2Icon aria-hidden="true" /> Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <TooltipProvider delay={250}>
        <div
          data-assessment-actions
          role="group"
          aria-label="Assessment actions"
          className="absolute top-2 right-2 z-20 hidden items-center rounded-full border border-border bg-card/40 p-0.5 opacity-100 shadow-xs backdrop-blur-xl transition-opacity motion-reduce:transition-none md:pointer-events-none md:flex md:opacity-0 md:group-focus-within/assessment:pointer-events-auto md:group-focus-within/assessment:opacity-100 md:group-hover/assessment:pointer-events-auto md:group-hover/assessment:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100"
        >
          <Tooltip
            open={activeTip === "rename"}
            onOpenChange={(next) =>
              setActiveTip((current) =>
                next ? "rename" : current === "rename" ? null : current
              )
            }
          >
            <TooltipTrigger
              type="button"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "size-11 md:size-9"
              )}
              aria-label={`Rename ${item.title}`}
              onMouseEnter={() => setActiveTip("rename")}
              onClick={() => open("rename")}
            >
              <PencilIcon aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>Rename assessment</TooltipContent>
          </Tooltip>
          <Tooltip
            open={activeTip === "delete"}
            onOpenChange={(next) =>
              setActiveTip((current) =>
                next ? "delete" : current === "delete" ? null : current
              )
            }
          >
            <TooltipTrigger
              type="button"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "size-11 text-destructive hover:text-destructive md:size-9"
              )}
              aria-label={`Delete ${item.title}`}
              onMouseEnter={() => setActiveTip("delete")}
              onClick={() => open("delete")}
            >
              <Trash2Icon aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>Delete assessment</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
      <Dialog
        open={operation === "rename"}
        onOpenChange={(next) => {
          if (!next) close()
        }}
      >
        <DialogContent
          showCloseButton={!pending}
          className="max-w-[calc(100%-32px)] sm:max-w-md"
        >
          <form onSubmit={save} className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle>Rename assessment</DialogTitle>
              <DialogDescription>
                Choose a clear name for this paper.
              </DialogDescription>
            </DialogHeader>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor={inputId}>Assessment name</FieldLabel>
              <Input
                ref={nameInputRef}
                id={inputId}
                name="assessment-name"
                autoComplete="off"
                value={title}
                maxLength={200}
                onChange={(event) => {
                  setTitle(event.target.value)
                  setError("")
                }}
                disabled={pending}
                aria-invalid={!!error}
                className="h-11"
              />
              {error ? <FieldError role="alert">{error}</FieldError> : null}
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={pending}
                onClick={close}
              >
                Cancel
              </Button>
              <Button type="submit" className="h-11" disabled={pending}>
                {pending ? (
                  <Loader2Icon className="animate-spin" aria-hidden="true" />
                ) : null}
                {pending ? "Saving..." : "Save name"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={operation === "delete"}
        onOpenChange={(next) => {
          if (!next) close()
        }}
      >
        <AlertDialogContent className="max-w-[calc(100%-32px)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium break-words text-foreground">
                {item.title}
              </span>{" "}
              will be removed. Past attempts and questions are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <Button
              variant="outline"
              className="h-11"
              disabled={pending}
              onClick={close}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="h-11"
              disabled={pending}
              onClick={() => save()}
            >
              {pending ? (
                <Loader2Icon className="animate-spin" aria-hidden="true" />
              ) : (
                <Trash2Icon data-icon="inline-start" aria-hidden="true" />
              )}
              {pending ? "Deleting..." : "Delete assessment"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
