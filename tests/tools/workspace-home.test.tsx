// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { WorkspaceHomeView } from "@/components/workspace/workspace-home"
import type { WorkspaceHomeData } from "@/lib/workspaces/workspace-home"
import {
  getLearningDestinations,
  getNavbarDestinations,
  isNavbarDestinationActive,
  resolveNavigationWorkspace,
} from "@/components/navigation/navbar-data"

const data: WorkspaceHomeData = {
  workspace: {
    id: "workspace",
    userId: "owner",
    name: "Learning",
    slug: "my space",
    kind: "PERSONAL",
    role: "OWNER",
    timezone: "Asia/Kolkata",
  },
  installations: [],
  hasExamPrep: true,
  hasAssessments: true,
  activeAttempt: null,
  exams: [
    {
      id: "exam",
      title: "GATE DA",
      code: "DA",
      subjects: [{ id: "subject", title: "Linear Algebra" }],
    },
  ],
  papers: [
    {
      id: "draft",
      title: "My draft",
      status: "DRAFT",
      questionCount: 30,
      durationMinutes: 90,
    },
  ],
  attempts: [
    {
      id: "result",
      title: "My completed test",
      status: "evaluated",
      score: 0,
      maxScore: 60,
      startedAt: "2026-11-10T00:00:00.000Z",
    },
  ],
}

describe("workspace-first navigation", () => {
  test("has one home and exposes only installed learning destinations", () => {
    expect(getNavbarDestinations("my space").map((item) => item.key)).toEqual([
      "workspace",
      "tools",
    ])
    expect(getNavbarDestinations()[0].href).toBe("/workspace")
    expect(
      getLearningDestinations("my space", []).map((item) => item.key)
    ).toEqual(["workspace"])
    const destinations = getLearningDestinations("my space", [
      "core.exam-prep",
      "core.mock-tests",
    ])
    expect(destinations.map((item) => item.key)).toEqual([
      "workspace",
      "exam-prep",
      "assessments",
    ])
    expect(destinations[1].href).toBe("/workspace/my%20space/exam-prep")
    expect(
      isNavbarDestinationActive(
        "/workspace/my%20space/exam-prep/exam/subjects/subject",
        destinations[1]
      )
    ).toBe(true)
    expect(
      isNavbarDestinationActive(
        "/workspace/my%20space/exam-prep-extra",
        destinations[1]
      )
    ).toBe(false)
    expect(
      isNavbarDestinationActive(
        "/workspace/my%20space/exam-prep",
        destinations[0]
      )
    ).toBe(false)
  })

  test("preserves selected workspace metadata for installation and role filtering", () => {
    const selected = resolveNavigationWorkspace(
      "/workspace/second/assessments",
      [
        { slug: "first", role: "OWNER" },
        { slug: "second", role: "VIEWER" },
      ]
    )
    expect(selected?.role).toBe("VIEWER")
  })
})

describe("workspace home outcomes", () => {
  test("opens subjects and draft builders directly while preserving zero scores", () => {
    const html = renderToStaticMarkup(<WorkspaceHomeView data={data} />)
    expect(html).toContain(
      "/workspace/my%20space/exam-prep/exam/subjects/subject"
    )
    expect(html).toContain("subjects/subject?stage=test")
    expect(html).toContain("/workspace/my%20space/assessments/draft/edit")
    expect(html).toContain("tab=community")
    expect(html).toContain("tab=attempts")
    expect(html).toContain("0 / 60")
    expect(html).not.toContain("Today")
    expect(html).not.toContain("Goals &amp; Paths")
  })

  test("read-only members do not receive create or edit commands", () => {
    const html = renderToStaticMarkup(
      <WorkspaceHomeView
        data={{ ...data, workspace: { ...data.workspace, role: "VIEWER" } }}
      />
    )
    expect(html).not.toContain("Create assessment")
    expect(html).not.toContain("New exam")
    expect(html).not.toContain("/assessments/draft/edit")
    expect(html).toContain("/assessments/draft")
  })

  test("missing tools have setup guidance instead of dead tool links", () => {
    const html = renderToStaticMarkup(
      <WorkspaceHomeView
        data={{
          ...data,
          hasExamPrep: false,
          hasAssessments: false,
          exams: [],
          papers: [],
          attempts: [],
        }}
      />
    )
    expect(html).toContain("Set up your learning workspace")
    expect(html).toContain('href="/tools"')
    expect(html).not.toContain('href="/workspace/my%20space/assessments')
    expect(html).not.toContain('href="/workspace/my%20space/exam-prep')
  })

  test("continuation uses an existing attempt and explains the running timer", () => {
    const html = renderToStaticMarkup(
      <WorkspaceHomeView
        data={{
          ...data,
          activeAttempt: { id: "ongoing", title: "Current test" },
        }}
      />
    )
    expect(html).toContain('href="/assessments/ongoing"')
    expect(html).toContain("The timer continues")
    expect(html).not.toContain("attempts/new")
  })

  test("pending and abandoned attempts have no unavailable review destination", () => {
    const html = renderToStaticMarkup(
      <WorkspaceHomeView
        data={{
          ...data,
          attempts: [
            {
              ...data.attempts[0],
              id: "pending",
              status: "submitted",
              score: null,
            },
            {
              ...data.attempts[0],
              id: "abandoned",
              status: "abandoned",
              score: null,
            },
          ],
        }}
      />
    )
    expect(html).toContain("Awaiting evaluation")
    expect(html).toContain("Not completed")
    expect(html).not.toContain("/attempts/pending/analysis")
    expect(html).not.toContain("/attempts/abandoned/analysis")
  })

  test("read-only access cannot resume either a pinned or recent attempt", () => {
    const html = renderToStaticMarkup(
      <WorkspaceHomeView
        data={{
          ...data,
          workspace: { ...data.workspace, role: "VIEWER" },
          activeAttempt: { id: "pinned", title: "Pinned test" },
          attempts: [
            { ...data.attempts[0], id: "active", status: "in_progress" },
          ],
        }}
      />
    )
    expect(html).toContain("read-only")
    expect(html).not.toContain('href="/assessments/pinned"')
    expect(html).not.toContain('href="/assessments/active"')
  })
})
