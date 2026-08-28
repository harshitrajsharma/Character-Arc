import crypto from "crypto"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import type { Prisma, UserBlockStatus } from "@/generated/prisma/client"
import { ToolActionExecutionError } from "./errors"
import type { ExecuteToolActionInput } from "./execute-tool-action"
import type { ToolActionResult, ToolExecutionPrincipal } from "./contracts"

const arcCreateInputSchema = z.object({
  title: z.string().min(1).max(120),
  objective: z.string().min(1).max(4000),
  why: z.string().max(4000).optional().nullable(),
  currentReality: z.string().min(1).max(8000),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  constraints: z
    .array(
      z
        .string()
        .min(1)
        .max(300)
        .regex(/^[^\r\n]*$/)
    )
    .max(20)
    .optional()
    .default([]),
})

const arcUpdateInputSchema = arcCreateInputSchema.extend({
  arcId: z.string().uuid(),
  expectedRevision: z.number().int().min(1),
})

type ArcUpdateInputData = z.infer<typeof arcUpdateInputSchema>

const arcRunOutputSchema = z.object({
  rootBlockId: z.string().optional(),
  createdBlockIds: z.array(z.string()).optional(),
  evidenceIds: z.array(z.string()).optional(),
})

type ArcRunOutput = z.infer<typeof arcRunOutputSchema>

function readArcRunOutput(
  payload: { output?: unknown } | null | undefined
): ArcRunOutput {
  const parsed = arcRunOutputSchema.safeParse(payload?.output ?? null)
  return parsed.success ? parsed.data : {}
}

async function markRunFailed(runId: string, errorMessage: string) {
  await prisma.toolRun.update({
    where: { id: runId },
    data: {
      status: "FAILED",
      errorMessage,
      completedAt: new Date(),
      payload: {
        update: {
          error: { message: errorMessage },
        },
      },
    },
  })
}

