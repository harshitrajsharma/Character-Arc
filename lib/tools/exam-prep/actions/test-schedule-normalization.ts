import type { ScheduledTest } from "@/types/progressapp/domain"

export function normalizeUnifiedTestSchedule(
  allTests: ScheduledTest[],
  subjectProps: Record<string, unknown>,
  chapters: { id: string; properties: Record<string, unknown> }[]
) {
  const existingSubjectTests = Array.isArray(subjectProps.scheduledTests)
    ? (subjectProps.scheduledTests as ScheduledTest[])
    : []
  const legacyScopeMap = new Map<
    string,
    { scope: "subject" | "chapter"; targetChapterIds?: string[] }
  >()

  for (const t of existingSubjectTests) {
    if (t.id) {
      legacyScopeMap.set(t.id, { scope: "subject" })
    }
  }

  for (const c of chapters) {
    const existingChapTests = Array.isArray(c.properties.scheduledTests)
      ? (c.properties.scheduledTests as ScheduledTest[])
      : []
    for (const t of existingChapTests) {
      if (t.id) {
        legacyScopeMap.set(t.id, { scope: "chapter", targetChapterIds: [c.id] })
      }
    }
  }

  const chapterTestsMap = new Map<string, ScheduledTest[]>()
  for (const c of chapters) {
    chapterTestsMap.set(c.id, [])
  }

  const normalizedTests = allTests.map((t) => {
    let scope = t.scope
    let targetChapterIds = t.targetChapterIds

    if (!scope) {
      const legacy = legacyScopeMap.get(t.id)
      if (legacy) {
        scope = legacy.scope
        targetChapterIds = legacy.targetChapterIds
      } else {
        scope = "subject"
        targetChapterIds = undefined
      }
    }

    if (scope === "chapter") {
      if (!targetChapterIds || targetChapterIds.length === 0) {
        throw new Error(
          `Scheduled test '${t.title}' is chapter-scoped but missing targetChapterIds`
        )
      }
      if (targetChapterIds.length !== 1) {
        throw new Error(
          `Scheduled test '${t.title}' is chapter-scoped but must target exactly one chapter`
        )
      }
      const cid = targetChapterIds[0]
      if (!chapterTestsMap.has(cid)) {
        throw new Error(
          `Scheduled test '${t.title}' targets an unknown chapter: ${cid}`
        )
      }

      return {
        ...t,
        scope,
        targetChapterIds: [cid],
      }
    }

    if (scope === "subject") {
      return {
        ...t,
        scope,
        targetChapterIds: undefined,
      }
    }

    return {
      ...t,
      scope,
      targetChapterIds,
    }
  })

  const subjectTests = normalizedTests.filter(
    (t) => t.scope === "subject" || t.scope === "multi-chapter"
  )

  for (const t of normalizedTests) {
    if (
      t.scope === "chapter" &&
      t.targetChapterIds &&
      t.targetChapterIds.length > 0
    ) {
      const cid = t.targetChapterIds[0]
      // Safe to assume it exists because of validation loop above
      chapterTestsMap.get(cid)!.push(t)
    }
  }

  return { subjectTests, chapterTestsMap }
}
