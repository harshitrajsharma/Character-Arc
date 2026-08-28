import { prisma } from "../lib/prisma"
import { getFirstPartyToolManifest } from "../lib/tools/registry"
import type { Prisma } from "../generated/prisma/client"
import { ToolGrantEffect } from "../generated/prisma/client"
import {
  getGateCsDemoIdempotencyKey,
} from "./seed-gate-cs-demo.helpers"

type StoredReleaseManifest = {
  defaultGrants?: ReadonlyArray<{
    permissionKey?: string
    effect?: string
    constraints?: Prisma.InputJsonValue
  }>
}

type PrincipalToolExecutor =
  typeof import("../lib/tools/execute-tool-action").executeToolActionForPrincipal

async function loadPrincipalToolExecutor(): Promise<PrincipalToolExecutor> {
  // @ts-expect-error Bun supplies this module for the Bun-only seed command.
  const { mock } = await import("bun:test")

  mock.module("server-only", () => ({}))

  const { executeToolActionForPrincipal } =
    await import("../lib/tools/execute-tool-action")

  return executeToolActionForPrincipal
}

async function main() {
  const userEmail = "sharmaharshitraj02@gmail.com"
  const users = await prisma.$queryRawUnsafe<Array<{ id: string; email: string }>>(
    "SELECT id, email FROM auth.users WHERE email = $1",
    userEmail
  )

  if (!users.length) {
    throw new Error(`User with email ${userEmail} not found in database.`)
  }

  const actorId = users[0].id
  console.log(`Target User ID: ${actorId} (${userEmail})`)

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: actorId, role: "OWNER" },
    include: { workspace: true },
  })

  if (!member) {
    throw new Error(`No OWNER workspace found for user ${actorId}`)
  }

  const workspace = member.workspace
  console.log(`Target Workspace ID: ${workspace.id}`)
  console.log(`Target Workspace Slug: ${workspace.slug}`)

  // 1. Ensure core.exam-prep tool definition & release exist
  const manifest = getFirstPartyToolManifest("core.exam-prep")
  if (!manifest) {
    throw new Error("Manifest for core.exam-prep not found.")
  }

  const definition = await prisma.toolDefinition.findUnique({
    where: { key: "core.exam-prep" },
  })
  if (!definition) {
    throw new Error("Tool definition core.exam-prep not found in database.")
  }

  const release = await prisma.toolRelease.findFirst({
    where: {
      toolDefinitionId: definition.id,
      version: manifest.release.version,
      status: "PUBLISHED",
    },
  })
  if (!release) {
    throw new Error(`Tool release core.exam-prep@${manifest.release.version} not published in database.`)
  }

  // 2. Install core.exam-prep tool for this workspace
  const installation = await prisma.toolInstallation.upsert({
    where: {
      workspaceId_toolDefinitionId: {
        workspaceId: workspace.id,
        toolDefinitionId: definition.id,
      },
    },
    create: {
      workspaceId: workspace.id,
      installedById: actorId,
      toolDefinitionId: definition.id,
      toolReleaseId: release.id,
      status: "ACTIVE",
    },
    update: {
      installedById: actorId,
      toolReleaseId: release.id,
      status: "ACTIVE",
      disabledAt: null,
    },
  })
  console.log(`Tool installation active. Installation ID: ${installation.id}`)

  // Copy default grants
  const manifestData: StoredReleaseManifest =
    release.manifest && typeof release.manifest === "object"
      ? (release.manifest as StoredReleaseManifest)
      : {}
  const defaultGrants = Array.isArray(manifestData?.defaultGrants)
    ? manifestData.defaultGrants
    : []

  for (const grant of defaultGrants) {
    if (!grant.permissionKey) continue
    const effect = grant.effect === "allow" ? ToolGrantEffect.ALLOW : ToolGrantEffect.DENY
    const constraints = grant.constraints || {}

    await prisma.toolGrant.upsert({
      where: {
        installationId_permissionKey: {
          installationId: installation.id,
          permissionKey: grant.permissionKey,
        },
      },
      create: {
        workspaceId: workspace.id,
        installationId: installation.id,
        permissionKey: grant.permissionKey,
        effect: effect,
        constraints: constraints,
      },
      update: {
        effect: effect,
        constraints: constraints,
      },
    })
  }

  // 3. Seed GATE CS Demo Exam and Syllabus
  const examTitle = "GATE Computer Science 2027"
  const existingExam = await prisma.block.findFirst({
    where: {
      workspaceId: workspace.id,
      blockType: { key: "exam-prep.exam" },
      title: examTitle,
    },
  })

  const principal = {
    actorId,
    workspaceId: workspace.id,
    invocationSource: "web" as const,
  }
  const executeToolActionForPrincipal = await loadPrincipalToolExecutor()

  const executeAction = async (actionKey: string, input: unknown, idKey: string) => {
    return executeToolActionForPrincipal(
      {
        workspaceId: workspace.id,
        installationId: installation.id,
        toolKey: "core.exam-prep",
        actionKey,
        idempotencyKey: getGateCsDemoIdempotencyKey(actionKey, `${idKey}-usr-sharma`),
        input,
      },
      principal
    )
  }

  const examResult = existingExam
    ? null
    : await executeAction(
        "exam.create",
        {
          title: examTitle,
          summary: "Comprehensive GATE Computer Science 2027 preparation curriculum.",
          expectedStartDate: "2027-02-07",
          targetMarks: 85,
        },
        "main-exam"
      )

  const examId = existingExam?.id || examResult?.rootBlockId || examResult?.createdBlockIds[0]
  if (!examId) {
    throw new Error("Failed to create Exam. No rootBlockId returned.")
  }

  const subjectsData = [
    {
      title: "Engineering Mathematics",
      weightage: 15,
      chapters: [
        {
          title: "Discrete Mathematics Foundations",
          important: true,
          topics: [
            { title: "Propositional Logic", important: true, progress: { learned: true, rev: 3, prac: 3 } },
            { title: "Sets and Relations", important: false, progress: { learned: true, rev: 2, prac: 2 } },
            { title: "Graph Theory", important: true, progress: { learned: true, rev: 3, prac: 4 } },
          ],
        },
        {
          title: "Linear Algebra",
          important: false,
          topics: [
            { title: "Matrices and Determinants", important: false, progress: { learned: true, rev: 2, prac: 2 } },
            { title: "Eigenvalues and Eigenvectors", important: true, progress: { learned: true, rev: 4, prac: 4 } },
            { title: "Systems of Linear Equations", important: false, progress: { learned: true, rev: 1, prac: 1 } },
          ],
        },
      ],
    },
    {
      title: "Data Structures and Algorithms",
      weightage: 20,
      chapters: [
        {
          title: "Data Structures",
          important: true,
          topics: [
            { title: "Arrays and Linked Lists", important: false, progress: { learned: true, rev: 3, prac: 3 } },
            { title: "Stacks and Queues", important: false, progress: { learned: true, rev: 3, prac: 3 } },
            { title: "Trees and BSTs", important: true, progress: { learned: true, rev: 5, prac: 5 } },
            { title: "Hashing", important: true, progress: { learned: true, rev: 5, prac: 5 } },
          ],
        },
        {
          title: "Algorithms",
          important: true,
          topics: [
            { title: "Sorting and Searching", important: false, progress: { learned: true, rev: 3, prac: 3 } },
            { title: "Greedy Algorithms", important: true, progress: { learned: true, rev: 5, prac: 5 } },
            { title: "Dynamic Programming", important: true, progress: { learned: true, rev: 4, prac: 4 } },
          ],
        },
      ],
    },
    {
      title: "Operating Systems",
      weightage: 10,
      chapters: [
        {
          title: "Processes and Threads",
          important: true,
          topics: [
            { title: "Process Concept", important: false, progress: { learned: true, rev: 1, prac: 1 } },
            { title: "CPU Scheduling", important: true, progress: { learned: true, rev: 2, prac: 2 } },
            { title: "Synchronization", important: true, progress: { learned: false, rev: 0, prac: 0 } },
          ],
        },
      ],
    },
  ]

  await executeAction(
    "exam.update-settings",
    {
      examId,
      examCode: "GATE-2027-CS",
      conductingBody: "GATE Organising Institute",
      targetMarks: 85,
      targetRank: 100,
      scheduleStatus: "EXPECTED",
      expectedStartDate: "2027-02-07",
      expectedEndDate: "2027-02-14",
      patternVersion: 1,
      durationMinutes: 180,
      totalMarks: 100,
      officialUrl: null,
      scoringRules: {
        correctMarks: 1,
        incorrectMarks: -0.333333,
        unansweredMarks: 0,
      },
    },
    "main-exam-settings"
  )

  const stats = { subjects: 0, chapters: 0, topics: 0 }

  for (const subjectData of subjectsData) {
    const subjectResult = await executeAction(
      "subject.create",
      {
        examId,
        title: subjectData.title,
        weightage: subjectData.weightage,
      },
      `subj-${subjectData.title}`
    )
    const subjectId = subjectResult.rootBlockId || subjectResult.createdBlockIds[0]
    stats.subjects++

    await executeAction(
      "subject.update-settings",
      {
        subjectId,
        revisionTarget: 3,
        practiceTarget: 3,
        highYieldRevisionTarget: 5,
        highYieldPracticeTarget: 5,
        chapterTestTarget: 1,
        subjectTestTarget: 1,
      },
      `subj-settings-${subjectData.title}`
    )

    for (const chapterData of subjectData.chapters) {
      const chapterResult = await executeAction(
        "chapter.create",
        {
          subjectId,
          title: chapterData.title,
          important: chapterData.important,
        },
        `chap-${subjectData.title}-${chapterData.title}`
      )
      const chapterId = chapterResult.rootBlockId || chapterResult.createdBlockIds[0]
      stats.chapters++

      for (const topic of chapterData.topics) {
        const topicResult = await executeAction(
          "topic.create",
          {
            chapterId,
            title: topic.title,
            important: topic.important,
          },
          `topic-${chapterData.title}-${topic.title}`
        )
        const topicId = topicResult.rootBlockId || topicResult.createdBlockIds[0]
        stats.topics++

        if (topic.progress.learned) {
          await executeAction(
            "topic.set-learning",
            { topicId, learned: true },
            `topic-learn-${topic.title}`
          )
          if (topic.progress.rev > 0) {
            await executeAction(
              "topic.set-progress",
              { topicId, stage: "revision", count: topic.progress.rev },
              `topic-rev-${topic.title}`
            )
          }
          if (topic.progress.prac > 0) {
            await executeAction(
              "topic.set-progress",
              { topicId, stage: "practice", count: topic.progress.prac },
              `topic-prac-${topic.title}`
            )
          }
        }
      }
    }
  }

  console.log(`\nDemo Data Seeded Successfully for ${userEmail}!`)
  console.log(`Exam ID: ${examId}`)
  console.log(`Canonical URL: /workspace/${workspace.slug}/exam-prep/${examId}`)
  console.log(`Statistics: ${stats.subjects} subjects, ${stats.chapters} chapters, ${stats.topics} topics`)
}

main()
  .catch((error: unknown) => {
    console.error("Seeding failed:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
