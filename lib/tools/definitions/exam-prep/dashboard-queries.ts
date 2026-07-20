/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { SubjectWithRelations } from "@/types/progressapp/domain"
import { withCalculatedSubjectProgress } from "@/lib/tools/exam-prep/progress/subject-rollup"
import { normalizeSubjectProgressPolicy } from "@/lib/tools/exam-prep/progress/policy"

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
  installationId: string
): Promise<SubjectWithRelations[]> {
  const uuid = z.string().uuid()
  if (
    !uuid.safeParse(workspaceId).success ||
    !uuid.safeParse(examId).success ||
    !uuid.safeParse(installationId).success
  ) {
    return []
  }

  const [subjectRelType, chapterRelType, topicRelType] = await Promise.all([
    prisma.blockRelationType.findUnique({ where: { key: "exam-prep.exam-has-subject" } }),
    prisma.blockRelationType.findUnique({ where: { key: "exam-prep.subject-has-chapter" } }),
    prisma.blockRelationType.findUnique({ where: { key: "exam-prep.chapter-has-topic" } }),
  ])

  if (!subjectRelType || !chapterRelType || !topicRelType) return []

  const examData = await prisma.block.findFirst({
    where: { id: examId },
    select: { workspaceId: true, status: true, archivedAt: true, originToolInstallationId: true }
  })
  if (!checkExamEligibility(workspaceId, installationId, examData)) {
    return []
  }

  const subjectsRels = await prisma.blockRelation.findMany({
    where: { workspaceId, fromBlockId: examId, relationTypeId: subjectRelType.id },
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
    where: { workspaceId, fromBlockId: { in: subjectIds }, relationTypeId: chapterRelType.id },
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
    where: { workspaceId, fromBlockId: { in: chapterIds }, relationTypeId: topicRelType.id },
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
              lastRevised: topProps.lastRevised ? new Date(topProps.lastRevised) : null,
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
  installationId?: string
): Promise<SubjectWithRelations | null> {
  const uuid = z.string().uuid()
  if (!uuid.safeParse(subjectId).success || !uuid.safeParse(workspaceId).success) {
    return null
  }
  if (installationId && !uuid.safeParse(installationId).success) {
    return null
  }

  const [chapterRelType, topicRelType] = await Promise.all([
    prisma.blockRelationType.findUnique({ where: { key: "exam-prep.subject-has-chapter" } }),
    prisma.blockRelationType.findUnique({ where: { key: "exam-prep.chapter-has-topic" } }),
  ])

  if (!chapterRelType || !topicRelType) return null

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
    where: { workspaceId, fromBlockId: subjectId, relationTypeId: chapterRelType.id },
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
    where: { workspaceId, fromBlockId: { in: chapterIds }, relationTypeId: topicRelType.id },
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
    where: { subjectId, workspaceId },
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
                lastRevised: topProps.lastRevised ? new Date(topProps.lastRevised) : null,
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
  subjectId: string
): Promise<SubjectWithRelations | null> {
  const uuid = z.string().uuid()
  if (
    !uuid.safeParse(workspaceId).success ||
    !uuid.safeParse(installationId).success ||
    !uuid.safeParse(examId).success ||
    !uuid.safeParse(subjectId).success
  ) {
    return null
  }

  const relationType = await prisma.blockRelationType.findUnique({
    where: { key: "exam-prep.exam-has-subject" },
    select: { id: true },
  })
  if (!relationType) return null

  const [exam, subject, relation] = await Promise.all([
    prisma.block.findFirst({
      where: { id: examId },
      select: { id: true, workspaceId: true, status: true, archivedAt: true, originToolInstallationId: true }
    }),
    prisma.block.findFirst({
      where: { id: subjectId },
      select: { id: true, workspaceId: true, status: true, archivedAt: true, originToolInstallationId: true }
    }),
    prisma.blockRelation.findFirst({
      where: {
        workspaceId,
        fromBlockId: examId,
        toBlockId: subjectId,
        relationTypeId: relationType.id,
      },
      select: { id: true, workspaceId: true, fromBlockId: true, toBlockId: true }
    })
  ])

  const eligible = checkSubjectEligibility({
    workspaceId,
    installationId,
    exam,
    subject,
    relation,
  })

  if (!eligible) return null

  return getSubjectDashboardData(subjectId, workspaceId, installationId)
}
