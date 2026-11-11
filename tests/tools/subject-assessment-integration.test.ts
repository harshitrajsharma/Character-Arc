// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import type { Prisma } from "@/generated/prisma/client"
import {
  activeExamPrepBlock,
  assertAssessmentStudyContext,
} from "@/lib/tools/exam-prep/assessment-study-validation"
import {
  parseSubjectTestsReturn,
  subjectAssessmentCreationHref,
  subjectTestsHref,
  withSubjectReturn,
} from "@/lib/tools/exam-prep/assessment-study-context"
import { assessmentsForScope } from "@/components/tools/exam-prep/subjects/tests/unified-test-helpers"
import { validateToolActionInput } from "@/lib/tools/action-contract"
import { mockTestsManifest } from "@/lib/tools/definitions/mock-tests/manifest"
import type { SubjectLinkedAssessment } from "@/types/progressapp/domain"

const examId = "11111111-1111-4111-8111-111111111111"
const subjectId = "22222222-2222-4222-8222-222222222222"
const chapterId = "33333333-3333-4333-8333-333333333333"
const workspace = "personal-workspace"

describe("subject assessment destinations", () => {
  test("keeps create and return destinations scoped without accepting external redirects", () => {
    const scope = { examId, subjectId, chapterId }
    const href = subjectTestsHref(workspace, scope)
    expect(parseSubjectTestsReturn(workspace, href)).toEqual(scope)
    expect(
      new URL(
        subjectAssessmentCreationHref(workspace, scope),
        "https://example.test"
      ).searchParams.get("fromChapter")
    ).toBe(chapterId)
    for (const bad of [
      "https://evil.test/",
      "//evil.test/",
      "/\\evil.test" + href,
      href + "\n",
      "/workspace/other/exam-prep/" + examId + "/subjects/" + subjectId,
      "/workspace/personal-workspace/exam-prep/not-a-uuid/subjects/" +
        subjectId,
    ]) {
      expect(parseSubjectTestsReturn(workspace, bad)).toBeNull()
    }
  })
  test("preserves builder question query and focus anchors while carrying subject return", () => {
    const target =
      "/workspace/personal/assessments/paper/edit?added=question#question-question"
    const url = new URL(
      withSubjectReturn(
        target,
        subjectTestsHref(workspace, { examId, subjectId })
      ),
      "https://example.test"
    )
    expect(url.hash).toBe("#question-question")
    expect(url.searchParams.get("added")).toBe("question")
    expect(url.searchParams.get("returnTo")).toContain(subjectId)
  })
  test("subject view aggregates chapter papers without inventing chapter coverage", () => {
    const papers = [
      {
        assessmentId: "subject",
        targetsWholeSubject: true,
        targetChapterIds: [],
      },
      {
        assessmentId: "chapter",
        targetsWholeSubject: false,
        targetChapterIds: [chapterId],
      },
    ] as SubjectLinkedAssessment[]
    expect(assessmentsForScope(papers).length).toBe(2)
    expect(
      assessmentsForScope(papers, chapterId).map((paper) => paper.assessmentId)
    ).toEqual(["chapter"])
  })
})

describe("transactional study-context boundary", () => {
  function setup(kind: string, brokenAt = -1) {
    const calls: Prisma.BlockRelationFindFirstArgs[] = []
    const blockCalls: Prisma.BlockFindFirstArgs[] = []
    const tx = {
      block: {
        findFirst: async (args: Prisma.BlockFindFirstArgs) => {
          blockCalls.push(args)
          return {
            id: "leaf",
            blockType: { key: kind },
            originToolInstallationId: "installation",
            examDetails: kind === "exam-prep.exam" ? {} : null,
            subjectDetails: kind === "exam-prep.subject" ? {} : null,
            chapterDetails: kind === "exam-prep.chapter" ? {} : null,
            topicDetails: kind === "exam-prep.topic" ? {} : null,
          }
        },
      },
      blockRelation: {
        findFirst: async (args: Prisma.BlockRelationFindFirstArgs) => {
          calls.push(args)
          return calls.length - 1 === brokenAt
            ? null
            : { fromBlockId: "ancestor-" + calls.length }
        },
      },
    } as unknown as Prisma.TransactionClient
    return { tx, calls, blockCalls }
  }
  test("validates all three topic ancestors in the same active installation", async () => {
    const { tx, calls, blockCalls } = setup("exam-prep.topic")
    await assertAssessmentStudyContext(tx, "workspace", "leaf", true)
    expect(calls.length).toBe(3)
    expect(blockCalls[0].where).toMatchObject(
      activeExamPrepBlock("workspace", undefined, true)
    )
    for (const call of calls) {
      expect(call.where).toMatchObject({
        workspaceId: "workspace",
        fromBlock: activeExamPrepBlock("workspace", "installation", true),
        toBlock: activeExamPrepBlock("workspace", "installation", true),
      })
    }
    expect(calls.map((call) => call.where?.relationType)).toEqual([
      { key: "exam-prep.chapter-has-topic" },
      { key: "exam-prep.subject-has-chapter" },
      { key: "exam-prep.exam-has-subject" },
    ])
  })
  test("rejects a broken ancestry and an unrelated block type before writing", async () => {
    const broken = setup("exam-prep.chapter", 1)
    await expect(
      assertAssessmentStudyContext(broken.tx, "workspace", "leaf")
    ).rejects.toMatchObject({ code: "INVALID_INPUT" })
    const unrelated = setup("goals-paths.arc")
    await expect(
      assertAssessmentStudyContext(unrelated.tx, "workspace", "leaf")
    ).rejects.toMatchObject({ code: "INVALID_INPUT" })
    expect(unrelated.calls.length).toBe(0)
  })
  test("does not require a parent above an active typed exam", async () => {
    const { tx, calls } = setup("exam-prep.exam")
    await assertAssessmentStudyContext(tx, "workspace", "leaf")
    expect(calls.length).toBe(0)
  })
})

describe("assessment metadata action compatibility", () => {
  test("accepts existing UI title and instruction limits with typed study context", () => {
    const result = validateToolActionInput(
      mockTestsManifest,
      "assessment.create",
      {
        title: "x".repeat(200),
        instructions: "x".repeat(20000),
        examBlockId: subjectId,
      }
    )
    expect(result.success).toBe(true)
    expect(
      validateToolActionInput(mockTestsManifest, "assessment.create", {
        title: "x".repeat(201),
      }).success
    ).toBe(false)
  })
})
