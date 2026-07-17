// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"

import { markdownToPlainText } from "@/lib/wiki/markdown"

describe("Markdown display helpers", () => {
  test("creates a compact plain-text preview without changing stored Markdown", () => {
    const markdown = [
      "## Ship the Arc",
      "",
      "- Keep **strict outcomes**",
      "- Link [the wiki](https://example.com)",
    ].join("\n")

    expect(markdownToPlainText(markdown)).toBe(
      "Ship the Arc Keep strict outcomes Link the wiki"
    )
    expect(markdown).toContain("**strict outcomes**")
  })
})
