// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, it } from "bun:test"
import {
  formatOptionsToUnifiedText,
  parseUnifiedTextToOptions,
} from "@/components/tools/mock-tests/editor/unified-option-parser"

describe("parseUnifiedTextToOptions", () => {
  it("parses standard A) B) C) D) format with math", () => {
    const input = `
      A) $\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$
      B) $\\frac{-b \\pm \\sqrt{b^2 + 4ac}}{2a}$
      C) $\\frac{b \\pm \\sqrt{b^2 - 4ac}}{2a}$
      D) None of the above
      
      Answer: A
    `
    const result = parseUnifiedTextToOptions(input)
    expect(result.options.length).toBe(4)
    expect(result.options[0].key).toBe("A")
    expect(result.options[0].content).toContain("\\frac{-b")
    expect(result.options[1].key).toBe("B")
    expect(result.options[3].content).toBe("None of the above")
    expect(result.answerKeys).toEqual(["A"])
  })

  it("parses parenthesized (A) (B) (C) format with multiple correct keys", () => {
    const input = `
      (A) $O(1)$ constant time
      (B) $O(\\log N)$ logarithmic time
      (C) $O(N)$ linear time
      (D) $O(N^2)$ quadratic time

      Correct Answer: A, B
    `
    const result = parseUnifiedTextToOptions(input)
    expect(result.options.length).toBe(4)
    expect(result.options[0].content).toBe("$O(1)$ constant time")
    expect(result.options[1].content).toBe("$O(\\log N)$ logarithmic time")
    expect(result.answerKeys).toEqual(["A", "B"])
  })

  it("parses numbered 1. 2. 3. 4. format and maps answer numbers to letters", () => {
    const input = `
      1. Primary storage
      2. Secondary storage
      3. Cache memory
      4. Virtual memory
      
      Key: 2
    `
    const result = parseUnifiedTextToOptions(input)
    expect(result.options.length).toBe(4)
    expect(result.options[0].key).toBe("A")
    expect(result.options[0].content).toBe("Primary storage")
    expect(result.options[1].key).toBe("B")
    expect(result.options[1].content).toBe("Secondary storage")
    expect(result.answerKeys).toEqual(["B"])
  })

  it("parses plain line-by-line text without explicit prefixes", () => {
    const input = `
      First candidate
      Second candidate
      Third candidate
      Fourth candidate
    `
    const result = parseUnifiedTextToOptions(input)
    expect(result.options.length).toBe(4)
    expect(result.options[0].content).toBe("First candidate")
    expect(result.options[3].content).toBe("Fourth candidate")
    expect(result.answerKeys).toEqual([])
  })

  it("formats structured options back into unified text", () => {
    const options = [
      { key: "A", content: "$x^2$" },
      { key: "B", content: "$y^2$" },
    ]
    const text = formatOptionsToUnifiedText(options, ["A"])
    expect(text).toContain("A) $x^2$")
    expect(text).toContain("B) $y^2$")
    expect(text).toContain("Correct: A")
  })
})
