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

type BreadcrumbContextType = {
  breadcrumbs: BreadcrumbState | null
  setBreadcrumbs: (state: BreadcrumbState | null) => void
}

const BreadcrumbContext = React.createContext<BreadcrumbContextType>({
  breadcrumbs: null,
  setBreadcrumbs: () => {},
})

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = React.useState<BreadcrumbState | null>(null)
  const pathname = usePathname()

  // Clear custom breadcrumbs when navigating to a new route unless replaced by new component
  const [prevPathname, setPrevPathname] = React.useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setBreadcrumbs(null)
  }

  return (
    <BreadcrumbContext.Provider value={{ breadcrumbs, setBreadcrumbs }}>
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

  React.useEffect(() => {
    setBreadcrumbs({ segments, backHref, backLabel })
    return () => {
      setBreadcrumbs(null)
    }
  }, [setBreadcrumbs, JSON.stringify(segments), backHref, backLabel])

  return null
}
