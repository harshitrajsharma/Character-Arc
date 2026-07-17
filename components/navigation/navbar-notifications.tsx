"use client"

import { BellIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function NavbarNotifications() {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              aria-label="Notifications"
              className={buttonVariants({ variant: "ghost", size: "icon" })}
            />
          }
        >
          <BellIcon aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent side="bottom">Notifications</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" sideOffset={8}>
        <PopoverHeader>
          <PopoverTitle>Notifications</PopoverTitle>
          <PopoverDescription>
            Updates from your tools and agents.
          </PopoverDescription>
        </PopoverHeader>
        <Empty className="min-h-44 p-6">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BellIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>You&apos;re all caught up</EmptyTitle>
            <EmptyDescription>
              New outcomes and attention items will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </PopoverContent>
    </Popover>
  )
}
