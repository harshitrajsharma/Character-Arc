/**
 * Writes progress evidence from a graded attempt into the shared progress
 * system. This is the bridge between the mock-tests tool and exam-prep:
 * questions targeted at exam-prep chapter/topic blocks produce
 * `ProgressEvidence` rows (sourceType ASSESSMENT_ATTEMPT) and rebuild the
 * `TopicProgress` projection, which the exam-prep weak-topic reads surface.
 */
import crypto from "crypto"

import { EvidenceSourceType, Prisma } from "@/generated/prisma/client"

export type QuestionEvidenceInput = {
  questionId: string
  awardedMarks: number
  marks: number
  isCorrect: boolean | null
  /** QuestionTarget rows linking this question to study blocks. */
  targets: Array<{ blockId: string; weight: number }>
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000
}

/** Confidence heuristic: more attempts -> more confidence in the estimate. */
function confidenceForCount(count: number): number {
  return round2(Math.min(95, 40 + count * 10))
}

/**
 * Creates ProgressEvidence rows efficiently via createMany per (question, target block)
 * and rebuilds the TopicProgress projection for every touched block. Returns evidence ids.
 */
export async function writeAttemptEvidence(
  tx: Prisma.TransactionClient,
  args: {
    workspaceId: string
    userId: string
    attemptId: string
    occurredAt: Date
    questions: QuestionEvidenceInput[]
  }
): Promise<string[]> {
  const evidenceRows: Prisma.ProgressEvidenceCreateManyInput[] = []
  const evidenceIds: string[] = []
  const blockKeys = new Set<string>()

  for (const question of args.questions) {
    for (const target of question.targets) {
      // Weight scales how much of the question's marks this evidence covers.
      const factor = target.weight > 0 ? target.weight / 100 : 1
      const numericValue = round4(question.awardedMarks * factor)
      const maxValue = round4(question.marks * factor)
      const id = crypto.randomUUID()

      evidenceRows.push({
        id,
        workspaceId: args.workspaceId,
        userId: args.userId,
        blockId: target.blockId,
        attemptId: args.attemptId,
        sourceType: EvidenceSourceType.ASSESSMENT_ATTEMPT,
        evidenceKey: "mock-tests.attempt",
        numericValue,
        maxValue,
        confidence: round2(factor),
        properties: {
          questionId: question.questionId,
          isCorrect: question.isCorrect,
          awardedMarks: question.awardedMarks,
          marks: question.marks,
        },
        occurredAt: args.occurredAt,
      })
      evidenceIds.push(id)
      blockKeys.add(target.blockId)
    }
  }

  if (evidenceRows.length > 0) {
    await tx.progressEvidence.createMany({
      data: evidenceRows,
    })
  }

  for (const blockId of blockKeys) {
    await rebuildTopicProgress(tx, {
      workspaceId: args.workspaceId,
      userId: args.userId,
      blockId,
      occurredAt: args.occurredAt,
    })
  }

  return evidenceIds
}

/**
 * Recomputes the TopicProgress projection for one (user, block) from the
 * block's ASSESSMENT_ATTEMPT evidence. Proficiency is the weighted marks
 * ratio; confidence grows with evidence count.
 */
async function rebuildTopicProgress(
  tx: Prisma.TransactionClient,
  args: {
    workspaceId: string
    userId: string
    blockId: string
    occurredAt: Date
  }
): Promise<void> {
  const evidence = await tx.progressEvidence.findMany({
    where: {
      workspaceId: args.workspaceId,
      userId: args.userId,
      blockId: args.blockId,
      sourceType: EvidenceSourceType.ASSESSMENT_ATTEMPT,
    },
    select: { numericValue: true, maxValue: true },
  })

  let totalNumerator = 0
  let totalDenominator = 0
  for (const row of evidence) {
    totalNumerator += Number(row.numericValue ?? 0)
    totalDenominator += Number(row.maxValue ?? 0)
  }

  const proficiency =
    totalDenominator > 0
      ? round2(Math.min(100, (totalNumerator / totalDenominator) * 100))
      : 0
  const confidence = confidenceForCount(evidence.length)

  await tx.topicProgress.upsert({
    where: { userId_blockId: { userId: args.userId, blockId: args.blockId } },
    create: {
      workspaceId: args.workspaceId,
      userId: args.userId,
      blockId: args.blockId,
      proficiency,
      confidence,
      evidenceCount: evidence.length,
      lastPracticedAt: args.occurredAt,
    },
    update: {
      proficiency,
      confidence,
      evidenceCount: evidence.length,
      lastPracticedAt: args.occurredAt,
    },
  })
}
