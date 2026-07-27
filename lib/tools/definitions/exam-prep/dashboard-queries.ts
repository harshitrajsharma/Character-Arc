/* eslint-disable @typescript-eslint/no-explicit-any */
import { cache } from "react"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { SubjectWithRelations } from "@/types/progressapp/domain"
import { withCalculatedSubjectProgress } from "@/lib/tools/exam-prep/progress/subject-rollup"
import { normalizeSubjectProgressPolicy } from "@/lib/tools/exam-prep/progress/policy"

// --- Module-level RelationType ID Cache ---
// BlockRelationType records are static registry data — they only change when
// `bun run db:sync-registry` is run (a deployment-time operation). Caching
// these IDs eliminates 2–3 redundant Prisma round-trips on every request.
let _relTypeIds: {
  examHasSubject: string
  subjectHasChapter: string
  chapterHasTopic: string
} | null = null

async function getExamPrepRelationTypeIds() {
  if (_relTypeIds) return _relTypeIds

  const [t1, t2, t3] = await Promise.all([
    prisma.blockRelationType.findUnique({ where: { key: "exam-prep.exam-has-subject" }, select: { id: true } }),
    prisma.blockRelationType.findUnique({ where: { key: "exam-prep.subject-has-chapter" }, select: { id: true } }),
    prisma.blockRelationType.findUnique({ where: { key: "exam-prep.chapter-has-topic" }, select: { id: true } }),
  ])

  if (!t1 || !t2 || !t3) return null

  _relTypeIds = {
    examHasSubject: t1.id,
    subjectHasChapter: t2.id,
    chapterHasTopic: t3.id,
  }
  return _relTypeIds
}

// --- Pure Eligibility Helpers ---

export function checkExamEligibility(
  workspaceId: string,
  installationId: string,
  exam: {
    workspaceId: string
    status: string
    archivedAt: Date | null
    originToolInstallationId: string | null
  } | null
): boolean {
  if (!exam) return false
  if (exam.workspaceId !== workspaceId) return false
  if (exam.originToolInstallationId !== installationId) return false
  if (exam.status !== "ACTIVE") return false
  if (exam.archivedAt !== null) return false
  return true
}

export function checkSubjectOnlyEligibility(
  workspaceId: string,
  installationId: string,
  subject: {
    workspaceId: string
    status: string
    archivedAt: Date | null
    originToolInstallationId: string | null
  } | null
): boolean {
  if (!subject) return false
  if (subject.workspaceId !== workspaceId) return false
  if (subject.originToolInstallationId !== installationId) return false
  if (subject.status !== "ACTIVE") return false
  if (subject.archivedAt !== null) return false
  return true
}

export type CheckSubjectEligibilityInput = {
  workspaceId: string
  installationId: string
  exam: {
    id: string
    workspaceId: string
    status: string
    archivedAt: Date | null
    originToolInstallationId: string | null
  } | null
  subject: {
    id: string
    workspaceId: string
    status: string
    archivedAt: Date | null
    originToolInstallationId: string | null
  } | null
  relation: {
    workspaceId: string
    fromBlockId: string
    toBlockId: string
  } | null
}

export function checkSubjectEligibility({
  workspaceId,
  installationId,
  exam,
  subject,
  relation,
}: CheckSubjectEligibilityInput): boolean {
  if (!checkExamEligibility(workspaceId, installationId, exam)) return false
  if (!checkSubjectOnlyEligibility(workspaceId, installationId, subject)) return false
  if (!relation) return false
  if (relation.workspaceId !== workspaceId) return false
  if (relation.fromBlockId !== exam!.id || relation.toBlockId !== subject!.id) return false
  return true
}

// --- Query Functions ---

