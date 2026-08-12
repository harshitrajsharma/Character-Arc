"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"

export function AuthFeedback({
  error,
  notice,
  className, // unused but kept for type signature compatibility
}: {
  error?: string
  notice?: string
  className?: string
}) {
  const lastShownError = useRef<string | undefined>(undefined)
  const lastShownNotice = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (error && error !== lastShownError.current) {
      toast.error(error)
      lastShownError.current = error
    }

    if (notice && notice !== lastShownNotice.current) {
      toast.success(notice)
      lastShownNotice.current = notice
    }
  }, [error, notice])

  return null
}
