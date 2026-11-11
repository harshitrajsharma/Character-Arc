import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import type { ToolExecutionPrincipal } from "@/lib/tools/contracts"
import { ToolActionExecutionError } from "@/lib/tools/errors"

type ActionScope = {
  workspaceId: string
  installationId: string
  toolKey: string
  actionKey: string
  input: unknown
}
export type AgentActionAccessDatabase = Pick<
  PrismaClient,
  | "block"
  | "scheduledTest"
  | "testRecord"
  | "attempt"
  | "assessment"
  | "questionTarget"
>
type StudyKind = "exam" | "subject" | "chapter" | "topic"
type ReferenceKind = StudyKind | "study" | "assessment"
const studyKinds: StudyKind[] = ["exam", "subject", "chapter", "topic"]
const maxReferences = 600 // Existing reorder contracts permit 500 children.

function denied(): never {
  throw new ToolActionExecutionError(
    "The requested study content is not available to this agent.",
    "FORBIDDEN"
  )
}

function visibleBlock(
  workspaceId: string,
  toolKey: string,
  installationId?: string
): Prisma.BlockWhereInput {
  return {
    workspaceId,
    status: "ACTIVE",
    archivedAt: null,
    allowAgentAccess: true,
    ...(installationId ? { originToolInstallationId: installationId } : {}),
    originToolInstallation: {
      workspaceId,
      status: "ACTIVE",
      toolDefinition: { key: toolKey, enabled: true },
    },
  }
}

/** Existence predicates validate the complete typed path without loading a syllabus tree. */
export function agentStudyBlockWhere(
  workspaceId: string,
  kind: StudyKind,
  installationId?: string,
  requireAncestry = true
): Prisma.BlockWhereInput {
  const details: Prisma.BlockWhereInput =
    kind === "exam"
      ? { examDetails: { isNot: null } }
      : kind === "subject"
        ? { subjectDetails: { isNot: null } }
        : kind === "chapter"
          ? { chapterDetails: { isNot: null } }
          : { topicDetails: { isNot: null } }
  const parent: Partial<Record<StudyKind, [StudyKind, string]>> = {
    subject: ["exam", "exam-prep.exam-has-subject"],
    chapter: ["subject", "exam-prep.subject-has-chapter"],
    topic: ["chapter", "exam-prep.chapter-has-topic"],
  }
  const edge = parent[kind]
  return {
    ...visibleBlock(workspaceId, "core.exam-prep", installationId),
    blockType: { key: `exam-prep.${kind}` },
    ...details,
    ...(requireAncestry && edge
      ? {
          incomingRelations: {
            some: {
              workspaceId,
              relationType: { key: edge[1] },
              fromBlock: agentStudyBlockWhere(
                workspaceId,
                edge[0],
                installationId
              ),
            },
          },
        }
      : {}),
  }
}

function referenceWhere(
  scope: Omit<ActionScope, "input">,
  kind: ReferenceKind
) {
  const installationId =
    scope.toolKey === "core.exam-prep" ? scope.installationId : undefined
  if (kind === "assessment") {
    return {
      ...visibleBlock(
        scope.workspaceId,
        "core.mock-tests",
        scope.installationId
      ),
      blockType: { key: "mock-tests.assessment" },
      assessmentDetails: { isNot: null },
    } satisfies Prisma.BlockWhereInput
  }
  if (kind === "study") {
    return {
      OR: studyKinds.map((type) =>
        agentStudyBlockWhere(scope.workspaceId, type, installationId)
      ),
    } satisfies Prisma.BlockWhereInput
  }
  // Attaching a detached shared subject establishes its first exam path.
  return agentStudyBlockWhere(
    scope.workspaceId,
    kind,
    installationId,
    !(scope.actionKey === "exam.attach-subject" && kind === "subject")
  )
}

async function assertReferences(
  db: Pick<PrismaClient, "block">,
  scope: Omit<ActionScope, "input">,
  references: Map<string, ReferenceKind>
) {
  if (!references.size) return
  if (references.size > maxReferences) denied()
  const grouped = new Map<ReferenceKind, string[]>()
  for (const [id, kind] of references) {
    const ids = grouped.get(kind) ?? []
    ids.push(id)
    grouped.set(kind, ids)
  }
  const rows = await db.block.findMany({
    where: {
      OR: [...grouped].map(([kind, ids]) => ({
        id: { in: ids },
        ...referenceWhere(scope, kind),
      })),
    },
    take: references.size,
    select: { id: true },
  })
  const found = new Set(rows.map((row) => row.id))
  if ([...references.keys()].some((id) => !found.has(id))) denied()
}

/** Used before returning cached creation/update output after current authorization. */
export async function assertAgentResultBlockAccess(
  db: Pick<PrismaClient, "block">,
  scope: Omit<ActionScope, "input">,
  blockIds: readonly string[]
) {
  const kind = scope.toolKey === "core.exam-prep" ? "study" : "assessment"
  await assertReferences(db, scope, new Map(blockIds.map((id) => [id, kind])))
}

