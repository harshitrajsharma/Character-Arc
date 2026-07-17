// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"

import {
  buildArcMarkdownBody,
  buildArcOkfDocument,
  CHARACTER_ARC_SCHEMA_VERSION,
} from "../../lib/wiki/arc"

describe("Character Arc OKF helpers", () => {
  test("builds the stable Arc body in semantic order", () => {
    expect(
      buildArcMarkdownBody({
        objective: "  Publish the first release  ",
        currentReality: "The prototype works.",
        whyThisMatters: "It unlocks real feedback.",
        constraints: ["Two weeks", "Keep scope small\nNo new platform work"],
      })
    ).toBe(
      [
        "# Objective",
        "",
        "  Publish the first release  ",
        "",
        "# Current Reality",
        "",
        "The prototype works.",
        "",
        "# Why This Matters",
        "",
        "It unlocks real feedback.",
        "",
        "# Constraints",
        "",
        "- Two weeks",
        "- Keep scope small",
        "  No new platform work",
      ].join("\n")
    )
  })

  test("omits optional empty sections", () => {
    const body = buildArcMarkdownBody({
      objective: "Learn conversational Spanish",
      currentReality: "I know basic vocabulary.",
      why: "  ",
      constraints: ["", "   "],
    })

    expect(body).not.toContain("Why This Matters")
    expect(body).not.toContain("Constraints")
  })

  test("builds an OKF document with Arc producer fields", () => {
    const document = buildArcOkfDocument({
      objective: "Run a half marathon",
      currentReality: "I can run five kilometers.",
      title: "Half marathon arc",
      description: "Build endurance for a first half marathon.",
      tags: ["fitness", "running"],
      timestamp: "2026-07-17T10:00:00Z",
      targetDate: "2026-12-01",
      privacy: "private",
      cloudBlockId: "block-123",
      extensions: {
        producer: "Character Arc",
        type: "Must not override Arc type",
        schema_version: 99,
      },
    })

    expect(document.frontmatter).toEqual({
      producer: "Character Arc",
      type: "Character Arc",
      schema_version: CHARACTER_ARC_SCHEMA_VERSION,
      title: "Half marathon arc",
      description: "Build endurance for a first half marathon.",
      tags: ["fitness", "running"],
      timestamp: "2026-07-17T10:00:00Z",
      target_date: "2026-12-01",
      privacy: "private",
      cloud_block_id: "block-123",
    })
  })

  test("requires meaningful Objective and Current Reality content", () => {
    expect(() =>
      buildArcMarkdownBody({ objective: " ", currentReality: "Starting" })
    ).toThrow("Objective must be a non-empty string.")
    expect(() =>
      buildArcMarkdownBody({ objective: "Grow", currentReality: "\n\n" })
    ).toThrow("Current reality must be a non-empty string.")
  })
})