export async function getExamDashboardData(
  examId: string,
  workspaceId: string,
  installationId: string,
  userId: string
): Promise<SubjectWithRelations[]> {
  const uuid = z.string().uuid()
  if (
    !uuid.safeParse(workspaceId).success ||
    !uuid.safeParse(examId).success ||
    !uuid.safeParse(installationId).success ||
    !uuid.safeParse(userId).success
  ) {
    return []
  }

  // Use module-level cache for relation type IDs (no round-trip after first request)
  const relTypeIds = await getExamPrepRelationTypeIds()
  if (!relTypeIds) return []

  const examData = await prisma.block.findFirst({
    where: { id: examId },
    select: { workspaceId: true, status: true, archivedAt: true, originToolInstallationId: true }
  })
  if (!checkExamEligibility(workspaceId, installationId, examData)) {
    return []
  }

  const subjectsRels = await prisma.blockRelation.findMany({
    where: { workspaceId, fromBlockId: examId, relationTypeId: relTypeIds.examHasSubject },
    select: { toBlockId: true, position: true },
    orderBy: { position: "asc" },
  })
  const subjectIds = subjectsRels.map(r => r.toBlockId)
  if (subjectIds.length === 0) return []

  const subjectsData = await prisma.block.findMany({
    where: {
      id: { in: subjectIds },
      workspaceId,
      status: "ACTIVE",
      archivedAt: null,
      blockType: { key: "exam-prep.subject" },
      originToolInstallationId: installationId,
    },
    select: { id: true, title: true, properties: true, status: true, archivedAt: true, originToolInstallationId: true, workspaceId: true, createdAt: true, updatedAt: true }
  })

  // Filter out any subjects that do not match the eligibility criteria
  const subjects = subjectsData.filter(subj =>
    checkSubjectOnlyEligibility(workspaceId, installationId, subj)
  )

  const chaptersRels = await prisma.blockRelation.findMany({
    where: { workspaceId, fromBlockId: { in: subjectIds }, relationTypeId: relTypeIds.subjectHasChapter },
    select: { fromBlockId: true, toBlockId: true, position: true },
    orderBy: [{ fromBlockId: "asc" }, { position: "asc" }],
  })
  const chapterIds = chaptersRels.map(r => r.toBlockId)
  const chapters = chapterIds.length > 0 ? await prisma.block.findMany({
    where: {
      id: { in: chapterIds },
      workspaceId,
      status: "ACTIVE",
      archivedAt: null,
      blockType: { key: "exam-prep.chapter" },
      originToolInstallationId: installationId,
    },
    select: { id: true, title: true, properties: true, createdAt: true, updatedAt: true }
  }) : []

  const topicsRels = await prisma.blockRelation.findMany({
    where: { workspaceId, fromBlockId: { in: chapterIds }, relationTypeId: relTypeIds.chapterHasTopic },
    select: { fromBlockId: true, toBlockId: true, position: true },
    orderBy: [{ fromBlockId: "asc" }, { position: "asc" }],
  })
  const topicIds = topicsRels.map(r => r.toBlockId)
  const topics = topicIds.length > 0 ? await prisma.block.findMany({
    where: {
      id: { in: topicIds },
      workspaceId,
      status: "ACTIVE",
      archivedAt: null,
      blockType: { key: "exam-prep.topic" },
      originToolInstallationId: installationId,
    },
    select: { id: true, title: true, properties: true, createdAt: true, updatedAt: true }
  }) : []

  const testRecords = await prisma.testRecord.findMany({
    where: {
      workspaceId,
      userId,
      examId,
      subjectId: { in: subjectIds },
    },
    orderBy: { createdAt: "desc" },
  })

  const chaptersBySubject = new Map<string, typeof chapters>()
  for (const rel of chaptersRels) {
    const arr = chaptersBySubject.get(rel.fromBlockId) || []
    const chapter = chapters.find(c => c.id === rel.toBlockId)
    if (chapter) arr.push(chapter)
    chaptersBySubject.set(rel.fromBlockId, arr)
  }

  const topicsByChapter = new Map<string, typeof topics>()
  for (const rel of topicsRels) {
    const arr = topicsByChapter.get(rel.fromBlockId) || []
    const topic = topics.find(t => t.id === rel.toBlockId)
    if (topic) arr.push(topic)
    topicsByChapter.set(rel.fromBlockId, arr)
  }

  return subjects.map((subj, index) => {
    const subjectProps = subj.properties as any
    const subjChapters = chaptersBySubject.get(subj.id) || []
    const subjectTestRecords = testRecords
      .filter((record) => record.subjectId === subj.id)
      .map((record) => ({
        ...record,
        marksObtained: Number(record.marksObtained),
        totalMarks: Number(record.totalMarks),
      }))
    
    return withCalculatedSubjectProgress({
      id: subj.id,
      name: subj.title,
      weightage: subjectProps.weightage ?? 0,
      expectedMarks: subjectProps.expectedMarks ?? 0,
      foundationLevel: subjectProps.foundationLevel ?? "Beginner",
      overallProgress: 0,
      learningProgress: 0,
      revisionProgress: 0,
      practiceProgress: 0,
      testProgress: 0,
      position: subjectsRels.find((relation) => relation.toBlockId === subj.id)?.position ?? index,
      userId: "",
      createdAt: subj.createdAt,
      updatedAt: subj.updatedAt,
      tests: [],
      mockTests: [],
      testRecords: subjectTestRecords,
      scheduledTests: Array.isArray(subjectProps.scheduledTests) ? subjectProps.scheduledTests : [],
      progressPolicy: normalizeSubjectProgressPolicy(subjectProps),
      chapters: subjChapters.map((chap, cIndex) => {
        const chapProps = chap.properties as any
        const chapTopics = topicsByChapter.get(chap.id) || []
        return {
          id: chap.id,
          name: chap.title,
          important: chapProps.important ?? false,
          overallProgress: 0,
          learningProgress: 0,
          revisionProgress: 0,
          practiceProgress: 0,
          testProgress: 0,
          position: chaptersRels.find((relation) => relation.toBlockId === chap.id)?.position ?? cIndex,
          subjectId: subj.id,
          createdAt: chap.createdAt,
          updatedAt: chap.updatedAt,
          testRecords: subjectTestRecords.filter((record) => record.chapterId === chap.id),
          subject: null as any,
          topics: chapTopics.map((top, tIndex) => {
            const topProps = top.properties as any
            return {
              id: top.id,
              name: top.title,
              important: topProps.important ?? false,
              learningStatus: topProps.learningStatus ?? false,
              revisionCount: topProps.revisionCount ?? 0,
              practiceCount: topProps.practiceCount ?? 0,
              testCount: topProps.testCount ?? 0,
              position: topicsRels.find((relation) => relation.toBlockId === top.id)?.position ?? tIndex,
              learningCompletedAt: topProps.learningCompletedAt ? new Date(topProps.learningCompletedAt) : null,
              lastRevised: topProps.lastRevised ? new Date(topProps.lastRevised) : null,
              lastPracticed: topProps.lastPracticed ? new Date(topProps.lastPracticed) : null,
              nextRevision: topProps.nextRevision ? new Date(topProps.nextRevision) : null,
              chapterId: chap.id,
              createdAt: top.createdAt,
              updatedAt: top.updatedAt,
            }
          })
        }
      })
    })
  })
}

