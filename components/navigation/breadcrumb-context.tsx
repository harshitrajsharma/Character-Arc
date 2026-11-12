"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

export type BreadcrumbSegment = {
  label: string
  href?: string
}

export type BreadcrumbState = {
  segments: BreadcrumbSegment[]
  backHref?: string
  backLabel?: string
}

type StoredBreadcrumbs = {
  pathname: string
  state: BreadcrumbState
}

type BreadcrumbContextType = {
  breadcrumbs: BreadcrumbState | null
  setBreadcrumbs: (state: BreadcrumbState | null) => void
}

const BreadcrumbContext = React.createContext<BreadcrumbContextType>({
  breadcrumbs: null,
  setBreadcrumbs: () => {},
})

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = React.useState<StoredBreadcrumbs | null>(null)
  const pathname = usePathname()

  const setBreadcrumbs = React.useCallback(
    (state: BreadcrumbState | null) => {
      setStored(state ? { pathname, state } : null)
    },
    [pathname]
  )

  // Naturally clears custom breadcrumbs on route change without cascading effects or render-phase setState
  const breadcrumbs = stored?.pathname === pathname ? stored.state : null

  const contextValue = React.useMemo<BreadcrumbContextType>(
    () => ({ breadcrumbs, setBreadcrumbs }),
    [breadcrumbs, setBreadcrumbs]
  )

  return (
    <BreadcrumbContext.Provider value={contextValue}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumb() {
  return React.useContext(BreadcrumbContext)
}

/**
 * Client component to declare custom breadcrumbs for a server or client page
 */
export function SetNavbarBreadcrumbs({
  segments,
  backHref,
  backLabel,
}: {
  segments: BreadcrumbSegment[]
  backHref?: string
  backLabel?: string
}) {
  const { setBreadcrumbs } = useBreadcrumb()
  const serialized = JSON.stringify(segments)

  React.useEffect(() => {
    setBreadcrumbs({ segments, backHref, backLabel })
    return () => {
      setBreadcrumbs(null)
    }
  }, [setBreadcrumbs, serialized, backHref, backLabel])

  return null
}
