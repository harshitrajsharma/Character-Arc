// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"

import {
  OkfValidationError,
  parseOkf,
  serializeOkf,
  type OkfErrorCode,
} from "../../lib/wiki/okf"

const INVALID_DOCUMENTS: ReadonlyArray<
  readonly [label: string, source: string, code: OkfErrorCode]
> = [
  ["missing frontmatter", "# Body", "missing_frontmatter"],
  ["missing delimiter", "---\ntype: Note", "malformed_frontmatter"],
  ["malformed YAML", "---\ntype: [broken\n---", "malformed_frontmatter"],
  ["scalar frontmatter", "---\nhello\n---", "non_object_frontmatter"],
  ["array frontmatter", "---\n- type\n- Note\n---", "non_object_frontmatter"],
  ["missing type", "---\ntitle: Untyped\n---", "missing_type"],
  ["blank type", '---\ntype: "  "\n---', "missing_type"],
]

describe("OKF v0.1 serialization", () => {
  test("serializes deterministically with recommended fields first", () => {
    const markdown = serializeOkf({
      frontmatter: {
        z_extension: { z: 2, a: 1 },
        tags: ["growth", "career"],
        title: "Lead with confidence",
        type: "Character Arc",
        a_extension: true,
      },
      body: "\r\n\r\n# Héllo\r\n\r\n世界\r\n\r\n",
    })

    expect(markdown).toBe(
      [
        "---",
        "type: Character Arc",
        "title: Lead with confidence",
        "tags:",
        "  - growth",
        "  - career",
        "a_extension: true",
        "z_extension:",
        "  a: 1",
        "  z: 2",
        "---",
        "",
        "# Héllo",
        "",
        "世界",
        "",
      ].join("\n")
    )
  })

  test("preserves unknown frontmatter through parse and round-trip", () => {
    const source = [
      "---",
      "type: Playbook",
      "producer:",
      "  name: Character Arc",
      "  flags: [private, synced]",
      "revision: 7",
      "---",
      "",
      "Body",
      "",
    ].join("\r\n")

    const parsed = parseOkf(source)

    expect(parsed).toEqual({
      frontmatter: {
        type: "Playbook",
        producer: {
          name: "Character Arc",
          flags: ["private", "synced"],
        },
        revision: 7,
      },
      body: "Body",
    })
    expect(parseOkf(serializeOkf(parsed))).toEqual(parsed)
  })

  test("normalizes frontmatter-to-body separation", () => {
    const parsed = parseOkf("---\ntype: Note\n---\n\n\n  \nText\n\n")

    expect(parsed.body).toBe("Text")
    expect(serializeOkf(parsed)).toBe("---\ntype: Note\n---\n\nText\n")
  })

  for (const [label, source, code] of INVALID_DOCUMENTS) {
    test(`rejects ${label}`, () => {
      try {
        parseOkf(source)
        throw new Error("Expected parseOkf to reject the document")
      } catch (error) {
        expect(error).toBeInstanceOf(OkfValidationError)
        expect((error as OkfValidationError).code).toBe(code)
      }
    })
  }

  test("rejects a missing type during serialization", () => {
    expect(() =>
      serializeOkf({
        frontmatter: {} as never,
        body: "Body",
      })
    ).toThrow(OkfValidationError)
  })
})