/** Authenticated grants are necessary but do not override a block's agent privacy flag. */
export async function assertAgentActionAccess(
  db: AgentActionAccessDatabase,
  scope: ActionScope,
  principal: ToolExecutionPrincipal
) {
  if (
    principal.invocationSource === "web" ||
    !["core.exam-prep", "core.mock-tests"].includes(scope.toolKey)
  )
    return
  if (
    !scope.input ||
    typeof scope.input !== "object" ||
    Array.isArray(scope.input)
  )
    denied()
  const actionInput = scope.input as Record<string, unknown>
  const references = new Map<string, ReferenceKind>()
  const add = (id: unknown, kind: ReferenceKind) => {
    if (typeof id !== "string") return
    const previous = references.get(id)
    if (
      previous &&
      previous !== kind &&
      previous !== "study" &&
      kind !== "study"
    )
      denied()
    references.set(id, previous && kind === "study" ? previous : kind)
  }
  const fields: Record<string, ReferenceKind> = {
    examId: "exam",
    subjectId: "subject",
    chapterId: "chapter",
    topicId: "topic",
    examBlockId: "study",
    contextBlockId: "study",
    assessmentId: "assessment",
  }
  for (const [key, kind] of Object.entries(fields)) add(actionInput[key], kind)
  for (const [key, kind] of Object.entries({
    subjectIds: "subject",
    chapterIds: "chapter",
    targetChapterIds: "chapter",
    topicIds: "topic",
  } as const)) {
    if (Array.isArray(actionInput[key]))
      for (const id of actionInput[key]) add(id, kind)
  }
  if (Array.isArray(actionInput.targets)) {
    for (const target of actionInput.targets) {
      if (target && typeof target === "object") add(target.blockId, "study")
    }
  }

  const { workspaceId, installationId } = scope
  const userId = principal.actorId
  const [scheduled, record, attempt] = await Promise.all([
    typeof actionInput.scheduledTestId === "string"
      ? db.scheduledTest.findFirst({
          where: {
            id: actionInput.scheduledTestId,
            workspaceId,
            installationId,
            userId,
          },
          select: {
            examId: true,
            subjectId: true,
            chapters: { take: 101, select: { chapterId: true } },
          },
        })
      : null,
    typeof actionInput.testRecordId === "string"
      ? db.testRecord.findFirst({
          where: { id: actionInput.testRecordId, workspaceId, userId },
          select: {
            examId: true,
            subjectId: true,
            chapterId: true,
            targetChapters: { take: 101, select: { chapterId: true } },
          },
        })
      : null,
    typeof actionInput.attemptId === "string"
      ? db.attempt.findFirst({
          where: { id: actionInput.attemptId, workspaceId, userId },
          select: { assessmentId: true },
        })
      : null,
  ])
  if (
    (actionInput.scheduledTestId && !scheduled) ||
    (actionInput.testRecordId && !record) ||
    (actionInput.attemptId && !attempt)
  )
    denied()
  if (scheduled) {
    if (scheduled.chapters.length > 100) denied()
    add(scheduled.examId, "exam")
    add(scheduled.subjectId, "subject")
    for (const chapter of scheduled.chapters) add(chapter.chapterId, "chapter")
  }
  if (record) {
    if (record.targetChapters.length > 100) denied()
    add(record.examId, "exam")
    add(record.subjectId, "subject")
    add(record.chapterId, "chapter")
    for (const chapter of record.targetChapters)
      add(chapter.chapterId, "chapter")
  }
  if (attempt) add(attempt.assessmentId, "assessment")
  await assertReferences(db, scope, references)

  // Cascading syllabus removal must not be a way around a descendant's flag.
  if (
    scope.actionKey === "exam.delete" ||
    scope.actionKey === "chapter.delete"
  ) {
    const parentEdge = (
      relation: string,
      fromBlock: Prisma.BlockWhereInput
    ): Prisma.BlockWhereInput => ({
      incomingRelations: {
        some: { workspaceId, relationType: { key: relation }, fromBlock },
      },
    })
    const subject = parentEdge("exam-prep.exam-has-subject", {
      id: String(actionInput.examId),
      workspaceId,
    })
    const chapter = parentEdge("exam-prep.subject-has-chapter", {
      workspaceId,
      ...subject,
    })
    const topic = parentEdge("exam-prep.chapter-has-topic", {
      workspaceId,
      ...chapter,
    })
    const descendant =
      scope.actionKey === "exam.delete"
        ? { OR: [subject, chapter, topic] }
        : parentEdge("exam-prep.chapter-has-topic", {
            id: String(actionInput.chapterId),
            workspaceId,
          })
    const hiddenDescendant = await db.block.findFirst({
      where: { workspaceId, allowAgentAccess: false, ...descendant },
      select: { id: true },
    })
    if (hiddenDescendant) denied()
  }

  if (
    scope.actionKey === "assessment.clone" &&
    typeof actionInput.sourceAssessmentId === "string"
  ) {
    const source = await db.assessment.findFirst({
      where: {
        blockId: actionInput.sourceAssessmentId,
        workspace: { archivedAt: null },
        block: {
          status: "ACTIVE",
          archivedAt: null,
          allowAgentAccess: true,
          originToolInstallation: {
            status: "ACTIVE",
            toolDefinition: { key: "core.mock-tests", enabled: true },
          },
        },
      },
      select: {
        workspaceId: true,
        status: true,
        blueprint: true,
        examBlockId: true,
      },
    })
    if (!source) denied()
    const blueprint = source.blueprint as Record<string, unknown> | null
    if (source.workspaceId !== workspaceId) {
      if (
        source.status !== "PUBLISHED" ||
        !["public", "unlisted"].includes(String(blueprint?.visibility)) ||
        blueprint?.allowCloning === false
      )
        denied()
    } else if (source.examBlockId) {
      await assertReferences(
        db,
        scope,
        new Map([[source.examBlockId, "study"]])
      )
    }
  }

  // Agent submission writes study evidence as well as grading the attempt.
  if (scope.actionKey === "attempt.submit" && attempt) {
    const hiddenTarget = await db.questionTarget.findFirst({
      where: {
        question: {
          assessments: {
            some: { assessmentId: attempt.assessmentId, workspaceId },
          },
        },
        NOT: { block: referenceWhere(scope, "study") },
      },
      select: { blockId: true },
    })
    if (hiddenTarget) denied()
  }
}