export async function getSubjectDashboardData(
  subjectId: string,
  workspaceId: string,
  userId: string,
  installationId?: string
): Promise<SubjectWithRelations | null> {
  const uuid = z.string().uuid()
  if (
    !uuid.safeParse(subjectId).success ||
    !uuid.safeParse(workspaceId).success ||
    !uuid.safeParse(userId).success
  ) {
    return null
  }
  if (installationId && !uuid.safeParse(installationId).success) {
    return null
  }

  // Use module-level cache for relation type IDs
  const relTypeIds = await getExamPrepRelationTypeIds()
  if (!relTypeIds) return null

  const subject = await prisma.block.findFirst({
    where: {
      id: subjectId,
      workspaceId,
      status: "ACTIVE",
      archivedAt: null,
      blockType: { key: "exam-prep.subject" },
      ...(installationId ? { originToolInstallationId: installationId } : {}),
    }
  })
  if (!subject) {
    return null
  }

  const chaptersRels = await prisma.blockRelation.findMany({
    where: { workspaceId, fromBlockId: subjectId, relationTypeId: relTypeIds.subjectHasChapter },
    select: { toBlockId: true, position: true },
    orderBy: { position: "asc" },
  })
  const chapterIds = chaptersRels.map(r => r.toBlockId)
  const chapters = chapterIds.length > 0 ? await prisma.block.findMany({
    where: {
      id: { in: chapterIds },
      workspaceId,
      status: "ACTIVE",
      archivedAt: null,
      blockType: { key: "exam-prep.chapter" },
      ...(installationId ? { originToolInstallationId: installationId } : {}),
    },
    select: { id: true, title: true, properties: true, createdAt: true, updatedAt: true }
  }) : []

  const topicsRels = chapterIds.length > 0 ? await prisma.blockRelation.findMany({
    where: { workspaceId, fromBlockId: { in: chapterIds }, relationTypeId: relTypeIds.chapterHasTopic },
    select: { fromBlockId: true, toBlockId: true, position: true },
    orderBy: [{ fromBlockId: "asc" }, { position: "asc" }],
  }) : []
  const topicIds = topicsRels.map(r => r.toBlockId)
  const topics = topicIds.length > 0 ? await prisma.block.findMany({
    where: {
      id: { in: topicIds },
      workspaceId,
      status: "ACTIVE",
      archivedAt: null,
      blockType: { key: "exam-prep.topic" },
      ...(installationId ? { originToolInstallationId: installationId } : {}),
    },
    select: { id: true, title: true, properties: true, createdAt: true, updatedAt: true }
  }) : []

  const testRecords = await prisma.testRecord.findMany({
    where: { subjectId, workspaceId, userId },
    orderBy: { createdAt: "desc" },
  })
  const subProps = subject.properties as any || {}
  
  return withCalculatedSubjectProgress({
    id: subject.id,
    name: subject.title,
    weightage: subProps.weightage ?? 0,
    expectedMarks: subProps.expectedMarks ?? 0,
    foundationLevel: subProps.foundationLevel ?? "Beginner",
    overallProgress: subProps.overallProgress ?? 0,
    learningProgress: subProps.learningProgress ?? 0,
    revisionProgress: subProps.revisionProgress ?? 0,
    practiceProgress: subProps.practiceProgress ?? 0,
    testProgress: subProps.testProgress ?? 0,
    position: subject.position,
    userId: "unknown",
    createdAt: subject.createdAt,
    updatedAt: subject.updatedAt,
    chapterCount: chapters.length,
    topicCount: topics.length,
    tests: [],
    mockTests: [],
    testRecords: testRecords.map((record) => ({
      ...record,
      marksObtained: Number(record.marksObtained),
      totalMarks: Number(record.totalMarks),
    })),
    scheduledTests: Array.isArray(subProps.scheduledTests) ? subProps.scheduledTests : [],
    progressPolicy: normalizeSubjectProgressPolicy(subProps),
    chapters: chapters
      .sort((left, right) => {
        const leftPosition = chaptersRels.find((relation) => relation.toBlockId === left.id)?.position ?? 0
        const rightPosition = chaptersRels.find((relation) => relation.toBlockId === right.id)?.position ?? 0
        return leftPosition - rightPosition
      })
      .map(chap => {
        const chapProps = chap.properties as any || {}
        const chapTopics = topics.filter(t => topicsRels.find(r => r.toBlockId === t.id && r.fromBlockId === chap.id))
        return {
          id: chap.id,
          name: chap.title,
          important: chapProps.important ?? false,
          overallProgress: chapProps.overallProgress ?? 0,
          learningProgress: chapProps.learningProgress ?? 0,
          revisionProgress: chapProps.revisionProgress ?? 0,
          practiceProgress: chapProps.practiceProgress ?? 0,
          testProgress: chapProps.testProgress ?? 0,
          position: chaptersRels.find((relation) => relation.toBlockId === chap.id)?.position ?? 0,
          subjectId: subject.id,
          createdAt: chap.createdAt,
          updatedAt: chap.updatedAt,
          topicCount: chapTopics.length,
          scheduledTests: Array.isArray(chapProps.scheduledTests) ? chapProps.scheduledTests : [],
          testRecords: testRecords
            .filter((record) => record.chapterId === chap.id)
            .map((record) => ({
              ...record,
              marksObtained: Number(record.marksObtained),
              totalMarks: Number(record.totalMarks),
            })),
          subject: null as any,
          topics: chapTopics
            .sort((left, right) => {
              const leftPosition = topicsRels.find((relation) => relation.toBlockId === left.id)?.position ?? 0
              const rightPosition = topicsRels.find((relation) => relation.toBlockId === right.id)?.position ?? 0
              return leftPosition - rightPosition
            })
            .map(top => {
              const topProps = top.properties as any || {}
              return {
                id: top.id,
                name: top.title,
                important: topProps.important ?? false,
                learningStatus: topProps.learningStatus ?? false,
                revisionCount: topProps.revisionCount ?? 0,
                practiceCount: topProps.practiceCount ?? 0,
                testCount: topProps.testCount ?? 0,
                position: topicsRels.find((relation) => relation.toBlockId === top.id)?.position ?? 0,
                learningCompletedAt: topProps.learningCompletedAt ? new Date(topProps.learningCompletedAt) : null,
                lastRevised: topProps.lastRevised ? new Date(topProps.lastRevised) : null,
                lastPracticed: topProps.lastPracticed ? new Date(topProps.lastPracticed) : null,
                nextRevision: topProps.nextRevision ? new Date(topProps.nextRevision) : null,
                chapterId: chap.id,
                createdAt: top.createdAt,
                updatedAt: top.updatedAt,
              }
            })
        }
      })
  })
}

