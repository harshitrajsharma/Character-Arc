import { z } from "zod"

export const subjectProgressPolicySchema = z.object({
  revisionTarget: z.number().int().min(1).max(100).default(3),
  practiceTarget: z.number().int().min(1).max(100).default(3),
  highYieldRevisionTarget: z.number().int().min(1).max(100).default(5),
  highYieldPracticeTarget: z.number().int().min(1).max(100).default(5),
  chapterTestTarget: z.number().int().min(0).max(100).default(1),
  subjectTestTarget: z.number().int().min(0).max(100).default(1),
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

  return subjectProgressPolicySchema.parse({
    revisionTarget: normalizeTarget(source.revisionTarget, 1, defaultSubjectProgressPolicy.revisionTarget),
    practiceTarget: normalizeTarget(source.practiceTarget, 1, defaultSubjectProgressPolicy.practiceTarget),
    highYieldRevisionTarget: normalizeTarget(source.highYieldRevisionTarget, 1, defaultSubjectProgressPolicy.highYieldRevisionTarget),
    highYieldPracticeTarget: normalizeTarget(source.highYieldPracticeTarget, 1, defaultSubjectProgressPolicy.highYieldPracticeTarget),
    chapterTestTarget: normalizeTarget(source.chapterTestTarget, 0, defaultSubjectProgressPolicy.chapterTestTarget),
    subjectTestTarget: normalizeTarget(source.subjectTestTarget, 0, defaultSubjectProgressPolicy.subjectTestTarget),
  })
}

export function validateSubjectProgressPolicy(policy: unknown): SubjectProgressPolicy {
  return subjectProgressPolicySchema.parse(policy)
}

function normalizeTarget(value: unknown, minimum: number, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= 100
    ? value
    : fallback
}
