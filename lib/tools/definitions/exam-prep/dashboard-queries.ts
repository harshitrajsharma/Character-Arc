import { prisma } from "@/lib/prisma"
import { SubjectWithRelations } from "@/types/progressapp/domain"
import { withCalculatedSubjectProgress } from "@/lib/tools/exam-prep/progress/subject-rollup"
import { normalizeSubjectProgressPolicy } from "@/lib/tools/exam-prep/progress/policy"

export async function getExamDashboardData(examId: string, workspaceId: string): Promise<SubjectWithRelations[]> {
  const [subjectRelType, chapterRelType, topicRelType] = await Promise.all([
    prisma.blockRelationType.findUnique({ where: { key: "exam-prep.exam-has-subject" } }),
    prisma.blockRelationType.findUnique({ where: { key: "exam-prep.subject-has-chapter" } }),
    prisma.blockRelationType.findUnique({ where: { key: "exam-prep.chapter-has-topic" } }),
  ])

  if (!subjectRelType || !chapterRelType || !topicRelType) return []

  const subjectsRels = await prisma.blockRelation.findMany({
    where: { workspaceId, fromBlockId: examId, relationTypeId: subjectRelType.id },
    select: { toBlockId: true, position: true },
    orderBy: { position: "asc" },
  })
  const subjectIds = subjectsRels.map(r => r.toBlockId)
  if (subjectIds.length === 0) return []

  const subjects = await prisma.block.findMany({
    where: { id: { in: subjectIds }, workspaceId, status: "ACTIVE", archivedAt: null },
    select: { id: true, title: true, properties: true, createdAt: true, updatedAt: true }
  })

  const chaptersRels = await prisma.blockRelation.findMany({
    where: { workspaceId, fromBlockId: { in: subjectIds }, relationTypeId: chapterRelType.id },
    select: { fromBlockId: true, toBlockId: true, position: true },
    orderBy: [{ fromBlockId: "asc" }, { position: "asc" }],
  })
  const chapterIds = chaptersRels.map(r => r.toBlockId)
  const chapters = chapterIds.length > 0 ? await prisma.block.findMany({
    where: { id: { in: chapterIds }, workspaceId, status: "ACTIVE", archivedAt: null },
    select: { id: true, title: true, properties: true, createdAt: true, updatedAt: true }
  }) : []

  const topicsRels = await prisma.blockRelation.findMany({
    where: { workspaceId, fromBlockId: { in: chapterIds }, relationTypeId: topicRelType.id },
    select: { fromBlockId: true, toBlockId: true, position: true },
    orderBy: [{ fromBlockId: "asc" }, { position: "asc" }],
  })
  const topicIds = topicsRels.map(r => r.toBlockId)
  const topics = topicIds.length > 0 ? await prisma.block.findMany({
    where: { id: { in: topicIds }, workspaceId, status: "ACTIVE", archivedAt: null },
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
      userId: "", // Note: might need real userId
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
          subject: null as any, // Recursive not strictly needed for most dashboard logic
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

export async function getSubjectDashboardData(subjectId: string, workspaceId: string): Promise<SubjectWithRelations | null> {
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
    }
  })
  if (!subject) {
    console.log("getSubjectDashboardData: subject not found for id", subjectId, "workspaceId", workspaceId);
    return null
  }

  const chaptersRels = await prisma.blockRelation.findMany({
    where: { workspaceId, fromBlockId: subjectId, relationTypeId: chapterRelType.id },
    select: { toBlockId: true, position: true },
    orderBy: { position: "asc" },
  })
  const chapterIds = chaptersRels.map(r => r.toBlockId)
  const chapters = chapterIds.length > 0 ? await prisma.block.findMany({
    where: { id: { in: chapterIds }, workspaceId, status: "ACTIVE", archivedAt: null },
    select: { id: true, title: true, properties: true, createdAt: true, updatedAt: true }
  }) : []

  const topicsRels = chapterIds.length > 0 ? await prisma.blockRelation.findMany({
    where: { workspaceId, fromBlockId: { in: chapterIds }, relationTypeId: topicRelType.id },
    select: { fromBlockId: true, toBlockId: true, position: true },
    orderBy: [{ fromBlockId: "asc" }, { position: "asc" }],
  }) : []
  const topicIds = topicsRels.map(r => r.toBlockId)
  const topics = topicIds.length > 0 ? await prisma.block.findMany({
    where: { id: { in: topicIds }, workspaceId, status: "ACTIVE", archivedAt: null },
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
  examId: string,
  subjectId: string,
  workspaceId: string
): Promise<SubjectWithRelations | null> {
  const relationType = await prisma.blockRelationType.findUnique({
    where: { key: "exam-prep.exam-has-subject" },
    select: { id: true },
  })
  if (!relationType) {
    console.log("getExamSubjectDashboardData: no relationType found");
    return null
  }

  const relation = await prisma.blockRelation.findFirst({
    where: {
      workspaceId,
      fromBlockId: examId,
      toBlockId: subjectId,
      relationTypeId: relationType.id,
    },
    select: { id: true },
  })
  if (!relation) {
    console.log("getExamSubjectDashboardData: no relation found for examId", examId, "subjectId", subjectId, "workspaceId", workspaceId, "relationType.id", relationType.id);
    return null
  }

  const result = await getSubjectDashboardData(subjectId, workspaceId)
  if (!result) {
    console.log("getExamSubjectDashboardData: getSubjectDashboardData returned null");
  }
  return result;
}