export async function getExamSubjectDashboardData(
  workspaceId: string,
  installationId: string,
  examId: string,
  subjectId: string,
  userId: string
): Promise<SubjectWithRelations | null> {
  const uuid = z.string().uuid()
  if (
    !uuid.safeParse(workspaceId).success ||
    !uuid.safeParse(installationId).success ||
    !uuid.safeParse(examId).success ||
    !uuid.safeParse(subjectId).success ||
    !uuid.safeParse(userId).success
  ) {
    return null
  }

  // Step 1: Get all relation type IDs (module-level cache — no DB call after first request)
  const relTypeIds = await getExamPrepRelationTypeIds()
  if (!relTypeIds) return null

  // Step 2: Fetch ALL independent data in parallel.
  // We know examId, subjectId upfront so we prefetch chaptersRels and testRecords
  // alongside the eligibility check, without waiting for it to complete first.
  const [exam, subject, relation, chaptersRels, testRecords] = await Promise.all([
    prisma.block.findFirst({
      where: { id: examId },
      select: { id: true, workspaceId: true, status: true, archivedAt: true, originToolInstallationId: true },
    }),
    prisma.block.findFirst({
      where: { id: subjectId },
      select: {
        id: true, title: true, properties: true, position: true,
        workspaceId: true, status: true, archivedAt: true,
        originToolInstallationId: true, createdAt: true, updatedAt: true,
      },
    }),
    prisma.blockRelation.findFirst({
      where: {
        workspaceId,
        fromBlockId: examId,
        toBlockId: subjectId,
        relationTypeId: relTypeIds.examHasSubject,
      },
      select: { id: true, workspaceId: true, fromBlockId: true, toBlockId: true },
    }),
    prisma.blockRelation.findMany({
      where: { workspaceId, fromBlockId: subjectId, relationTypeId: relTypeIds.subjectHasChapter },
      select: { toBlockId: true, position: true },
      orderBy: { position: "asc" },
    }),
    prisma.testRecord.findMany({
      where: { subjectId, workspaceId, userId },
      orderBy: { createdAt: "desc" },
    }),
  ])

  // Eligibility check (in-memory — no extra DB calls)
  const eligible = checkSubjectEligibility({ workspaceId, installationId, exam, subject, relation })
  if (!eligible || !subject) return null

  const chapterIds = chaptersRels.map((r) => r.toBlockId)

  // Step 3: Fetch chapters and topicsRels in parallel (now that we have chapterIds)
  const [chapters, topicsRels] = await Promise.all([
    chapterIds.length > 0
      ? prisma.block.findMany({
          where: {
            id: { in: chapterIds },
            workspaceId,
            status: "ACTIVE",
            archivedAt: null,
            blockType: { key: "exam-prep.chapter" },
            originToolInstallationId: installationId,
          },
          select: { id: true, title: true, properties: true, createdAt: true, updatedAt: true },
        })
      : Promise.resolve([]),
    chapterIds.length > 0
      ? prisma.blockRelation.findMany({
          where: { workspaceId, fromBlockId: { in: chapterIds }, relationTypeId: relTypeIds.chapterHasTopic },
          select: { fromBlockId: true, toBlockId: true, position: true },
          orderBy: [{ fromBlockId: "asc" }, { position: "asc" }],
        })
      : Promise.resolve([]),
  ])

  // Step 4: Fetch topics (needs topicIds from topicsRels)
  const topicIds = topicsRels.map((r) => r.toBlockId)
  const topics =
    topicIds.length > 0
      ? await prisma.block.findMany({
          where: {
            id: { in: topicIds },
            workspaceId,
            status: "ACTIVE",
            archivedAt: null,
            blockType: { key: "exam-prep.topic" },
            originToolInstallationId: installationId,
          },
          select: { id: true, title: true, properties: true, createdAt: true, updatedAt: true },
        })
      : []

  // Build and return the SubjectWithRelations
  const subProps = subject.properties as any || {}
  const subjectTestRecords = testRecords.map((r) => ({
    ...r,
    marksObtained: Number(r.marksObtained),
    totalMarks: Number(r.totalMarks),
  }))

  return withCalculatedSubjectProgress({
    id: subject.id,
    name: subject.title,
    weightage: subProps.weightage ?? 0,
    expectedMarks: subProps.expectedMarks ?? null,
    foundationLevel: subProps.foundationLevel ?? "Beginner",
    overallProgress: 0,
    learningProgress: 0,
    revisionProgress: 0,
    practiceProgress: 0,
    testProgress: 0,
    position: subject.position,
    userId: "",
    createdAt: subject.createdAt,
    updatedAt: subject.updatedAt,
    tests: [],
    mockTests: [],
    testRecords: subjectTestRecords,
    scheduledTests: Array.isArray(subProps.scheduledTests) ? subProps.scheduledTests : [],
    progressPolicy: normalizeSubjectProgressPolicy(subProps),
    chapters: chapters
      .sort((a, b) => {
        const aPos = chaptersRels.find((r) => r.toBlockId === a.id)?.position ?? 0
        const bPos = chaptersRels.find((r) => r.toBlockId === b.id)?.position ?? 0
        return aPos - bPos
      })
      .map((chap) => {
        const chapProps = chap.properties as any || {}
        const chapTopicRels = topicsRels
          .filter((r) => r.fromBlockId === chap.id)
          .sort((a, b) => a.position - b.position)
        const chapTopics = chapTopicRels
          .map((topicRel) => topics.find((t) => t.id === topicRel.toBlockId))
          .filter(Boolean) as typeof topics

        return {
          id: chap.id,
          name: chap.title,
          important: chapProps.important ?? false,
          overallProgress: 0,
          learningProgress: 0,
          revisionProgress: 0,
          practiceProgress: 0,
          testProgress: 0,
          position: chaptersRels.find((r) => r.toBlockId === chap.id)?.position ?? 0,
          subjectId: subject.id,
          createdAt: chap.createdAt,
          updatedAt: chap.updatedAt,
          scheduledTests: Array.isArray(chapProps.scheduledTests) ? chapProps.scheduledTests : [],
          testRecords: subjectTestRecords.filter((r) => r.chapterId === chap.id),
          subject: null as any,
          topics: chapTopics.map((top) => {
            const topicRel = chapTopicRels.find((r) => r.toBlockId === top.id)
            const topProps = top.properties as any || {}
            return {
              id: top.id,
              name: top.title,
              important: topProps.important ?? false,
              learningStatus: topProps.learningStatus ?? false,
              revisionCount: topProps.revisionCount ?? 0,
              practiceCount: topProps.practiceCount ?? 0,
              testCount: topProps.testCount ?? 0,
              position: topicRel?.position ?? 0,
              learningCompletedAt: topProps.learningCompletedAt ? new Date(topProps.learningCompletedAt) : null,
              lastRevised: topProps.lastRevised ? new Date(topProps.lastRevised) : null,
              lastPracticed: topProps.lastPracticed ? new Date(topProps.lastPracticed) : null,
              nextRevision: topProps.nextRevision ? new Date(topProps.nextRevision) : null,
              chapterId: chap.id,
              createdAt: top.createdAt,
              updatedAt: top.updatedAt,
            }
          }),
        }
      }),
  })
}

