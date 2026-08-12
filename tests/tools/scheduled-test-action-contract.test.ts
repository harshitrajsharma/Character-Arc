// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

import { examPrepManifest } from "@/lib/tools/definitions/exam-prep/manifest"

const scheduledTestHandlerSource = readFileSync(
  "lib/tools/exam-prep-scheduled-test-handlers.ts",
  "utf8"
)

const scheduledTestActionKeys = [
  "scheduled-test.create",
  "scheduled-test.update",
  "scheduled-test.cancel",
  "scheduled-test.restore",
  "scheduled-test.complete",
  "scheduled-test.reopen",
  "scheduled-test.delete",
] as const

function sourceBetween(startMarker: string, endMarker?: string) {
  const start = scheduledTestHandlerSource.indexOf(startMarker)
  const end = endMarker
    ? scheduledTestHandlerSource.indexOf(endMarker, start + 1)
    : scheduledTestHandlerSource.length

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Could not find source section: ${startMarker}`)
  }

  return scheduledTestHandlerSource.slice(start, end).replace(/\s+/g, " ")
}

describe("scheduled test action contract", () => {
  test("declares all seven scheduled-test lifecycle actions", () => {
    const declaredKeys = new Set(
      examPrepManifest.actions.map((action) => action.key)
    )

    expect(examPrepManifest.release.version).toBe("1.11.0")
    for (const actionKey of scheduledTestActionKeys) {
      expect(declaredKeys.has(actionKey)).toBe(true)
    }
  })

  test("binds every scheduled-test action to Exam Prep release 1.11.0", () => {
    const source = readFileSync("lib/tools/execute-tool-action.ts", "utf8")

    for (const actionKey of scheduledTestActionKeys) {
      expect(source).toContain(`core.exam-prep@1.11.0:${actionKey}`)
    }
  })

  test("does not expose the retired direct JSON scheduling functions", () => {
    const source = readFileSync(
      "lib/tools/exam-prep/actions/test-actions.ts",
      "utf8"
    )

    expect(source).not.toContain("updateScheduledTestsAction")
    expect(source).not.toContain("syncSubjectTestScheduleAction")
    expect(source).not.toContain("updateScheduledTestsSchema")
    expect(source).not.toContain("syncSubjectTestScheduleSchema")
    expect(source).not.toContain("normalizeUnifiedTestSchedule")
  })

  test("reserves scoped idempotency keys and resolves replay races", () => {
    const source = sourceBetween(
      "async function reserveToolRun(",
      "async function completeToolRun("
    )

    expect(source).toContain("const inputHash = hashInput(actionInput)")
    expect(source).toMatch(
      /scopedIdempotencyKey\s*=\s*`st1_\$\{hashInput\(\{\s*actorId,\s*actionKey,\s*key:\s*input\.idempotencyKey/
    )
    expect(source).toContain("installationId: input.installationId")
    expect(source).toContain("actorId")
    expect(source).toContain("actionKey")
    expect(source).toContain("idempotencyKey: scopedIdempotencyKey")
    expect(source).toContain("status: ToolRunStatus.RUNNING")
    expect(source).toContain('error.code === "P2002"')
    expect(source.match(/resolveExistingRun\(/g)).toHaveLength(2)
  })

  test("hashes canonical action input with SHA-256", () => {
    const source = sourceBetween("function hashInput(", "function parseDateOnly(")

    expect(source).toMatch(
      /crypto\.createHash\(["']sha256["']\)\s*\.update\(canonicalJson\(input\)\)\s*\.digest\(["']hex["']\)/
    )
    expect(source).toContain("value.map(canonicalJson)")
    expect(source).toMatch(/Object\.entries\([^)]+\)\s*\.sort\(/)
    expect(source).toContain("canonicalJson(entry)")
  })

  test("replays successful ToolRuns from their stored output", () => {
    const source = sourceBetween(
      "function readSucceededRun(",
      "async function reserveToolRun("
    )

    expect(source).toContain("const output = record.payload?.output")
    expect(source).toMatch(
      /runId:\s*record\.id,\s*status:\s*["']succeeded["']/
    )
    expect(source).toContain("stored.rootBlockId")
    expect(source).toContain("stored.createdBlockIds")
    expect(source).toContain("stored.evidenceIds")
    expect(source).toContain("stored.data")
    expect(source).toMatch(
      /existing\.status\s*===\s*ToolRunStatus\.SUCCEEDED/
    )
    expect(source).toMatch(
      /replay:\s*readSucceededRun\(existing\)/
    )
  })

  test("persists FAILED ToolRuns outside a rolled-back domain transaction", () => {
    const failureAuditSource = sourceBetween(
      "async function failToolRunAndThrow(",
      "function serializeScheduledTest("
    )
    const createHandlerSource = sourceBetween(
      "export async function executeExamPrepScheduledTestCreate(",
      "export async function executeExamPrepScheduledTestUpdate("
    )

    expect(createHandlerSource).toMatch(
      /try\s*\{\s*const result = await withSerializableTransaction[\s\S]*catch\s*\(error\)\s*\{\s*return failToolRunAndThrow/
    )
    expect(failureAuditSource).toContain(
      "await prisma.$transaction(async (tx) =>"
    )
    expect(failureAuditSource).toMatch(
      /tx\.toolRun\.updateMany\([\s\S]*where:\s*\{\s*id:\s*runId,\s*status:\s*ToolRunStatus\.RUNNING\s*\}/
    )
    expect(failureAuditSource).toContain("status: ToolRunStatus.FAILED")
    expect(failureAuditSource).toContain("errorCode: code")
    expect(failureAuditSource).toContain("errorMessage: message")
    expect(failureAuditSource).toContain("tx.toolRunPayload.update")
  })

  test("revalidates curriculum before restoring or reopening", () => {
    const curriculumSource = sourceBetween(
      "async function requireExamSubjectContext(",
      "async function requireOwnedScheduledTest("
    )
    const transitionSource = sourceBetween(
      "async function executeScheduledTestStatusTransition(",
      "export function executeExamPrepScheduledTestCancel("
    )
    const reopenSource = sourceBetween(
      "export async function executeExamPrepScheduledTestReopen(",
      "export async function executeExamPrepScheduledTestDelete("
    )

    expect(curriculumSource).toContain("exam-prep.exam-has-subject")
    expect(curriculumSource).toContain("exam-prep.subject-has-chapter")
    expect(curriculumSource).toContain("originToolInstallationId")
    expect(curriculumSource).toContain("status: BlockStatus.ACTIVE")
    expect(curriculumSource).toContain("archivedAt: null")

    const restoreGuard = transitionSource.indexOf(
      'if (transition === "restore")'
    )
    const restoreValidation = transitionSource.indexOf(
      "await requireExamSubjectContext(",
      restoreGuard
    )
    const restoreMutation = transitionSource.indexOf(
      "const update = await tx.scheduledTest.updateMany",
      restoreGuard
    )
    expect(restoreGuard).toBeGreaterThanOrEqual(0)
    expect(restoreValidation).toBeGreaterThan(restoreGuard)
    expect(restoreMutation).toBeGreaterThan(restoreValidation)

    const reopenValidation = reopenSource.indexOf(
      "await requireExamSubjectContext("
    )
    const reopenMutation = reopenSource.indexOf(
      "await tx.scheduledTest.updateMany"
    )
    expect(reopenValidation).toBeGreaterThanOrEqual(0)
    expect(reopenMutation).toBeGreaterThan(reopenValidation)
    expect(reopenSource).toContain(
      "existing.chapters.map((target) => target.chapterId)"
    )
  })

  test("guards deleteMany by ownership, revision, and incomplete status", () => {
    const source = sourceBetween(
      "export async function executeExamPrepScheduledTestDelete("
    )
    const deleteStart = source.indexOf("tx.scheduledTest.deleteMany")
    const deleteEnd = source.indexOf("if (deleted.count !== 1)", deleteStart)
    const deletePredicate = source.slice(deleteStart, deleteEnd)

    expect(deleteStart).toBeGreaterThanOrEqual(0)
    expect(deleteEnd).toBeGreaterThan(deleteStart)
    expect(deletePredicate).toContain("id: existing.id")
    expect(deletePredicate).toContain("workspaceId: input.workspaceId")
    expect(deletePredicate).toContain("installationId: input.installationId")
    expect(deletePredicate).toContain("userId: actorId")
    expect(deletePredicate).toContain(
      "revision: actionInput.expectedRevision"
    )
    expect(deletePredicate).toContain("ScheduledTestStatus.PLANNED")
    expect(deletePredicate).toContain("ScheduledTestStatus.SCHEDULED")
    expect(deletePredicate).toContain("ScheduledTestStatus.CANCELLED")
    expect(deletePredicate).not.toContain("ScheduledTestStatus.COMPLETED")
  })
})
