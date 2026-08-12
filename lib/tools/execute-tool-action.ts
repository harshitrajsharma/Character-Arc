import "server-only"

import { z } from "zod"

import { requireVerifiedClaims } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import {
  resolveToolActionStrict,
  validateActionInput,
} from "@/lib/tools/action-contract"
import {
  parseToolManifest,
  type ToolActionResult,
  type ToolExecutionPrincipal,
} from "@/lib/tools/contracts"
import { ToolActionExecutionError } from "@/lib/tools/errors"
import { evaluateToolPermissions } from "@/lib/tools/permissions"
import { getFirstPartyToolManifest } from "@/lib/tools/registry"
import {
  executeCreateArc,
  createArcUpdateExecutor,
  createArcContentExecutor,
} from "./goals-paths-handlers"
import {
  createExamPrepSyllabusItemExecutor,
  executeExamPrepCreateExam,
  executeExamPrepUpdateExam,
  executeExamPrepExamUpdateSettings,
  executeExamPrepDeleteExam,
  executeExamPrepCreateSubject,
  createExamPrepExamSubjectExecutor,
  executeExamPrepCreateChapter,
  executeExamPrepCreateTopic,
  executeExamPrepReorderChapters,
  executeExamPrepReorderSubjects,
  executeExamPrepReorderTopics,
  executeExamPrepTopicRecordPractice,
  executeExamPrepTopicRecordRevision,
  executeExamPrepTopicRecordTest,
  executeExamPrepTopicSetProgress,
  executeExamPrepTopicSetLearning,
  executeExamPrepSubjectUpdateSettings,
  executeExamPrepTestRecordCreate,
  executeExamPrepTestRecordUpdate,
  executeExamPrepTestRecordDelete,
  executeExamPrepGetSubjectRecommendations,
} from "./exam-prep-handlers"
import {
  executeExamPrepScheduledTestCancel,
  executeExamPrepScheduledTestComplete,
  executeExamPrepScheduledTestCreate,
  executeExamPrepScheduledTestDelete,
  executeExamPrepScheduledTestReopen,
  executeExamPrepScheduledTestRestore,
  executeExamPrepScheduledTestUpdate,
} from "./exam-prep-scheduled-test-handlers"
import {
  executeMockTestsAssessmentAddQuestions,
  executeMockTestsAssessmentCreate,
  executeMockTestsAssessmentGetQuestions,
  executeMockTestsAssessmentGetWeakTopics,
  executeMockTestsAssessmentPublish,
  executeMockTestsAssessmentRemoveQuestion,
  executeMockTestsAssessmentReorderQuestions,
  executeMockTestsAssessmentUpdate,
  executeMockTestsAttemptAbandon,
  executeMockTestsAttemptCreate,
  executeMockTestsAttemptGetAnalysis,
  executeMockTestsAttemptRecordAnswer,
  executeMockTestsAttemptSubmit,
  executeMockTestsQuestionCreate,
  executeMockTestsQuestionDelete,
  executeMockTestsQuestionUpdate,
} from "./mock-tests-handlers"

const executeInputSchema = z.object({
  workspaceId: z.uuid(),
  installationId: z.uuid(),
  toolKey: z.string().min(3).max(120),
  actionKey: z.string().min(3).max(120),
  idempotencyKey: z.string().min(1).max(128),
  input: z.unknown(),
})

const installationSchema = z.object({
  id: z.uuid(),
  workspace_id: z.uuid(),
  tool_definition_id: z.uuid(),
  tool_release_id: z.uuid(),
  status: z.enum(["active", "disabled", "removed"]),
})

const definitionSchema = z.object({ id: z.uuid(), key: z.string() })
const releaseSchema = z.object({
  id: z.uuid(),
  version: z.string(),
  manifest: z.unknown(),
})
const grantsSchema = z.array(
  z.object({
    permission_key: z.string(),
    effect: z.enum(["allow", "deny"]),
    constraints: z.unknown(),
  })
)

export type ExecuteToolActionInput = z.input<typeof executeInputSchema>

export { ToolActionExecutionError }

