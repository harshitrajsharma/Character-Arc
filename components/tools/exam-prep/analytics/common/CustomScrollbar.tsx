"use client"

import { cn } from "@/lib/utils"
import React, { ReactNode } from "react"

interface CustomScrollbarProps {
  className?: string
  children: ReactNode
  maxHeight?: string | number
  style?: React.CSSProperties
}

export function CustomScrollbar({
  className,
  children,
  maxHeight = "100%",
  style,
}: CustomScrollbarProps) {
  return (
    <div
      className={cn("h-full scrollbar-thin overflow-auto", className)}
      style={{
        maxHeight,
        height: "100%",
        scrollbarWidth: "thin",
        scrollbarColor: "var(--scrollbar-thumb) var(--scrollbar-track)",
        ...style,
      }}
    >
      <style jsx global>{`
        /* Modern minimal scrollbar styles */
        :root {
          --scrollbar-track: hsl(var(--background) / 0.5);
          --scrollbar-thumb: hsl(var(--muted-foreground) / 0.3);
          --scrollbar-thumb-hover: hsl(var(--muted-foreground) / 0.5);
          --scrollbar-size: 6px;
        }

        .dark {
          --scrollbar-track: hsl(var(--background) / 0.3);
          --scrollbar-thumb: hsl(var(--muted-foreground) / 0.5);
          --scrollbar-thumb-hover: hsl(var(--muted-foreground) / 0.7);
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: var(--scrollbar-size);
          height: var(--scrollbar-size);
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: var(--scrollbar-track);
          border-radius: 999px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: var(--scrollbar-thumb);
          border-radius: 999px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: var(--scrollbar-thumb-hover);
        }

        /* Hide scrollbar when not needed */
        .scrollbar-thin::-webkit-scrollbar-corner {
          background: transparent;
        }
      `}</style>
      {children}
    </div>
  )
}
