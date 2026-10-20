// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, it } from "bun:test"
import {
  formatOptionsToUnifiedText,
  parseUnifiedTextToOptions,
} from "@/components/tools/mock-tests/editor/unified-option-parser"

describe("parseUnifiedTextToOptions", () => {
  it("round-trips four empty default options without swallowing adjacent markers", () => {
    const options = ["A", "B", "C", "D"].map((key) => ({ key, content: "" }))
    const formatted = formatOptionsToUnifiedText(options)
    const result = parseUnifiedTextToOptions(formatted)
    expect(result.options).toEqual(options)
    expect(result.answerKeys).toEqual([])
    expect(
      parseUnifiedTextToOptions(formatOptionsToUnifiedText(result.options))
    ).toEqual(result)
  })

  it("keeps empty options with CRLF, tabs, and a final marker without trailing whitespace", () => {
    const result = parseUnifiedTextToOptions(
      "A)\r\n\tB) \r\n C)\t\r\nD)\r\n\r\nCorrect: B, D"
    )
    expect(result.options).toEqual([
      { key: "A", content: "" },
      { key: "B", content: "" },
      { key: "C", content: "" },
      { key: "D", content: "" },
    ])
    expect(result.answerKeys).toEqual(["B", "D"])
  })

  it("preserves multiline math and blank siblings when formatting repeatedly", () => {
    const options = [
      {
        key: "A",
        content:
          "First line\n$$\\begin{aligned}\nx &= 2 \\\\\ny &= 3\n\\end{aligned}$$",
      },
      { key: "B", content: "" },
      { key: "C", content: "A second answer\nwith supporting text" },
      { key: "D", content: "" },
    ]
    const result = parseUnifiedTextToOptions(
      formatOptionsToUnifiedText(options, ["A", "C"])
    )
    expect(result.options).toEqual(options)
    expect(result.answerKeys).toEqual(["A", "C"])
  })

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
