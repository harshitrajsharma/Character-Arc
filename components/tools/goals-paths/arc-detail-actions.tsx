"use client"

import { useState } from "react"
import Link from "next/link"
import { EllipsisIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { ArcDeleteDialog } from "@/components/tools/goals-paths/arc-delete-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type ArcDetailActionsProps = {
  arcId: string
  title: string
  revision: number
  checkInCount: number
  workspaceId: string
  installationId: string
  deleteIdempotencyKey: string
}

export function ArcDetailActions(props: ArcDetailActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Link
          href={`/tools/goals-paths/${props.arcId}/edit`}
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "min-h-11 sm:min-h-8"
          )}
        >
          <PencilIcon data-icon="inline-start" aria-hidden="true" />
          Edit
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-11 sm:size-8"
                aria-label="More Arc actions"
              />
            }
          >
            <EllipsisIcon aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2Icon aria-hidden="true" />
              Delete Arc
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ArcDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        arcId={props.arcId}
        title={props.title}
        revision={props.revision}
        checkInCount={props.checkInCount}
        workspaceId={props.workspaceId}
        installationId={props.installationId}
        idempotencyKey={props.deleteIdempotencyKey}
      />
    </>
  )
}