export async function executeCreateArc(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = principal.actorId

  const idempotencyKey = input.idempotencyKey
  if (
    !idempotencyKey ||
    idempotencyKey.length < 1 ||
    idempotencyKey.length > 128
  ) {
    throw new ToolActionExecutionError(
      "A valid idempotency key is required.",
      "INVALID_INPUT"
    )
  }

  const parsed = arcCreateInputSchema.safeParse(input.input)
  if (!parsed.success) {
    throw new ToolActionExecutionError(
      "Action input is outside the supported limits.",
      "INVALID_INPUT"
    )
  }

  const actionInput = parsed.data
  const titleText = actionInput.title.trim()
  const objective = actionInput.objective.trim()
  const currentReality = actionInput.currentReality.trim()
  const whyText = actionInput.why ? actionInput.why.trim() : null
  const targetDateText = actionInput.targetDate || null
  const constraintsValue = actionInput.constraints || []

  const objectiveLines = objective.split(/\r?\n/)
  let objectiveSummary =
    objectiveLines.find((line) => line.trim() !== "")?.trim() || ""
  objectiveSummary = objectiveSummary
    .replace(/^[#>*+_~` -]+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 280)
  if (!objectiveSummary) {
    objectiveSummary = objective.substring(0, 280)
  }

  let bodyMarkdown = `# Objective\n\n${objective}\n\n# Current Reality\n\n${currentReality}`
  if (whyText) {
    bodyMarkdown += `\n\n# Why This Matters\n\n${whyText}`
  }
  if (constraintsValue.length > 0) {
    const constraintsMarkdown = constraintsValue
      .map((c: string) => `- ${c}`)
      .join("\n")
    bodyMarkdown += `\n\n# Constraints\n\n${constraintsMarkdown}`
  }

  const installation = await prisma.toolInstallation.findUnique({
    where: { id: input.installationId, workspaceId: input.workspaceId },
    include: { toolRelease: true, toolDefinition: true },
  })

  if (
    !installation ||
    installation.status !== "ACTIVE" ||
    installation.workspaceId !== input.workspaceId ||
    installation.toolDefinition.key !== "core.goals-paths"
  ) {
    throw new ToolActionExecutionError(
      "The active Goals and Paths installation is unavailable.",
      "NOT_AVAILABLE"
    )
  }

  const manifestStr = JSON.stringify(installation.toolRelease.manifest)
  const manifestHash = crypto
    .createHash("md5")
    .update(manifestStr)
    .digest("hex")
  const inputHash = crypto
    .createHash("md5")
    .update(JSON.stringify(input.input))
    .digest("hex")

  let run = await prisma.toolRun.findUnique({
    where: {
      installationId_idempotencyKey: {
        installationId: input.installationId,
        idempotencyKey: idempotencyKey,
      },
    },
    include: { payload: true },
  })

  if (!run) {
    try {
      run = await prisma.toolRun.create({
        data: {
          workspaceId: input.workspaceId,
          installationId: input.installationId,
          toolReleaseId: installation.toolReleaseId,
          actorId: actorId,
          actionKey: "arc.create",
          handlerVersion,
          invocationSource: principal.invocationSource,
          status: "RUNNING",
          idempotencyKey,
          inputHash,
          manifestHash,
          startedAt: new Date(),
          payload: { create: { input: input.input as Prisma.InputJsonValue } },
        },
        include: { payload: true },
      })
    } catch (e) {
      run = await prisma.toolRun.findUnique({
        where: {
          installationId_idempotencyKey: {
            installationId: input.installationId,
            idempotencyKey: idempotencyKey,
          },
        },
        include: { payload: true },
      })
      if (!run) throw e
    }
  }

  if (run.actionKey !== "arc.create" || run.inputHash !== inputHash) {
    throw new ToolActionExecutionError(
      "The idempotency key was already used for another request.",
      "INVALID_INPUT"
    )
  }

  if (run.status === "SUCCEEDED" || run.status === "FAILED") {
    if (run.status === "FAILED") {
      throw new ToolActionExecutionError(
        run.errorMessage || "The action could not be completed.",
        "RUN_FAILED"
      )
    }
    return {
      runId: run.id,
      status: "succeeded",
      rootBlockId: readArcRunOutput(run.payload).rootBlockId,
      createdBlockIds: readArcRunOutput(run.payload).createdBlockIds ?? [],
      evidenceIds: readArcRunOutput(run.payload).evidenceIds ?? [],
    }
  }

  try {
    const blockType = await prisma.blockType.findFirst({
      where: {
        key: "goals-paths.arc",
        toolDefinitionId: installation.toolDefinition.id,
      },
    })

    if (!blockType) {
      throw new Error("NOT_AVAILABLE")
    }

    const blockId = crypto.randomUUID()
    const result = await prisma.$transaction(async (tx) => {
      await tx.block.create({
        data: {
          id: blockId,
          workspaceId: input.workspaceId,
          blockTypeId: blockType.id,
          createdById: actorId,
          originToolInstallationId: input.installationId,
          originToolRunId: run!.id,
          title: titleText,
          slug: `arc-${run!.id.replace(/-/g, "")}`,
          summary: objectiveSummary,
          body: bodyMarkdown,
          status: "ACTIVE",
          visibility: "PRIVATE",
          allowAgentAccess: false,
          properties: {
            objective,
            why: whyText,
            currentReality,
            targetDate: targetDateText,
            constraints: constraintsValue,
            contentFormat: "text/markdown",
            okf: {
              type: "Character Arc",
              profile: "character-arc.arc",
              profileVersion: 1,
            },
          },
          schemaVersion: 2,
          revision: 1,
        },
      })

      return tx.toolRun.update({
        where: { id: run!.id },
        data: {
          status: "SUCCEEDED",
          payload: {
            update: {
              output: {
                rootBlockId: blockId,
                createdBlockIds: [blockId],
                evidenceIds: [],
              },
            },
          },
          completedAt: new Date(),
        },
      })
    })

    return {
      runId: result.id,
      status: "succeeded",
      rootBlockId: blockId,
      createdBlockIds: [blockId],
      evidenceIds: [],
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : ""
    const msg =
      messageText === "NOT_AVAILABLE"
        ? "The goals-paths.arc block type is unavailable."
        : "The action could not be completed."
    await markRunFailed(run.id, msg)
    throw new ToolActionExecutionError(msg, "RUN_FAILED")
  }
}

export function createArcUpdateExecutor(
  actionKey: "arc.check-in" | "arc.set-status"
) {
  return async function executeArcUpdate(
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> {
    const actorId = principal.actorId

    const idempotencyKey = input.idempotencyKey
    if (
      !idempotencyKey ||
      idempotencyKey.length < 1 ||
      idempotencyKey.length > 128
    ) {
      throw new ToolActionExecutionError(
        "A valid idempotency key is required.",
        "INVALID_INPUT"
      )
    }

    const installation = await prisma.toolInstallation.findUnique({
      where: { id: input.installationId, workspaceId: input.workspaceId },
      include: { toolRelease: true, toolDefinition: true },
    })

    if (
      !installation ||
      installation.status !== "ACTIVE" ||
      installation.workspaceId !== input.workspaceId ||
      installation.toolDefinition.key !== "core.goals-paths"
    ) {
      throw new ToolActionExecutionError(
        "The active Goals and Paths installation is unavailable.",
        "NOT_AVAILABLE"
      )
    }

    const manifestStr = JSON.stringify(installation.toolRelease.manifest)
    const manifestHash = crypto
      .createHash("md5")
      .update(manifestStr)
      .digest("hex")
    const inputHash = crypto
      .createHash("md5")
      .update(JSON.stringify(input.input))
      .digest("hex")

    let run = await prisma.toolRun.findUnique({
      where: {
        installationId_idempotencyKey: {
          installationId: input.installationId,
          idempotencyKey: idempotencyKey,
        },
      },
      include: { payload: true },
    })

    if (!run) {
      try {
        run = await prisma.toolRun.create({
          data: {
            workspaceId: input.workspaceId,
            installationId: input.installationId,
            toolReleaseId: installation.toolReleaseId,
            actorId: actorId,
            actionKey,
            handlerVersion,
            invocationSource: principal.invocationSource,
            status: "RUNNING",
            idempotencyKey,
            inputHash,
            manifestHash,
            startedAt: new Date(),
            payload: { create: { input: input.input as Prisma.InputJsonValue } },
          },
          include: { payload: true },
        })
      } catch (e) {
        run = await prisma.toolRun.findUnique({
          where: {
            installationId_idempotencyKey: {
              installationId: input.installationId,
              idempotencyKey: idempotencyKey,
            },
          },
          include: { payload: true },
        })
        if (!run) throw e
      }
    }

    if (run.actionKey !== actionKey || run.inputHash !== inputHash) {
      throw new ToolActionExecutionError(
        "The idempotency key was already used for another request.",
        "INVALID_INPUT"
      )
    }

    if (run.status === "SUCCEEDED" || run.status === "FAILED") {
      if (run.status === "FAILED") {
        throw new ToolActionExecutionError(
          run.errorMessage || "The action could not be completed.",
          "RUN_FAILED"
        )
      }
      return {
        runId: run.id,
        status: "succeeded",
        rootBlockId: readArcRunOutput(run.payload).rootBlockId,
        createdBlockIds: readArcRunOutput(run.payload).createdBlockIds ?? [],
        evidenceIds: readArcRunOutput(run.payload).evidenceIds ?? [],
      }
    }

    let arcId: string
    let progressPercent: number | undefined
    let note: string | null = null
    let statusEnum: UserBlockStatus | undefined

    if (actionKey === "arc.check-in") {
      const parsed = z
        .object({
          arcId: z.string().uuid(),
          progressPercent: z.number().min(0).max(100),
          note: z.string().max(2000).optional().nullable(),
        })
        .safeParse(input.input)
      if (!parsed.success) {
        await markRunFailed(
          run.id,
          "The check-in is outside the supported limits."
        )
        throw new ToolActionExecutionError(
          "The check-in is outside the supported limits.",
          "INVALID_INPUT"
        )
      }
      arcId = parsed.data.arcId
      progressPercent = parsed.data.progressPercent
      note = parsed.data.note || null
    } else {
      const parsed = z
        .object({
          arcId: z.string().uuid(),
          status: z.enum(["active", "paused", "completed", "archived"]),
        })
        .safeParse(input.input)
      if (!parsed.success) {
        await markRunFailed(run.id, "The Arc status is invalid.")
        throw new ToolActionExecutionError(
          "The Arc status is invalid.",
          "INVALID_INPUT"
        )
      }
      arcId = parsed.data.arcId
      statusEnum = parsed.data.status.toUpperCase() as UserBlockStatus
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const block = await tx.block.findFirst({
          where: {
            id: arcId,
            workspaceId: input.workspaceId,
            originToolInstallationId: input.installationId,
            archivedAt: null,
            blockType: { key: "goals-paths.arc" },
          },
        })

        if (!block) {
          throw new Error("NOT_FOUND")
        }

        let evidenceId: string | undefined

        if (actionKey === "arc.check-in") {
          const evidence = await tx.progressEvidence.create({
            data: {
              workspaceId: input.workspaceId,
              userId: actorId,
              blockId: arcId,
              sourceType: "MANUAL",
              sourceId: run!.id,
              evidenceKey: "arc.check-in",
              numericValue: progressPercent,
              maxValue: 100,
              properties: { note },
              occurredAt: new Date(),
            },
          })
          evidenceId = evidence.id

          await tx.userBlockState.upsert({
            where: { userId_blockId: { userId: actorId, blockId: arcId } },
            update: {
              status: progressPercent === 100 ? "COMPLETED" : "ACTIVE",
              progressPercent,
              lastActivityAt: new Date(),
            },
            create: {
              workspaceId: input.workspaceId,
              userId: actorId,
              blockId: arcId,
              status: progressPercent === 100 ? "COMPLETED" : "ACTIVE",
              progressPercent,
              lastActivityAt: new Date(),
            },
          })
        } else {
          await tx.userBlockState.upsert({
            where: { userId_blockId: { userId: actorId, blockId: arcId } },
            update: {
              status: statusEnum!,
              lastActivityAt: new Date(),
            },
            create: {
              workspaceId: input.workspaceId,
              userId: actorId,
              blockId: arcId,
              status: statusEnum!,
              lastActivityAt: new Date(),
            },
          })
        }

        const completedRun = await tx.toolRun.update({
          where: { id: run!.id },
          data: {
            status: "SUCCEEDED",
            payload: {
              update: {
                output: {
                  rootBlockId: arcId,
                  createdBlockIds: [],
                  evidenceIds: evidenceId ? [evidenceId] : [],
                },
              },
            },
            completedAt: new Date(),
          },
        })

        return {
          run: completedRun,
          evidenceIds: evidenceId ? [evidenceId] : [],
        }
      })

      return {
        runId: result.run.id,
        status: "succeeded",
        rootBlockId: arcId,
        createdBlockIds: [],
        evidenceIds: result.evidenceIds,
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : ""
      const msg =
        messageText === "NOT_FOUND"
          ? "This Arc is unavailable."
          : "The action could not be completed."
      const code =
        messageText === "NOT_FOUND" ? "NOT_AVAILABLE" : "RUN_FAILED"
      await markRunFailed(run.id, msg)
      throw new ToolActionExecutionError(msg, code)
    }
  }
}

export function createArcContentExecutor(
  actionKey: "arc.update" | "arc.delete"
) {
  return async function executeArcContent(
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> {
    const actorId = principal.actorId

    const idempotencyKey = input.idempotencyKey
    if (
      !idempotencyKey ||
      idempotencyKey.length < 1 ||
      idempotencyKey.length > 128
    ) {
      throw new ToolActionExecutionError(
        "A valid idempotency key is required.",
        "INVALID_INPUT"
      )
    }

    const installation = await prisma.toolInstallation.findUnique({
      where: { id: input.installationId, workspaceId: input.workspaceId },
      include: { toolRelease: true, toolDefinition: true },
    })

    if (
      !installation ||
      installation.status !== "ACTIVE" ||
      installation.workspaceId !== input.workspaceId ||
      installation.toolDefinition.key !== "core.goals-paths"
    ) {
      throw new ToolActionExecutionError(
        "The active Goals and Paths installation is unavailable.",
        "NOT_AVAILABLE"
      )
    }

    const manifestStr = JSON.stringify(installation.toolRelease.manifest)
    const manifestHash = crypto
      .createHash("md5")
      .update(manifestStr)
      .digest("hex")
    const inputHash = crypto
      .createHash("md5")
      .update(JSON.stringify(input.input))
      .digest("hex")

    let run = await prisma.toolRun.findUnique({
      where: {
        installationId_idempotencyKey: {
          installationId: input.installationId,
          idempotencyKey: idempotencyKey,
        },
      },
      include: { payload: true },
    })

    if (!run) {
      try {
        run = await prisma.toolRun.create({
          data: {
            workspaceId: input.workspaceId,
            installationId: input.installationId,
            toolReleaseId: installation.toolReleaseId,
            actorId: actorId,
            actionKey,
            handlerVersion,
            invocationSource: principal.invocationSource,
            status: "RUNNING",
            idempotencyKey,
            inputHash,
            manifestHash,
            startedAt: new Date(),
            payload: { create: { input: input.input as Prisma.InputJsonValue } },
          },
          include: { payload: true },
        })
      } catch (e) {
        run = await prisma.toolRun.findUnique({
          where: {
            installationId_idempotencyKey: {
              installationId: input.installationId,
              idempotencyKey: idempotencyKey,
            },
          },
          include: { payload: true },
        })
        if (!run) throw e
      }
    }

    if (run.actionKey !== actionKey || run.inputHash !== inputHash) {
      throw new ToolActionExecutionError(
        "The idempotency key was already used for another request.",
        "INVALID_INPUT"
      )
    }

    if (run.status === "SUCCEEDED" || run.status === "FAILED") {
      if (run.status === "FAILED") {
        throw new ToolActionExecutionError(
          run.errorMessage || "The Arc could not be changed.",
          "RUN_FAILED"
        )
      }
      return {
        runId: run.id,
        status: "succeeded",
        rootBlockId: readArcRunOutput(run.payload).rootBlockId,
        createdBlockIds: readArcRunOutput(run.payload).createdBlockIds ?? [],
        evidenceIds: readArcRunOutput(run.payload).evidenceIds ?? [],
      }
    }

    let arcId: string
    let expectedRevision: number
    let arcUpdateData: ArcUpdateInputData | null = null

    if (actionKey === "arc.delete") {
      const parsed = z
        .object({
          arcId: z.string().uuid(),
          expectedRevision: z.number().int().min(1),
        })
        .safeParse(input.input)
      if (!parsed.success) {
        await markRunFailed(run.id, "Delete input is invalid.")
        throw new ToolActionExecutionError(
          "Delete input is invalid.",
          "INVALID_INPUT"
        )
      }
      arcId = parsed.data.arcId
      expectedRevision = parsed.data.expectedRevision
    } else {
      const parsed = arcUpdateInputSchema.safeParse(input.input)
      if (!parsed.success) {
        await markRunFailed(
          run.id,
          "Update input is outside the supported limits."
        )
        throw new ToolActionExecutionError(
          "Update input is outside the supported limits.",
          "INVALID_INPUT"
        )
      }
      arcId = parsed.data.arcId
      expectedRevision = parsed.data.expectedRevision
      if (actionKey === "arc.update") {
        arcUpdateData = parsed.data
      }
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const block = await tx.block.findFirst({
          where: {
            id: arcId,
            workspaceId: input.workspaceId,
            originToolInstallationId: input.installationId,
            createdById: actorId,
            status: "ACTIVE",
            archivedAt: null,
            blockType: { key: "goals-paths.arc" },
          },
        })

        if (!block) {
          throw new Error("NOT_FOUND")
        }

        if (Number(block.revision) !== expectedRevision) {
          throw new Error("CONFLICT")
        }

        if (actionKey === "arc.update") {
          const actionInput = arcUpdateData!
          const titleText = actionInput.title.trim()
          const objective = actionInput.objective.trim()
          const currentReality = actionInput.currentReality.trim()
          const whyText = actionInput.why ? actionInput.why.trim() : null
          const targetDateText = actionInput.targetDate || null
          const constraintsValue = actionInput.constraints || []

          const objectiveLines = objective.split(/\r?\n/)
          let objectiveSummary =
            objectiveLines.find((line: string) => line.trim() !== "")?.trim() ||
            ""
          objectiveSummary = objectiveSummary
            .replace(/^[#>*+_~` -]+/, "")
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 280)
          if (!objectiveSummary) {
            objectiveSummary = objective.substring(0, 280)
          }

          let bodyMarkdown = `# Objective\n\n${objective}\n\n# Current Reality\n\n${currentReality}`
          if (whyText) {
            bodyMarkdown += `\n\n# Why This Matters\n\n${whyText}`
          }
          if (constraintsValue.length > 0) {
            const constraintsMarkdown = constraintsValue
              .map((c: string) => `- ${c}`)
              .join("\n")
            bodyMarkdown += `\n\n# Constraints\n\n${constraintsMarkdown}`
          }

          await tx.block.update({
            where: { id: arcId },
            data: {
              title: titleText,
              summary: objectiveSummary,
              body: bodyMarkdown,
              properties: {
                objective,
                why: whyText,
                currentReality,
                targetDate: targetDateText,
                constraints: constraintsValue,
                contentFormat: "text/markdown",
                okf: {
                  type: "Character Arc",
                  profile: "character-arc.arc",
                  profileVersion: 1,
                },
              },
              schemaVersion: 2,
              revision: Number(block.revision) + 1,
            },
          })
        } else {
          await tx.block.update({
            where: { id: arcId },
            data: {
              status: "ARCHIVED",
              archivedAt: new Date(),
              revision: Number(block.revision) + 1,
            },
          })

          await tx.userBlockState.updateMany({
            where: { blockId: arcId, userId: actorId },
            data: {
              status: "ARCHIVED",
              lastActivityAt: new Date(),
            },
          })
        }

        return tx.toolRun.update({
          where: { id: run!.id },
          data: {
            status: "SUCCEEDED",
            payload: {
              update: {
                output: {
                  rootBlockId: arcId,
                  createdBlockIds: [],
                  evidenceIds: [],
                  operation: actionKey,
                  previousRevision: Number(block.revision),
                  newRevision: Number(block.revision) + 1,
                },
              },
            },
            completedAt: new Date(),
          },
        })
      })

      return {
        runId: result.id,
        status: "succeeded",
        rootBlockId: arcId,
        createdBlockIds: [],
        evidenceIds: [],
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : ""
      const msg =
        messageText === "CONFLICT"
          ? "This Arc changed elsewhere. Refresh it before trying again."
          : messageText === "NOT_FOUND"
            ? "Only the Arc owner can make that change."
            : "The Arc could not be changed."

      const code =
        messageText === "CONFLICT"
          ? "INVALID_INPUT"
          : messageText === "NOT_FOUND"
            ? "FORBIDDEN"
            : "RUN_FAILED"

      await markRunFailed(run.id, msg)
      throw new ToolActionExecutionError(msg, code)
    }
  }
}
