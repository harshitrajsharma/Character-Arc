"use client"

import { useState } from "react"
import {
  CalendarIcon,
  MoreVerticalIcon,
  PencilIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type SyllabusItemActionsProps = {
  kind: "chapter" | "topic"
  hoverGroup: "chapter" | "topic"
  name: string
  important: boolean
  onUpdate: (update: { name: string; important: boolean }) => Promise<void>
  onDelete: () => Promise<void>
  onScheduleTest?: () => void
}

export function SyllabusItemActions({
  kind,
  hoverGroup,
  name,
  important,
  onUpdate,
  onDelete,
  onScheduleTest,
}: SyllabusItemActionsProps) {
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [editedName, setEditedName] = useState(name)
  const [editedImportant, setEditedImportant] = useState(important)
  const [pendingAction, setPendingAction] = useState<
    "update" | "delete" | null
  >(null)
  const label = kind === "chapter" ? "chapter" : "topic"
  const actionVisibility =
    hoverGroup === "chapter"
      ? "opacity-100"
      : "opacity-60 group-hover/topic:opacity-100 group-focus-within/topic:opacity-100"

  function openEdit() {
    setEditedName(name)
    setEditedImportant(important)
    setShowEdit(true)
  }

  async function save(
    update = { name: editedName.trim(), important: editedImportant }
  ) {
    if (!update.name || pendingAction) return
    setPendingAction("update")
    try {
      await onUpdate(update)
      setShowEdit(false)
    } catch {
      return
    } finally {
      setPendingAction(null)
    }
  }

  async function remove() {
    if (pendingAction) return
    setPendingAction("delete")
    try {
      await onDelete()
      setShowDelete(false)
    } catch {
      return
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <>
      <div className="hidden items-center sm:flex">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className={cn(
                  "text-muted-foreground transition-opacity focus-visible:opacity-100",
                  actionVisibility,
                  important && "text-brand-amber-ink opacity-100"
                )}
                onClick={() => save({ name, important: !important })}
                disabled={pendingAction !== null}
                aria-label={`${important ? "Remove" : "Mark"} ${name} ${important ? "from" : "as"} high yield`}
              />
            }
          >
            <StarIcon className={cn(important && "fill-current")} />
          </TooltipTrigger>
          <TooltipContent>
            {important ? "Remove high yield" : "Mark high yield"}
          </TooltipContent>
        </Tooltip>

        <div
          className={cn(
            "flex transition-opacity focus-within:opacity-100 group-focus-within/topic:opacity-100",
            actionVisibility
          )}
        >
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={openEdit}
                  aria-label={`Edit ${name}`}
                />
              }
            >
              <PencilIcon />
            </TooltipTrigger>
            <TooltipContent>Edit {label}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowDelete(true)}
                  aria-label={`Delete ${name}`}
                />
              }
            >
              <Trash2Icon />
            </TooltipTrigger>
            <TooltipContent>Delete {label}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="sm:hidden"
          render={
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={`Open actions for ${name}`}
            />
          }
        >
          <MoreVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onScheduleTest ? (
            <DropdownMenuItem onClick={onScheduleTest}>
              <CalendarIcon /> Schedule Test
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            onClick={() => save({ name, important: !important })}
          >
            <StarIcon className={cn(important && "fill-current")} />
            {important ? "Remove high yield" : "Mark high yield"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openEdit}>
            <PencilIcon /> Edit {label}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setShowDelete(true)}
          >
            <Trash2Icon /> Delete {label}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void save()
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit {label}</DialogTitle>
              <DialogDescription>
                Change the name or how strongly this item is weighted in
                progress tracking.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                value={editedName}
                onChange={(event) => setEditedName(event.target.value)}
                maxLength={120}
                autoFocus
                disabled={pendingAction !== null}
                aria-label={`${label} name`}
              />
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
                <Checkbox
                  checked={editedImportant}
                  onCheckedChange={(checked) =>
                    setEditedImportant(checked === true)
                  }
                  disabled={pendingAction !== null}
                />
                <span>
                  <span className="block text-sm font-medium">High yield</span>
                  <span className="block text-xs text-muted-foreground">
                    High-yield topics use five progress steps instead of three.
                  </span>
                </span>
              </label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEdit(false)}
                disabled={pendingAction !== null}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="min-w-28"
                disabled={!editedName.trim() || pendingAction !== null}
              >
                {pendingAction === "update" ? <Spinner /> : null}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {kind === "chapter"
                ? `“${name}” and all of its topics and progress will be removed.`
                : `“${name}” and its progress will be removed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendingAction !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="min-w-28"
              onClick={() => void remove()}
              disabled={pendingAction !== null}
            >
              {pendingAction === "delete" ? <Spinner /> : null}
              Delete {label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
