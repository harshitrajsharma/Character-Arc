// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, it, expect } from "bun:test"
import { resolveToolDestination, workspaceRoutes } from "./workspace-tools"

describe("workspaceRoutes", () => {
  it("encodes unsafe workspace slugs", () => {
    expect(workspaceRoutes.home("my workspace")).toBe(
      "/workspace/my%20workspace"
    )
    expect(workspaceRoutes.home("hello/world")).toBe("/workspace/hello%2Fworld")
  })

  it("builds exam prep routes correctly", () => {
    const slug = "test-slug"
    expect(workspaceRoutes.examPrep.home(slug)).toBe(
      "/workspace/test-slug/exam-prep"
    )
    expect(workspaceRoutes.examPrep.new(slug)).toBe(
      "/workspace/test-slug/exam-prep/new"
    )
    expect(workspaceRoutes.examPrep.exam(slug, "exam-1")).toBe(
      "/workspace/test-slug/exam-prep/exam-1"
    )
    expect(workspaceRoutes.examPrep.subject(slug, "exam-1", "subj-2")).toBe(
      "/workspace/test-slug/exam-prep/exam-1/subjects/subj-2"
    )
    expect(workspaceRoutes.examPrep.subjectSettings(slug, "subj-2")).toBe(
      "/workspace/test-slug/exam-prep/subjects/subj-2/settings"
    )
    expect(
      workspaceRoutes.examPrep.subjectSettings(slug, "subj-2", "exam-1")
    ).toBe(
      "/workspace/test-slug/exam-prep/subjects/subj-2/settings?fromExam=exam-1"
    )
  })

  it("builds goals and paths routes correctly", () => {
    const slug = "test-slug"
    expect(workspaceRoutes.goalsPaths.home(slug)).toBe(
      "/workspace/test-slug/goals-paths"
    )
    expect(workspaceRoutes.goalsPaths.new(slug)).toBe(
      "/workspace/test-slug/goals-paths/new"
    )
    expect(workspaceRoutes.goalsPaths.arc(slug, "arc-1")).toBe(
      "/workspace/test-slug/goals-paths/arc-1"
    )
    expect(workspaceRoutes.goalsPaths.arcEdit(slug, "arc-1")).toBe(
      "/workspace/test-slug/goals-paths/arc-1/edit"
    )
  })

  it("safely encodes nested segment IDs", () => {
    expect(workspaceRoutes.examPrep.subject("slug", "exam/1", "subj/2")).toBe(
      "/workspace/slug/exam-prep/exam%2F1/subjects/subj%2F2"
    )
    expect(
      workspaceRoutes.examPrep.subjectSettings("slug", "subj/2", "exam/1")
    ).toBe(
      "/workspace/slug/exam-prep/subjects/subj%2F2/settings?fromExam=exam%2F1"
    )
  })

  it("routes installed tools to their workspace", () => {
    expect(
      resolveToolDestination({
        workspaceSlug: "my workspace",
        toolKey: "core.exam-prep",
        catalogRoute: "/tools/exam-prep",
        installed: true,
      })
    ).toBe("/workspace/my%20workspace/exam-prep")
  })

  it("keeps uninstalled tools in the catalog", () => {
    expect(
      resolveToolDestination({
        workspaceSlug: "personal",
        toolKey: "core.exam-prep",
        catalogRoute: "/tools/exam-prep",
        installed: false,
      })
    ).toBe("/tools/exam-prep")
  })

  it("maps both installed first-party tools", () => {
    expect(workspaceRoutes.toolHome("personal", "core.exam-prep")).toBe(
      "/workspace/personal/exam-prep"
    )
    expect(workspaceRoutes.toolHome("personal", "core.goals-paths")).toBe(
      "/workspace/personal/goals-paths"
    )
  })

  it("builds mock tests routes correctly", () => {
    const slug = "test-slug"
    expect(workspaceRoutes.mockTests.home(slug)).toBe(
      "/workspace/test-slug/assessments"
    )
    expect(workspaceRoutes.mockTests.new(slug)).toBe(
      "/workspace/test-slug/assessments/new"
    )
    expect(workspaceRoutes.mockTests.detail(slug, "test-1")).toBe(
      "/workspace/test-slug/assessments/test-1"
    )
    expect(workspaceRoutes.mockTests.edit(slug, "test-1")).toBe(
      "/workspace/test-slug/assessments/test-1/edit"
    )
    expect(workspaceRoutes.mockTests.attemptNew(slug, "test-1")).toBe(
      "/workspace/test-slug/assessments/test-1/attempts/new"
    )
    expect(workspaceRoutes.mockTests.attempt(slug, "attempt-9")).toBe(
      "/assessments/attempt-9"
    )
    expect(workspaceRoutes.mockTests.analysis(slug, "attempt-9")).toBe(
      "/workspace/test-slug/assessments/attempts/attempt-9/analysis"
    )
    expect(workspaceRoutes.mockTests.questions(slug)).toBe(
      "/workspace/test-slug/assessments/questions"
    )
    expect(workspaceRoutes.mockTests.questionNew(slug)).toBe(
      "/workspace/test-slug/assessments/questions/new"
    )
    expect(workspaceRoutes.mockTests.questionEdit(slug, "q-1")).toBe(
      "/workspace/test-slug/assessments/questions/q-1/edit"
    )
  })

  it("maps mock tests to its workspace home", () => {
    expect(workspaceRoutes.toolHome("personal", "core.mock-tests")).toBe(
      "/workspace/personal/assessments"
    )
    expect(
      resolveToolDestination({
        workspaceSlug: "my workspace",
        toolKey: "core.mock-tests",
        catalogRoute: "/tools/mock-tests",
        installed: true,
      })
    ).toBe("/workspace/my%20workspace/assessments")
    expect(
      resolveToolDestination({
        workspaceSlug: "my workspace",
        toolKey: "core.mock-tests",
        catalogRoute: "/tools/mock-tests",
        installed: false,
      })
    ).toBe("/tools/mock-tests")
  })
})