type HandlerBinding = Readonly<{
  handlerVersion: string
  execute: (
    input: z.output<typeof executeInputSchema>,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ) => Promise<ToolActionResult>
}>

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(",")}}`
  }

  return JSON.stringify(value)
}

const handlers = new Map<string, HandlerBinding>([
  [
    "core.goals-paths@1.0.0:arc.create",
    {
      handlerVersion: "goals-paths.arc.create.v3.1",
      execute: executeCreateArc,
    },
  ],
  [
    "core.goals-paths@1.0.0:arc.check-in",
    {
      handlerVersion: "goals-paths.arc.check-in.v1",
      execute: createArcUpdateExecutor("arc.check-in"),
    },
  ],
  [
    "core.goals-paths@1.0.0:arc.set-status",
    {
      handlerVersion: "goals-paths.arc.set-status.v1",
      execute: createArcUpdateExecutor("arc.set-status"),
    },
  ],
  [
    "core.goals-paths@1.0.0:arc.update",
    {
      handlerVersion: "goals-paths.arc.update.v1",
      execute: createArcContentExecutor("arc.update"),
    },
  ],
  [
    "core.goals-paths@1.0.0:arc.delete",
    {
      handlerVersion: "goals-paths.arc.delete.v1",
      execute: createArcContentExecutor("arc.delete"),
    },
  ],
  [
    "core.exam-prep@1.11.0:exam.create",
    {
      handlerVersion: "exam-prep.exam.create.v2",
      execute: executeExamPrepCreateExam,
    },
  ],
  [
    "core.exam-prep@1.11.0:exam.update",
    {
      handlerVersion: "exam-prep.exam.update.v2",
      execute: executeExamPrepUpdateExam,
    },
  ],
  [
    "core.exam-prep@1.11.0:exam.update-settings",
    {
      handlerVersion: "exam-prep.exam.update-settings.v5",
      execute: executeExamPrepExamUpdateSettings,
    },
  ],
  [
    "core.exam-prep@1.11.0:exam.delete",
    {
      handlerVersion: "exam-prep.exam.delete.v1",
      execute: executeExamPrepDeleteExam,
    },
  ],
  [
    "core.exam-prep@1.11.0:subject.create",
    {
      handlerVersion: "exam-prep.subject.create.v1",
      execute: executeExamPrepCreateSubject,
    },
  ],
  [
    "core.exam-prep@1.11.0:exam.attach-subject",
    {
      handlerVersion: "exam-prep.exam.attach-subject.v1",
      execute: createExamPrepExamSubjectExecutor("attach"),
    },
  ],
  [
    "core.exam-prep@1.11.0:exam.detach-subject",
    {
      handlerVersion: "exam-prep.exam.detach-subject.v1",
      execute: createExamPrepExamSubjectExecutor("detach"),
    },
  ],
  [
    "core.exam-prep@1.11.0:chapter.create",
    {
      handlerVersion: "exam-prep.chapter.create.v1",
      execute: executeExamPrepCreateChapter,
    },
  ],
  [
    "core.exam-prep@1.11.0:topic.create",
    {
      handlerVersion: "exam-prep.topic.create.v1",
      execute: executeExamPrepCreateTopic,
    },
  ],
  [
    "core.exam-prep@1.11.0:chapter.update",
    {
      handlerVersion: "exam-prep.chapter.update.v1",
      execute: createExamPrepSyllabusItemExecutor("chapter", "update"),
    },
  ],
  [
    "core.exam-prep@1.11.0:chapter.delete",
    {
      handlerVersion: "exam-prep.chapter.delete.v1",
      execute: createExamPrepSyllabusItemExecutor("chapter", "delete"),
    },
  ],
  [
    "core.exam-prep@1.11.0:topic.update",
    {
      handlerVersion: "exam-prep.topic.update.v1",
      execute: createExamPrepSyllabusItemExecutor("topic", "update"),
    },
  ],
  [
    "core.exam-prep@1.11.0:topic.delete",
    {
      handlerVersion: "exam-prep.topic.delete.v1",
      execute: createExamPrepSyllabusItemExecutor("topic", "delete"),
    },
  ],
  [
    "core.exam-prep@1.11.0:exam.reorder-subjects",
    {
      handlerVersion: "exam-prep.exam.reorder-subjects.v1",
      execute: executeExamPrepReorderSubjects,
    },
  ],
  [
    "core.exam-prep@1.11.0:chapter.reorder",
    {
      handlerVersion: "exam-prep.chapter.reorder.v1",
      execute: executeExamPrepReorderChapters,
    },
  ],
  [
    "core.exam-prep@1.11.0:topic.reorder",
    {
      handlerVersion: "exam-prep.topic.reorder.v1",
      execute: executeExamPrepReorderTopics,
    },
  ],
  [
    "core.exam-prep@1.11.0:topic.set-learning",
    {
      handlerVersion: "exam-prep.topic.set-learning.v1",
      execute: executeExamPrepTopicSetLearning,
    },
  ],
  [
    "core.exam-prep@1.11.0:topic.set-progress",
    {
      handlerVersion: "exam-prep.topic.set-progress.v1",
      execute: executeExamPrepTopicSetProgress,
    },
  ],
  [
    "core.exam-prep@1.11.0:topic.record-revision",
    {
      handlerVersion: "exam-prep.topic.record-revision.v1",
      execute: executeExamPrepTopicRecordRevision,
    },
  ],
  [
    "core.exam-prep@1.11.0:topic.record-practice",
    {
      handlerVersion: "exam-prep.topic.record-practice.v1",
      execute: executeExamPrepTopicRecordPractice,
    },
  ],
  [
    "core.exam-prep@1.11.0:topic.record-test",
    {
      handlerVersion: "exam-prep.topic.record-test.v1",
      execute: executeExamPrepTopicRecordTest,
    },
  ],
  [
    "core.exam-prep@1.11.0:subject.update-settings",
    {
      handlerVersion: "exam-prep.subject.update-settings.v1",
      execute: executeExamPrepSubjectUpdateSettings,
    },
  ],
  [
    "core.exam-prep@1.11.0:scheduled-test.create",
    {
      handlerVersion: "exam-prep.scheduled-test.create.v1",
      execute: executeExamPrepScheduledTestCreate,
    },
  ],
  [
    "core.exam-prep@1.11.0:scheduled-test.update",
    {
      handlerVersion: "exam-prep.scheduled-test.update.v1",
      execute: executeExamPrepScheduledTestUpdate,
    },
  ],
  [
    "core.exam-prep@1.11.0:scheduled-test.cancel",
    {
      handlerVersion: "exam-prep.scheduled-test.cancel.v1",
      execute: executeExamPrepScheduledTestCancel,
    },
  ],
  [
    "core.exam-prep@1.11.0:scheduled-test.restore",
    {
      handlerVersion: "exam-prep.scheduled-test.restore.v1",
      execute: executeExamPrepScheduledTestRestore,
    },
  ],
  [
    "core.exam-prep@1.11.0:scheduled-test.complete",
    {
      handlerVersion: "exam-prep.scheduled-test.complete.v1",
      execute: executeExamPrepScheduledTestComplete,
    },
  ],
  [
    "core.exam-prep@1.11.0:scheduled-test.reopen",
    {
      handlerVersion: "exam-prep.scheduled-test.reopen.v1",
      execute: executeExamPrepScheduledTestReopen,
    },
  ],
  [
    "core.exam-prep@1.11.0:scheduled-test.delete",
    {
      handlerVersion: "exam-prep.scheduled-test.delete.v1",
      execute: executeExamPrepScheduledTestDelete,
    },
  ],
  [
    "core.exam-prep@1.11.0:test-record.create",
    {
      handlerVersion: "exam-prep.test-record.create.v1",
      execute: executeExamPrepTestRecordCreate,
    },
  ],
  [
    "core.exam-prep@1.11.0:test-record.update",
    {
      handlerVersion: "exam-prep.test-record.update.v1",
      execute: executeExamPrepTestRecordUpdate,
    },
  ],
  [
    "core.exam-prep@1.11.0:test-record.delete",
    {
      handlerVersion: "exam-prep.test-record.delete.v1",
      execute: executeExamPrepTestRecordDelete,
    },
  ],
  [
    "core.exam-prep@1.11.0:exam.get-subject-recommendations",
    {
      handlerVersion: "exam-prep.exam.get-subject-recommendations.v1",
      execute: executeExamPrepGetSubjectRecommendations,
    },
  ],
  [
    "core.mock-tests@1.0.0:question.create",
    { handlerVersion: "mock-tests.question.create.v1", execute: executeMockTestsQuestionCreate.execute },
  ],
  [
    "core.mock-tests@1.0.0:question.update",
    { handlerVersion: "mock-tests.question.update.v1", execute: executeMockTestsQuestionUpdate.execute },
  ],
  [
    "core.mock-tests@1.0.0:question.delete",
    { handlerVersion: "mock-tests.question.delete.v1", execute: executeMockTestsQuestionDelete.execute },
  ],
  [
    "core.mock-tests@1.0.0:assessment.get-questions",
    { handlerVersion: "mock-tests.assessment.get-questions.v1", execute: executeMockTestsAssessmentGetQuestions.execute },
  ],
  [
    "core.mock-tests@1.0.0:assessment.create",
    { handlerVersion: "mock-tests.assessment.create.v1", execute: executeMockTestsAssessmentCreate.execute },
  ],
  [
    "core.mock-tests@1.0.0:assessment.update",
    { handlerVersion: "mock-tests.assessment.update.v1", execute: executeMockTestsAssessmentUpdate.execute },
  ],
  [
    "core.mock-tests@1.0.0:assessment.add-questions",
    { handlerVersion: "mock-tests.assessment.add-questions.v1", execute: executeMockTestsAssessmentAddQuestions.execute },
  ],
  [
    "core.mock-tests@1.0.0:assessment.remove-question",
    { handlerVersion: "mock-tests.assessment.remove-question.v1", execute: executeMockTestsAssessmentRemoveQuestion.execute },
  ],
  [
    "core.mock-tests@1.0.0:assessment.reorder-questions",
    { handlerVersion: "mock-tests.assessment.reorder-questions.v1", execute: executeMockTestsAssessmentReorderQuestions.execute },
  ],
  [
    "core.mock-tests@1.0.0:assessment.publish",
    { handlerVersion: "mock-tests.assessment.publish.v1", execute: executeMockTestsAssessmentPublish.execute },
  ],
  [
    "core.mock-tests@1.0.0:attempt.create",
    { handlerVersion: "mock-tests.attempt.create.v1", execute: executeMockTestsAttemptCreate.execute },
  ],
  [
    "core.mock-tests@1.0.0:attempt.record-answer",
    { handlerVersion: "mock-tests.attempt.record-answer.v1", execute: executeMockTestsAttemptRecordAnswer.execute },
  ],
  [
    "core.mock-tests@1.0.0:attempt.submit",
    { handlerVersion: "mock-tests.attempt.submit.v1", execute: executeMockTestsAttemptSubmit.execute },
  ],
  [
    "core.mock-tests@1.0.0:attempt.abandon",
    { handlerVersion: "mock-tests.attempt.abandon.v1", execute: executeMockTestsAttemptAbandon.execute },
  ],
  [
    "core.mock-tests@1.0.0:attempt.get-analysis",
    { handlerVersion: "mock-tests.attempt.get-analysis.v1", execute: executeMockTestsAttemptGetAnalysis.execute },
  ],
  [
    "core.mock-tests@1.0.0:assessment.get-weak-topics",
    { handlerVersion: "mock-tests.assessment.get-weak-topics.v1", execute: executeMockTestsAssessmentGetWeakTopics.execute },
  ],
])

export async function executeToolAction(input: ExecuteToolActionInput) {
  const parsed = executeInputSchema.safeParse(input)

  if (!parsed.success) {
    throw new ToolActionExecutionError(
      "The tool action request is invalid.",
      "INVALID_INPUT"
    )
  }

  const claims = await requireVerifiedClaims("/tools")

  const principal: ToolExecutionPrincipal = {
    actorId: claims.sub,
    workspaceId: parsed.data.workspaceId,
    invocationSource: "web",
  }

  return executeToolActionForPrincipal(parsed.data, principal)
}

export async function executeToolActionForPrincipal(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal
) {
  const parsed = executeInputSchema.safeParse(input)

  if (!parsed.success) {
    throw new ToolActionExecutionError(
      "The tool action request is invalid.",
      "INVALID_INPUT"
    )
  }

  if (parsed.data.workspaceId !== principal.workspaceId) {
    throw new ToolActionExecutionError(
      "The principal workspace does not match the action workspace.",
      "FORBIDDEN"
    )
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: principal.workspaceId,
        userId: principal.actorId,
      },
    },
    select: { role: true },
  })
  if (!membership) {
    throw new ToolActionExecutionError(
      "Workspace access is required.",
      "FORBIDDEN"
    )
  }

  const localManifest = getFirstPartyToolManifest(parsed.data.toolKey)
  if (!localManifest) {
    throw new ToolActionExecutionError(
      "This tool is not available in this application release.",
      "NOT_AVAILABLE"
    )
  }

  const action = resolveToolActionStrict(localManifest, parsed.data.actionKey)
  if (
    membership.role === "VIEWER" &&
    action.requiredPermissions.some((permission) =>
      permission.startsWith("blocks.write")
    )
  ) {
    throw new ToolActionExecutionError(
      "Workspace write access is required.",
      "FORBIDDEN"
    )
  }
  const inputValidation = validateActionInput(action, parsed.data.input)
  if (!inputValidation.success) {
    throw new ToolActionExecutionError(
      inputValidation.issues[0]?.message ?? "The action input is invalid.",
      "INVALID_INPUT"
    )
  }

  const handlerKey = `${parsed.data.toolKey}@${localManifest.release.version}:${parsed.data.actionKey}`
  const handler = handlers.get(handlerKey)
  if (!handler) {
    throw new ToolActionExecutionError(
      "This action has no trusted handler in the current application release.",
      "HANDLER_MISSING"
    )
  }

  let installationData, grantsData
  try {
    const [instData, grData] = await Promise.all([
      prisma.toolInstallation.findUnique({
        where: {
          id: parsed.data.installationId,
          workspaceId: parsed.data.workspaceId,
        },
        select: {
          id: true,
          workspaceId: true,
          toolDefinitionId: true,
          toolReleaseId: true,
          status: true,
        },
      }),
      prisma.toolGrant.findMany({
        where: { installationId: parsed.data.installationId },
        select: { permissionKey: true, effect: true, constraints: true },
      }),
    ])
    installationData = instData
      ? {
          ...instData,
          workspace_id: instData.workspaceId,
          tool_definition_id: instData.toolDefinitionId,
          tool_release_id: instData.toolReleaseId,
          status: instData.status.toLowerCase(),
        }
      : null
    grantsData = grData.map((grant) => ({
      ...grant,
      permission_key: grant.permissionKey,
      effect: grant.effect.toLowerCase(),
    }))
  } catch {
    installationData = null
    grantsData = null
  }

  const installation = installationSchema.safeParse(installationData)
  const grants = grantsSchema.safeParse(grantsData)
  if (
    !installationData ||
    !grantsData ||
    !installation.success ||
    !grants.success ||
    installation.data.status !== "active"
  ) {
    throw new ToolActionExecutionError(
      "The active tool installation is unavailable.",
      "NOT_AVAILABLE"
    )
  }

  let definitionData, releaseData
  try {
    const [defData, relData] = await Promise.all([
      prisma.toolDefinition.findUnique({
        where: { id: installation.data.tool_definition_id },
        select: { id: true, key: true },
      }),
      prisma.toolRelease.findUnique({
        where: { id: installation.data.tool_release_id },
        select: { id: true, version: true, manifest: true },
      }),
    ])
    definitionData = defData
    releaseData = relData
  } catch {
    definitionData = null
    releaseData = null
  }

  const definition = definitionSchema.safeParse(definitionData)
  const release = releaseSchema.safeParse(releaseData)
  if (
    !definitionData ||
    !releaseData ||
    !definition.success ||
    !release.success ||
    definition.data.key !== parsed.data.toolKey ||
    release.data.version !== localManifest.release.version
  ) {
    throw new ToolActionExecutionError(
      "The installed release does not match this application release.",
      "RELEASE_MISMATCH"
    )
  }

  let deployedManifest
  try {
    deployedManifest = parseToolManifest(release.data.manifest)
  } catch {
    throw new ToolActionExecutionError(
      "The installed release manifest is invalid.",
      "RELEASE_MISMATCH"
    )
  }

  if (canonicalJson(deployedManifest) !== canonicalJson(localManifest)) {
    throw new ToolActionExecutionError(
      "The installed release manifest has drifted from the trusted handler.",
      "RELEASE_MISMATCH"
    )
  }

  const permissionDecision = evaluateToolPermissions(
    grants.data.map((grant) => ({
      permissionKey: grant.permission_key,
      effect: grant.effect,
      constraints: grant.constraints,
    })),
    action.requiredPermissions,
    {
      installationId: parsed.data.installationId,
      originInstallationId: parsed.data.installationId,
      blockTypeKeys: [
        ...action.output.createsBlockTypeKeys,
        ...action.output.writesBlockTypeKeys,
      ],
    }
  )

  if (!permissionDecision.allowed) {
    throw new ToolActionExecutionError(
      "This installation has not been granted the permissions required by the action.",
      "FORBIDDEN"
    )
  }

  return handler.execute(parsed.data, principal, handler.handlerVersion)
}
