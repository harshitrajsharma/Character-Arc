"use client"

import type { KeyboardEvent, ReactNode } from "react"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const railId = "exam-recommendations-rail"

export interface RecommendationRailProps {
  children: ReactNode
  labelledBy: string
}

export function RecommendationRail({
  children,
  labelledBy,
}: RecommendationRailProps) {
  const railRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [canScrollBackward, setCanScrollBackward] = useState(false)
  const [canScrollForward, setCanScrollForward] = useState(false)

  const updateScrollState = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const remaining = viewport.scrollWidth - viewport.clientWidth
    setCanScrollBackward(viewport.scrollLeft > 2)
    setCanScrollForward(viewport.scrollLeft < remaining - 2)
  }, [])

  const updateRailGeometry = useCallback(() => {
    const rail = railRef.current
    if (!rail) return

    const contentRect = rail.parentElement?.getBoundingClientRect()
    if (!contentRect) return

    const shell = rail.closest<HTMLElement>("[data-slot='sidebar-inset']")
    const shellRect = shell?.getBoundingClientRect()
    const documentWidth = document.documentElement.clientWidth
    const viewportLeft = Math.max(0, shellRect?.left ?? 0)
    const viewportRight = Math.min(
      documentWidth,
      shellRect?.right ?? documentWidth
    )
    const leadingGutter = Math.max(0, contentRect.left - viewportLeft)
    const trailingGutter = Math.max(24, leadingGutter)
    const viewportWidth = Math.max(
      contentRect.width + leadingGutter,
      viewportRight - viewportLeft
    )

    rail.style.width = `${Math.floor(viewportWidth)}px`
    rail.style.marginInlineStart = `${-Math.floor(leadingGutter)}px`
    rail.style.setProperty(
      "--recommendation-rail-leading",
      `${Math.floor(leadingGutter)}px`
    )
    rail.style.setProperty(
      "--recommendation-rail-trailing",
      `${Math.floor(trailingGutter)}px`
    )
  }, [])

  useLayoutEffect(() => {
    const rail = railRef.current
    if (!rail) return

    updateRailGeometry()

    const resizeObserver = new ResizeObserver(updateRailGeometry)
    resizeObserver.observe(document.documentElement)
    if (rail.parentElement) resizeObserver.observe(rail.parentElement)
    const shell = rail.closest<HTMLElement>("[data-slot='sidebar-inset']")
    if (shell) resizeObserver.observe(shell)

    return () => {
      resizeObserver.disconnect()
      rail.style.removeProperty("width")
      rail.style.removeProperty("margin-inline-start")
      rail.style.removeProperty("--recommendation-rail-leading")
      rail.style.removeProperty("--recommendation-rail-trailing")
    }
  }, [updateRailGeometry])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    updateScrollState()
    viewport.addEventListener("scroll", updateScrollState, { passive: true })

    const resizeObserver = new ResizeObserver(updateScrollState)
    resizeObserver.observe(viewport)

    return () => {
      viewport.removeEventListener("scroll", updateScrollState)
      resizeObserver.disconnect()
    }
  }, [updateScrollState])

  function scrollByLane(direction: -1 | 1) {
    const viewport = viewportRef.current
    if (!viewport) return

    const lane = viewport.querySelector<HTMLElement>(
      "[data-recommendation-lane]"
    )
    const laneWidth =
      lane?.getBoundingClientRect().width ?? viewport.clientWidth
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    viewport.scrollBy({
      left: direction * (laneWidth + 16),
      behavior: reducedMotion ? "auto" : "smooth",
    })
  }

  function handleRailKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return

    const viewport = viewportRef.current
    if (!viewport) return

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault()
      scrollByLane(event.key === "ArrowLeft" ? -1 : 1)
      return
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault()
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches

      viewport.scrollTo({
        left:
          event.key === "Home"
            ? 0
            : viewport.scrollWidth - viewport.clientWidth,
        behavior: reducedMotion ? "auto" : "smooth",
      })
    }
  }

  return (
    <div ref={railRef} className="relative w-full max-w-none min-w-0">
      <div
        id={railId}
        ref={viewportRef}
        role="region"
        aria-labelledby={labelledBy}
        aria-describedby={`${railId}-instructions`}
        aria-keyshortcuts="ArrowLeft ArrowRight Home End"
        tabIndex={0}
        onKeyDown={handleRailKeyDown}
        className="[scroll-snap-type:x_proximity] [scroll-padding-inline:var(--recommendation-rail-leading,1rem)] scrollbar-none overflow-x-auto overscroll-x-contain scroll-smooth pb-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-reduce:scroll-auto"
      >
        <p id={`${railId}-instructions`} className="sr-only">
          Scroll horizontally to browse four recommendation groups. When this
          region is focused, use the left and right arrow keys to move one group
          and Home or End to jump to either edge.
        </p>
        <div
          role="list"
          className="flex w-max items-stretch gap-4 [padding-inline-start:var(--recommendation-rail-leading,1rem)] [padding-inline-end:var(--recommendation-rail-trailing,1.5rem)]"
        >
          {children}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-0 hidden -translate-y-1/2 items-center justify-between px-2 md:flex lg:px-3">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Previous recommendation group"
                aria-controls={railId}
                disabled={!canScrollBackward}
                className="pointer-events-auto shadow-md disabled:invisible"
                onClick={() => scrollByLane(-1)}
              />
            }
          >
            <ChevronLeftIcon aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent side="right">Previous group</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Next recommendation group"
                aria-controls={railId}
                disabled={!canScrollForward}
                className="pointer-events-auto shadow-md disabled:invisible"
                onClick={() => scrollByLane(1)}
              />
            }
          >
            <ChevronRightIcon aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent side="left">Next group</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
