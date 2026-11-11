"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getBuilderQuestionBankAction } from "@/lib/tools/mock-tests/actions/builder-bank-actions"
import {
  builderBankKey,
  builderBankUiKey,
  type BuilderBankFilters,
} from "@/lib/tools/mock-tests/builder-bank-cache"
import type { QuestionBankItem } from "@/lib/tools/definitions/mock-tests/repository"

type PickerMemory = BuilderBankFilters & {
  scroll: number
  selected: QuestionBankItem[]
  expanded: string[]
}
const defaults: PickerMemory = {
  query: "",
  type: "ALL",
  difficulty: "ALL",
  page: 1,
  scroll: 0,
  selected: [],
  expanded: [],
}

/** Viewer-scoped in-memory state only. No question/answer data is written to browser storage. */
export function useBuilderQuestionBank({
  open,
  workspaceSlug,
  viewerId,
  assessmentId,
}: {
  open: boolean
  workspaceSlug: string
  viewerId: string
  assessmentId: string
}) {
  const client = useQueryClient()
  const [initial] = useState(
    () =>
      client.getQueryData<PickerMemory>(
        builderBankUiKey(workspaceSlug, viewerId, assessmentId)
      ) ?? defaults
  )
  const [filters, setFilters] = useState<BuilderBankFilters>(initial)
  const [debouncedQuery, setDebouncedQuery] = useState(initial.query.trim())
  const scroller = useRef<HTMLDivElement>(null)
  const scroll = useRef(initial.scroll)
  const attachScroller = useCallback((node: HTMLDivElement | null) => {
    scroller.current = node
    if (node) node.scrollTop = scroll.current
  }, [])
  const normalizedQuery = filters.query.trim()
  const waitingForSearch = normalizedQuery !== debouncedQuery
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(normalizedQuery), 250)
    return () => clearTimeout(timer)
  }, [normalizedQuery])
  const query = useQuery({
    queryKey: builderBankKey(workspaceSlug, viewerId, {
      ...filters,
      query: debouncedQuery,
    }),
    queryFn: () =>
      getBuilderQuestionBankAction({
        workspaceSlug,
        q: debouncedQuery,
        type: filters.type,
        difficulty: filters.difficulty,
        page: filters.page,
      }),
    enabled: open && !waitingForSearch,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
  })
  const loading = waitingForSearch || (query.isPending && !query.isError)
  useEffect(() => {
    if (open && !loading && query.data && scroller.current)
      scroller.current.scrollTop = scroll.current
  }, [open, loading, query.dataUpdatedAt, query.data])

  function change<K extends keyof BuilderBankFilters>(
    key: K,
    value: BuilderBankFilters[K]
  ) {
    scroll.current = 0
    setFilters((previous) => ({
      ...previous,
      [key]: value,
      ...(key !== "page" ? { page: 1 } : {}),
    }))
  }
  function reset() {
    scroll.current = 0
    setFilters(defaults)
  }
  function remember(selected: QuestionBankItem[], expanded: string[]) {
    client.setQueryDefaults(
      builderBankUiKey(workspaceSlug, viewerId, assessmentId),
      { gcTime: 30 * 60_000 }
    )
    client.setQueryData<PickerMemory>(
      builderBankUiKey(workspaceSlug, viewerId, assessmentId),
      { ...filters, scroll: scroll.current, selected, expanded }
    )
  }
  function onScroll() {
    if (open && !loading && scroller.current)
      scroll.current = scroller.current.scrollTop
  }
  return {
    initial,
    filters,
    change,
    reset,
    query,
    loading,
    scroller: attachScroller,
    onScroll,
    remember,
  }
}
