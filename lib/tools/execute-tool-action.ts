import "server-only"

import { z } from "zod"

import { requireVerifiedClaims } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import {
  resolveToolActionStrict,
  validateActionInput,
} from "@/lib/tools/action-contract"
import { parseToolManifest, type ToolActionResult, type ToolExecutionPrincipal } from "@/lib/tools/contracts"
import { evaluateToolPermissions } from "@/lib/tools/permissions"
import { getFirstPartyToolManifest } from "@/lib/tools/registry"
import { executeCreateArc, createArcUpdateExecutor, createArcContentExecutor } from "./goals-paths-handlers"
import {
  createExamPrepSyllabusItemExecutor,
  executeExamPrepCreateExam,
  executeExamPrepCreateSubject,
  executeExamPrepCreateChapter,
  executeExamPrepCreateTopic,
  executeExamPrepReorderChapters,
  executeExamPrepReorderTopics,
  executeExamPrepTopicRecordPractice,
  executeExamPrepTopicRecordRevision,
  executeExamPrepTopicRecordTest,
  executeExamPrepTopicSetProgress,
  executeExamPrepTopicSetLearning,
  executeExamPrepSubjectUpdateSettings,
} from "./exam-prep-handlers"

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

type HandlerBinding = Readonly<{
  handlerVersion: string
  execute: (
    input: z.output<typeof executeInputSchema>,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ) => Promise<ToolActionResult>
}>

export class ToolActionExecutionError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_INPUT"
      | "NOT_AVAILABLE"
      | "FORBIDDEN"
      | "HANDLER_MISSING"
      | "RELEASE_MISMATCH"
      | "RUN_FAILED"
      | "FAILED"
  ) {
    super(message)
    this.name = "ToolActionExecutionError"
  }
}

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
    "core.exam-prep@1.3.1:exam.create",
    {
      handlerVersion: "exam-prep.exam.create.v1",
      execute: executeExamPrepCreateExam,
    },
  ],
  [
    "core.exam-prep@1.3.1:subject.create",
    {
      handlerVersion: "exam-prep.subject.create.v1",
      execute: executeExamPrepCreateSubject,
    },
  ],
  [
    "core.exam-prep@1.3.1:chapter.create",
    {
      handlerVersion: "exam-prep.chapter.create.v1",
      execute: executeExamPrepCreateChapter,
    },
  ],
  [
    "core.exam-prep@1.3.1:topic.create",
    {
      handlerVersion: "exam-prep.topic.create.v1",
      execute: executeExamPrepCreateTopic,
    },
  ],
  [
    "core.exam-prep@1.3.1:chapter.update",
    {
      handlerVersion: "exam-prep.chapter.update.v1",
      execute: createExamPrepSyllabusItemExecutor("chapter", "update"),
    },
  ],
  [
    "core.exam-prep@1.3.1:chapter.delete",
    {
      handlerVersion: "exam-prep.chapter.delete.v1",
      execute: createExamPrepSyllabusItemExecutor("chapter", "delete"),
    },
  ],
  [
    "core.exam-prep@1.3.1:topic.update",
    {
      handlerVersion: "exam-prep.topic.update.v1",
      execute: createExamPrepSyllabusItemExecutor("topic", "update"),
    },
  ],
  [
    "core.exam-prep@1.3.1:topic.delete",
    {
      handlerVersion: "exam-prep.topic.delete.v1",
      execute: createExamPrepSyllabusItemExecutor("topic", "delete"),
    },
  ],
  [
    "core.exam-prep@1.3.1:chapter.reorder",
    {
      handlerVersion: "exam-prep.chapter.reorder.v1",
      execute: executeExamPrepReorderChapters,
    },
  ],
  [
    "core.exam-prep@1.3.1:topic.reorder",
    {
      handlerVersion: "exam-prep.topic.reorder.v1",
      execute: executeExamPrepReorderTopics,
    },
  ],
  [
    "core.exam-prep@1.3.1:topic.set-learning",
    {
      handlerVersion: "exam-prep.topic.set-learning.v1",
      execute: executeExamPrepTopicSetLearning,
    },
  ],
  [
    "core.exam-prep@1.3.1:topic.set-progress",
    {
      handlerVersion: "exam-prep.topic.set-progress.v1",
      execute: executeExamPrepTopicSetProgress,
    },
  ],
  [
    "core.exam-prep@1.3.1:topic.record-revision",
    {
      handlerVersion: "exam-prep.topic.record-revision.v1",
      execute: executeExamPrepTopicRecordRevision,
    },
  ],
  [
    "core.exam-prep@1.3.1:topic.record-practice",
    {
      handlerVersion: "exam-prep.topic.record-practice.v1",
      execute: executeExamPrepTopicRecordPractice,
    },
  ],
  [
    "core.exam-prep@1.3.1:topic.record-test",
    {
      handlerVersion: "exam-prep.topic.record-test.v1",
      execute: executeExamPrepTopicRecordTest,
    },
  ],
  [
    "core.exam-prep@1.3.1:subject.update-settings",
    {
      handlerVersion: "exam-prep.subject.update-settings.v1",
      execute: executeExamPrepSubjectUpdateSettings,
    },
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
    throw new ToolActionExecutionError("Workspace access is required.", "FORBIDDEN")
  }

  const localManifest = getFirstPartyToolManifest(parsed.data.toolKey)
  if (!localManifest) {
    throw new ToolActionExecutionError(
      "This tool is not available in this application release.",
      "NOT_AVAILABLE"
    )
  }

  const action = resolveToolActionStrict(localManifest, parsed.data.actionKey)
  if (membership.role === "VIEWER" && action.requiredPermissions.some((permission) => permission.startsWith("blocks.write"))) {
    throw new ToolActionExecutionError("Workspace write access is required.", "FORBIDDEN")
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

  let installationData, grantsData;
  try {
    const [instData, grData] = await Promise.all([
      prisma.toolInstallation.findUnique({
        where: { id: parsed.data.installationId, workspaceId: parsed.data.workspaceId },
        select: { id: true, workspaceId: true, toolDefinitionId: true, toolReleaseId: true, status: true }
      }),
      prisma.toolGrant.findMany({
        where: { installationId: parsed.data.installationId },
        select: { permissionKey: true, effect: true, constraints: true }
      })
    ])
    installationData = instData ? {
      ...instData,
      workspace_id: instData.workspaceId,
      tool_definition_id: instData.toolDefinitionId,
      tool_release_id: instData.toolReleaseId,
      status: instData.status.toLowerCase(),
    } : null;
    grantsData = grData.map((grant) => ({
      ...grant,
      permission_key: grant.permissionKey,
      effect: grant.effect.toLowerCase(),
    }));
  } catch {
    installationData = null;
    grantsData = null;
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

  let definitionData, releaseData;
  try {
    const [defData, relData] = await Promise.all([
      prisma.toolDefinition.findUnique({
        where: { id: installation.data.tool_definition_id },
        select: { id: true, key: true }
      }),
      prisma.toolRelease.findUnique({
        where: { id: installation.data.tool_release_id },
        select: { id: true, version: true, manifest: true }
      })
    ])
    definitionData = defData;
    releaseData = relData;
  } catch {
    definitionData = null;
    releaseData = null;
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
