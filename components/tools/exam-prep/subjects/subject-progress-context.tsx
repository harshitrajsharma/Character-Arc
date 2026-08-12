"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { withCalculatedSubjectProgress } from "@/lib/tools/exam-prep/progress/subject-rollup"
import type {
  ChapterWithRelations,
  ScheduledTest,
  SubjectWithRelations,
} from "@/types/progressapp/domain"
import type { NormalizedTestRecord } from "@/lib/tools/exam-prep/actions/test-actions"
import {
  upsertTestRecord as upsertTestRecordHelper,
  removeTestRecord as removeTestRecordHelper,
} from "./test-record-state"

type ChapterUpdater =
  | ChapterWithRelations[]
  | ((chapters: ChapterWithRelations[]) => ChapterWithRelations[])

type SubjectProgressContextValue = {
  subject: SubjectWithRelations
  updateChapters: (updater: ChapterUpdater) => void
  upsertTestRecord: (record: NormalizedTestRecord) => void
  removeTestRecord: (recordId: string) => void
  upsertScheduledTest: (scheduledTest: ScheduledTest) => void
  removeScheduledTest: (scheduledTestId: string) => void
}

const SubjectProgressContext =
  createContext<SubjectProgressContextValue | null>(null)

export function SubjectProgressProvider({
  initialSubject,
  children,
}: {
  initialSubject: SubjectWithRelations
  children: ReactNode
}) {
  const [sourceSubject, setSourceSubject] = useState(initialSubject)
  const [prevInitialSubject, setPrevInitialSubject] = useState(initialSubject)

  if (initialSubject !== prevInitialSubject) {
    setPrevInitialSubject(initialSubject)
    setSourceSubject(initialSubject)
  }

  const updateChapters = useCallback((updater: ChapterUpdater) => {
    setSourceSubject((current) => ({
      ...current,
      chapters:
        typeof updater === "function" ? updater(current.chapters) : updater,
    }))
  }, [])

  const upsertTestRecord = useCallback((record: NormalizedTestRecord) => {
    setSourceSubject((current) => upsertTestRecordHelper(current, record))
  }, [])

  const removeTestRecord = useCallback((recordId: string) => {
    setSourceSubject((current) => removeTestRecordHelper(current, recordId))
  }, [])

  const upsertScheduledTest = useCallback((scheduledTest: ScheduledTest) => {
    setSourceSubject((current) => {
      if (scheduledTest.subjectId !== current.id) return current

      const existing = current.scheduledTests ?? []
      const scheduledTests = existing.some(
        (candidate) => candidate.id === scheduledTest.id
      )
        ? existing.map((candidate) =>
            candidate.id === scheduledTest.id ? scheduledTest : candidate
          )
        : [scheduledTest, ...existing]

      return { ...current, scheduledTests }
    })
  }, [])

  const removeScheduledTest = useCallback((scheduledTestId: string) => {
    setSourceSubject((current) => ({
      ...current,
      scheduledTests: (current.scheduledTests ?? []).filter(
        (scheduledTest) => scheduledTest.id !== scheduledTestId
      ),
    }))
  }, [])

  const subject = useMemo(
    () => withCalculatedSubjectProgress(sourceSubject),
    [sourceSubject]
  )

  const value = useMemo(
    () => ({
      subject,
      updateChapters,
      upsertTestRecord,
      removeTestRecord,
      upsertScheduledTest,
      removeScheduledTest,
    }),
    [
      subject,
      updateChapters,
      upsertTestRecord,
      removeTestRecord,
      upsertScheduledTest,
      removeScheduledTest,
    ]
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
    throw new Error(
      "useSubjectProgress must be used within SubjectProgressProvider"
    )
  }
  return context
}
