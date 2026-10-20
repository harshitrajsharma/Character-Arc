// @ts-expect-error Bun provides this module at runtime.
import { describe, expect, test } from "bun:test"
import { hasRichContent } from "@/components/tools/mock-tests/editor/html-utils"
describe("rich authoring content", () => {
  test("accepts equation-only and image-only content", () => {
    expect(
      hasRichContent(
        '<p><span data-math-inline="true" data-tex="x^2"></span></p>'
      )
    ).toBe(true)
    expect(
      hasRichContent('<div data-tex="100" data-math-block="true"></div>')
    ).toBe(true)
    expect(
      hasRichContent('<img src="/api/question-images/example" alt="Diagram">')
    ).toBe(true)
  })
  test("rejects empty paragraphs and empty nodes", () => {
    expect(hasRichContent("<p><br></p>")).toBe(false)
    expect(
      hasRichContent('<span data-math-inline="true" data-tex=""></span>')
    ).toBe(false)
  })
})
