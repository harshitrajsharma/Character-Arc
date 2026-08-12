"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

/**
 * Floating mobile-only entry point for the app sidebar. Lives outside the
 * navbar so the navbar layout and its existing controls stay untouched.
 */
export function MobileSidebarTrigger({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "fixed bottom-5 left-5 z-50 lg:hidden",
        className
      )}
    >
      <SidebarTrigger
        size="icon"
        aria-label="Open navigation"
        className="flex size-11 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground shadow-lg hover:bg-sidebar-primary/90"
      />
    </div>
  )
}
