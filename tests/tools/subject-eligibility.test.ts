// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"
import { checkSubjectEligibility } from "@/lib/tools/definitions/exam-prep/dashboard-queries"

describe("Subject Eligibility Checks", () => {
  const workspaceId = "58a0111e-43d0-4464-83c0-a5132c6bd4f5"
  const installationId = "58a0111e-43d0-4464-83c0-a5132c6bd4f6"
  const examId = "58a0111e-43d0-4464-83c0-a5132c6bd4f7"
  const subjectId = "58a0111e-43d0-4464-83c0-a5132c6bd4f8"

  const validExam = {
    id: examId,
    workspaceId,
    status: "ACTIVE",
    archivedAt: null,
    originToolInstallationId: installationId,
  }

  const validSubject = {
    id: subjectId,
    workspaceId,
    status: "ACTIVE",
    archivedAt: null,
    originToolInstallationId: installationId,
  }

  const validRelation = {
    workspaceId,
    fromBlockId: examId,
    toBlockId: subjectId,
  }

  test("matching exam and subject relation succeeds", () => {
    const eligible = checkSubjectEligibility({
      workspaceId,
      installationId,
      exam: validExam,
      subject: validSubject,
      relation: validRelation,
    })
    expect(eligible).toBe(true)
  })

  test("unrelated subject fails", () => {
    const eligible = checkSubjectEligibility({
      workspaceId,
      installationId,
      exam: validExam,
      subject: validSubject,
      relation: {
        workspaceId,
        fromBlockId: examId,
        toBlockId: "58a0111e-43d0-4464-83c0-a5132c6bd4f9", // different subject
      },
    })
    expect(eligible).toBe(false)
  })

  test("workspace mismatch fails", () => {
    const eligible = checkSubjectEligibility({
      workspaceId,
      installationId,
      exam: {
        ...validExam,
        workspaceId: "58a0111e-43d0-4464-83c0-a5132c6bd4f9", // different workspace
      },
      subject: validSubject,
      relation: validRelation,
    })
    expect(eligible).toBe(false)
  })

  test("installation-origin mismatch fails", () => {
    const eligible = checkSubjectEligibility({
      workspaceId,
      installationId,
      exam: {
        ...validExam,
        originToolInstallationId: "58a0111e-43d0-4464-83c0-a5132c6bd4f9", // different installation
      },
      subject: validSubject,
      relation: validRelation,
    })
    expect(eligible).toBe(false)
  })

  test("archived subject fails", () => {
    const eligible = checkSubjectEligibility({
      workspaceId,
      installationId,
      exam: validExam,
      subject: {
        ...validSubject,
        archivedAt: new Date(), // archived
      },
      relation: validRelation,
    })
    expect(eligible).toBe(false)
  })
})
