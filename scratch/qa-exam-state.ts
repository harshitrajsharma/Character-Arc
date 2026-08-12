import { prisma } from "../lib/prisma"

const workspaceId = "89e6a327-2b79-4c65-809b-42fdd8e610f7"

async function main() {
  const exam = await prisma.block.findFirst({
    where: {
      workspaceId,
      blockType: { key: "exam-prep.exam" },
      status: "ACTIVE",
      archivedAt: null,
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      updatedAt: true,
    },
  })
  console.log("LATEST EXAM:", JSON.stringify(exam))

  if (!exam) return

  const subjects = await prisma.blockRelation.findMany({
    where: {
      workspaceId,
      fromBlockId: exam.id,
      relationType: { key: "exam-prep.exam-has-subject" },
      toBlock: { status: "ACTIVE", archivedAt: null },
    },
    select: {
      toBlockId: true,
      position: true,
      toBlock: { select: { id: true, title: true, createdAt: true } },
    },
    orderBy: { position: "asc" },
  })
  for (const subject of subjects) {
    const chapterCount = await prisma.blockRelation.count({
      where: {
        workspaceId,
        fromBlockId: subject.toBlockId,
        relationType: { key: "exam-prep.subject-has-chapter" },
        toBlock: { status: "ACTIVE", archivedAt: null },
      },
    })
    console.log(
      `SUBJECT ${subject.position}: ${subject.toBlock.title} (${subject.toBlockId}, created ${subject.toBlock.createdAt.toISOString()}) chapters=${chapterCount}`
    )
  }

  const chapterCount = await prisma.blockRelation.count({
    where: {
      workspaceId,
      relationType: { key: "exam-prep.subject-has-chapter" },
      toBlock: { status: "ACTIVE", archivedAt: null },
    },
  })
  const topicCount = await prisma.blockRelation.count({
    where: {
      workspaceId,
      relationType: { key: "exam-prep.chapter-has-topic" },
      toBlock: { status: "ACTIVE", archivedAt: null },
    },
  })
  console.log(`ACTIVE CHAPTERS: ${chapterCount}, ACTIVE TOPICS: ${topicCount}`)

  const scheduledTests = await prisma.scheduledTest.findMany({
    where: { workspaceId },
    include: {
      chapters: { select: { chapterId: true, position: true } },
      testRecord: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  })
  console.log(
    `SCHEDULED TESTS (${scheduledTests.length}):`,
    scheduledTests.map((t) => ({
      id: t.id,
      title: t.title,
      scope: t.scope,
      status: t.status,
      scheduledFor: t.scheduledFor?.toISOString().slice(0, 10) ?? null,
      revision: t.revision,
      targetChapterIds: t.chapters.map((c) => c.chapterId),
      hasTestRecord: Boolean(t.testRecord),
    }))
  )

  const testRecords = await prisma.testRecord.findMany({
    where: { workspaceId },
    include: { targetChapters: { select: { chapterId: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  })
  console.log(
    `TEST RECORDS (${testRecords.length}):`,
    testRecords.map((r) => ({
      id: r.id,
      title: r.title,
      scope: r.scope,
      subjectId: r.subjectId,
      chapterId: r.chapterId,
      scheduledTestId: r.scheduledTestId,
      marks: `${Number(r.marksObtained)}/${Number(r.totalMarks)}`,
      attemptedAt: r.attemptedAt?.toISOString() ?? null,
      targetChapterIds: r.targetChapters.map((c) => c.chapterId),
    }))
  )

  const runs = await prisma.toolRun.groupBy({
    by: ["actionKey", "status"],
    where: { workspaceId },
    _count: true,
  })
  console.log("TOOL RUNS:", JSON.stringify(runs))
}

main()
  .catch((error) => {
    console.error("QA script failed:", error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
