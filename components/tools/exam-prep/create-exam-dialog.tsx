"use client"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { GraduationCapIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CreateExamForm } from "./create-exam-form"
import { Button } from "@/components/ui/button"

const DialogContext = createContext<{
  setOpen: (open: boolean) => void
} | null>(null)

export function CreateExamDialogWrapper({
  workspaceSlug,
  children,
}: {
  workspaceSlug: string
  children: ReactNode
}) {
  const [open, setOpenState] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null)
  const router = useRouter()

  const setOpen = useCallback((nextOpen: boolean) => {
    setOpenState(nextOpen)
    if (nextOpen) {
      setIdempotencyKey(createIdempotencyKey())
    } else {
      setIdempotencyKey(null)
    }
  }, [])

  const handleCreated = useCallback(() => {
    setOpen(false)
    toast.success("Exam tracked successfully")
    router.refresh()
  }, [router, setOpen])

  return (
    <DialogContext.Provider value={{ setOpen }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-full max-h-dvh w-full flex-col gap-6 overflow-y-auto rounded-none p-6 sm:h-auto sm:max-h-[90vh] sm:max-w-xl sm:rounded-3xl sm:p-8">
          <DialogHeader className="-mx-6 -mt-6 mb-2 px-6 py-4 pr-14 sm:-mx-8 sm:-mt-8 sm:px-8 sm:py-5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-brand-violet-soft text-brand-violet-ink">
                <GraduationCapIcon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <DialogTitle className="text-xl font-semibold">
                  Track a new exam
                </DialogTitle>
                <DialogDescription>
                  All fields marked with * are compulsory to track a new exam.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {open && idempotencyKey && (
            <CreateExamForm
              workspaceSlug={workspaceSlug}
              idempotencyKey={idempotencyKey}
              mode="dialog"
              onCancel={() => setOpen(false)}
              onCreated={handleCreated}
            />
          )}
        </DialogContent>
      </Dialog>
    </DialogContext.Provider>
  )
}

export function CreateExamDialogTriggerButton({
  children,
  onClick,
  type = "button",
  ...props
}: React.ComponentProps<typeof Button>) {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error(
      "CreateExamDialogTriggerButton must be used within CreateExamDialogWrapper"
    )
  }
  return (
    <Button
      {...props}
      type={type}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) context.setOpen(true)
      }}
    >
      {children}
    </Button>
  )
}
