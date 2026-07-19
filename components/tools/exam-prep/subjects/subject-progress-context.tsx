"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { withCalculatedSubjectProgress } from "@/lib/tools/exam-prep/progress/subject-rollup"
import type { ChapterWithRelations, SubjectWithRelations } from "@/types/progressapp/domain"

type ChapterUpdater =
  | ChapterWithRelations[]
  | ((chapters: ChapterWithRelations[]) => ChapterWithRelations[])

type SubjectProgressContextValue = {
  subject: SubjectWithRelations
  updateChapters: (updater: ChapterUpdater) => void
}

const SubjectProgressContext = createContext<SubjectProgressContextValue | null>(null)

export function SubjectProgressProvider({
  initialSubject,
  children,
}: {
  initialSubject: SubjectWithRelations
  children: ReactNode
}) {
  const [sourceSubject, setSourceSubject] = useState(initialSubject)

  useEffect(() => {
    queueMicrotask(() => setSourceSubject(initialSubject))
  }, [initialSubject])

  const updateChapters = useCallback((updater: ChapterUpdater) => {
    setSourceSubject((current) => ({
      ...current,
      chapters: typeof updater === "function" ? updater(current.chapters) : updater,
    }))
  }, [])

  const subject = useMemo(
    () => withCalculatedSubjectProgress(sourceSubject),
    [sourceSubject]
  )
  const value = useMemo(
    () => ({ subject, updateChapters }),
    [subject, updateChapters]
  )

  return (
    <SubjectProgressContext.Provider value={value}>
      {children}
    </SubjectProgressContext.Provider>
  )
}

export function useSubjectProgress() {
  const context = useContext(SubjectProgressContext)
  if (!context) {
    throw new Error("useSubjectProgress must be used within SubjectProgressProvider")
  }
  return context
}
