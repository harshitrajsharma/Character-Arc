import { z } from "zod"

const subjectProgressPolicyFields = {
  revisionTarget: z.number().int().min(1).max(100),
  practiceTarget: z.number().int().min(1).max(100),
  highYieldRevisionTarget: z.number().int().min(1).max(100),
  highYieldPracticeTarget: z.number().int().min(1).max(100),
  chapterTestTarget: z.number().int().min(0).max(100),
  subjectTestTarget: z.number().int().min(0).max(100),
}

export const subjectProgressPolicySchema = z.object({
  revisionTarget: subjectProgressPolicyFields.revisionTarget.default(3),
  practiceTarget: subjectProgressPolicyFields.practiceTarget.default(3),
  highYieldRevisionTarget: subjectProgressPolicyFields.highYieldRevisionTarget.default(5),
  highYieldPracticeTarget: subjectProgressPolicyFields.highYieldPracticeTarget.default(5),
  chapterTestTarget: subjectProgressPolicyFields.chapterTestTarget.default(1),
  subjectTestTarget: subjectProgressPolicyFields.subjectTestTarget.default(1),
})

export const subjectProgressPolicyUpdateSchema = z
  .object(subjectProgressPolicyFields)
  .superRefine((policy, context) => {
    if (policy.highYieldRevisionTarget < policy.revisionTarget) {
      context.addIssue({
        code: "custom",
        path: ["highYieldRevisionTarget"],
        message: "High-yield revisions must be at least the standard revision target.",
      })
    }

    if (policy.highYieldPracticeTarget < policy.practiceTarget) {
      context.addIssue({
        code: "custom",
        path: ["highYieldPracticeTarget"],
        message: "High-yield practice must be at least the standard practice target.",
      })
    }
  })

export type SubjectProgressPolicyInput = z.input<typeof subjectProgressPolicySchema>;
export type SubjectProgressPolicy = z.infer<typeof subjectProgressPolicySchema>;

export const defaultSubjectProgressPolicy: SubjectProgressPolicy = {
  revisionTarget: 3,
  practiceTarget: 3,
  highYieldRevisionTarget: 5,
  highYieldPracticeTarget: 5,
  chapterTestTarget: 1,
  subjectTestTarget: 1,
};

export const DEFAULT_SUBJECT_PROGRESS_POLICY = defaultSubjectProgressPolicy

export function normalizeSubjectProgressPolicy(
  policy?: Partial<SubjectProgressPolicyInput> | null
): SubjectProgressPolicy {
  const source = policy ?? {}
  const revisionTarget = normalizeTarget(
    source.revisionTarget,
    1,
    defaultSubjectProgressPolicy.revisionTarget
  )
  const practiceTarget = normalizeTarget(
    source.practiceTarget,
    1,
    defaultSubjectProgressPolicy.practiceTarget
  )

  return subjectProgressPolicySchema.parse({
    revisionTarget,
    practiceTarget,
    highYieldRevisionTarget: Math.max(
      revisionTarget,
      normalizeTarget(
        source.highYieldRevisionTarget,
        1,
        defaultSubjectProgressPolicy.highYieldRevisionTarget
      )
    ),
    highYieldPracticeTarget: Math.max(
      practiceTarget,
      normalizeTarget(
        source.highYieldPracticeTarget,
        1,
        defaultSubjectProgressPolicy.highYieldPracticeTarget
      )
    ),
    chapterTestTarget: normalizeTarget(source.chapterTestTarget, 0, defaultSubjectProgressPolicy.chapterTestTarget),
    subjectTestTarget: normalizeTarget(source.subjectTestTarget, 0, defaultSubjectProgressPolicy.subjectTestTarget),
  })
}

export function validateSubjectProgressPolicy(policy: unknown): SubjectProgressPolicy {
  return subjectProgressPolicyUpdateSchema.parse(policy)
}

function normalizeTarget(value: unknown, minimum: number, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= 100
    ? value
    : fallback
}