/**
 * Lightweight subject title lookup — used by generateMetadata on the subject page.
 * React cache()-wrapped so it deduplicates within a single render pass.
 * Cost: 1 Prisma query.
 */
export const getSubjectTitle = cache(async (
  workspaceId: string,
  installationId: string,
  subjectId: string,
): Promise<string | null> => {
  const uuid = z.string().uuid()
  if (
    !uuid.safeParse(workspaceId).success ||
    !uuid.safeParse(installationId).success ||
    !uuid.safeParse(subjectId).success
  ) return null

  const block = await prisma.block.findFirst({
    where: {
      id: subjectId,
      workspaceId,
      status: "ACTIVE",
      archivedAt: null,
      blockType: { key: "exam-prep.subject" },
      originToolInstallationId: installationId,
    },
    select: { title: true },
  })
  return block?.title ?? null
})

/**
 * Lightweight subject query for the settings page. Returns a SubjectWithRelations-
 * shaped object with chapters: [] — chapter/topic block data and test records are
 * NOT fetched, since the settings form only needs id, name, weightage, progressPolicy.
 *
 * Cost: 3 Prisma queries (subject block → chaptersRels → topicRel count).
 * Compare to getExamSubjectDashboardData: 4 steps / ~9 total queries.
 */
export async function getSubjectForSettings(
  workspaceId: string,
  installationId: string,
  subjectId: string,
): Promise<SubjectWithRelations | null> {
  const uuid = z.string().uuid()
  if (
    !uuid.safeParse(workspaceId).success ||
    !uuid.safeParse(installationId).success ||
    !uuid.safeParse(subjectId).success
  ) return null

  const relTypeIds = await getExamPrepRelationTypeIds()
  if (!relTypeIds) return null

  // Step 1: Fetch the subject block (only data the settings form needs)
  const subject = await prisma.block.findFirst({
    where: {
      id: subjectId,
      workspaceId,
      status: "ACTIVE",
      archivedAt: null,
      blockType: { key: "exam-prep.subject" },
      originToolInstallationId: installationId,
    },
    select: { id: true, title: true, properties: true, position: true, createdAt: true, updatedAt: true },
  })
  if (!subject) return null

  // Step 2: Get chapter IDs (for counts shown in SubjectHeader)
  const chaptersRels = await prisma.blockRelation.findMany({
    where: { workspaceId, fromBlockId: subjectId, relationTypeId: relTypeIds.subjectHasChapter },
    select: { toBlockId: true },
  })
  const chapterIds = chaptersRels.map((r) => r.toBlockId)

  // Step 3: Count topic relations (cheap count, no block data fetched)
  const topicCount =
    chapterIds.length > 0
      ? await prisma.blockRelation.count({
          where: {
            workspaceId,
            fromBlockId: { in: chapterIds },
            relationTypeId: relTypeIds.chapterHasTopic,
          },
        })
      : 0

  const subProps = subject.properties as any || {}

  return {
    id: subject.id,
    name: subject.title,
    weightage: subProps.weightage ?? 0,
    expectedMarks: subProps.expectedMarks ?? null,
    foundationLevel: subProps.foundationLevel ?? "Beginner",
    overallProgress: 0,
    learningProgress: 0,
    revisionProgress: 0,
    practiceProgress: 0,
    testProgress: 0,
    position: subject.position,
    userId: "",
    createdAt: subject.createdAt,
    updatedAt: subject.updatedAt,
    chapterCount: chapterIds.length,
    topicCount,
    tests: [],
    mockTests: [],
    testRecords: [],
    scheduledTests: [],
    progressPolicy: normalizeSubjectProgressPolicy(subProps),
    chapters: [], // Not needed by SubjectSettingsForm or SubjectHeader (settingsPresentation="none")
  }
}
