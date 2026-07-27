"use client"

import { createContext, useCallback, useContext, useState, type ReactNode } from "react"
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
      setIdempotencyKey(crypto.randomUUID())
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
        <DialogContent className="w-full h-full max-h-dvh sm:h-auto sm:max-h-[90vh] sm:max-w-xl rounded-none sm:rounded-3xl p-6 sm:p-8 flex flex-col gap-6 overflow-y-auto">
          <DialogHeader className="mb-2">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-brand-neon-soft text-brand-neon-ink">
                <GraduationCapIcon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <DialogTitle className="text-xl font-semibold">Track a new exam</DialogTitle>
                <DialogDescription>
                  Set up the foundation to track your syllabus.
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
