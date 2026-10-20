// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"

import {
  legacyMathToHtml,
  normalizeLegacyTex,
  parseDelimitedMath,
  tokenizeLegacyMath,
  tokenizeLegacyMathWithRanges,
} from "@/components/tools/mock-tests/editor/legacy-math"

describe("parseDelimitedMath", () => {
  test("recognizes a standalone display expression", () => {
    expect(parseDelimitedMath("$$x^2 + y^2$$")).toEqual({
      tex: "x^2 + y^2",
      display: true,
    })
  })

  test("recognizes inline expressions and surrounding whitespace", () => {
    expect(parseDelimitedMath("  $\\frac{a}{b}$  ")).toEqual({
      tex: "\\frac{a}{b}",
      display: false,
    })
  })

  test("supports multiline display expressions", () => {
    expect(
      parseDelimitedMath("$$\\begin{aligned}a\\\\b\\end{aligned}$$")
    ).toEqual({
      tex: "\\begin{aligned}a\\\\b\\end{aligned}",
      display: true,
    })
  })

  test("requires standalone delimiters and accepts explicitly delimited numbers", () => {
    expect(parseDelimitedMath("Question $$x^2$$")).toBeNull()
    expect(parseDelimitedMath("$10.50$")).toEqual({
      tex: "10.50",
      display: false,
    })
  })
})

describe("tokenizeLegacyMath", () => {
  test("splits inline math from surrounding prose", () => {
    expect(
      tokenizeLegacyMath("How many of the digits ${0, 1, 2}$ are even?")
    ).toEqual([
      "How many of the digits ",
      { tex: "{0, 1, 2}", display: false },
      " are even?",
    ])
  })

  test("treats display math first", () => {
    expect(tokenizeLegacyMath("Proof: $$x^2 + y^2 = z^2$$ done.")).toEqual([
      "Proof: ",
      { tex: "x^2 + y^2 = z^2", display: true },
      " done.",
    ])
  })

  test("leaves currency-style amounts alone", () => {
    expect(tokenizeLegacyMath("It costs $5 and the tax is $10.")).toEqual([
      "It costs $5 and the tax is $10.",
    ])
    expect(tokenizeLegacyMath("Exactly $10 in the budget")).toEqual([
      "Exactly $10 in the budget",
    ])
  })

  test("rejects delimiters padded with whitespace", () => {
    expect(tokenizeLegacyMath("value $ x $ here")).toEqual(["value $ x $ here"])
  })

  test("keeps scanning after a rejected match", () => {
    expect(tokenizeLegacyMath("$5 and $x$ remain")).toEqual([
      "$5 and ",
      { tex: "x", display: false },
      " remain",
    ])
  })
})

describe("normalizeLegacyTex", () => {
  test("escapes literal outer braces so KaTeX keeps them visible", () => {
    expect(normalizeLegacyTex("{0, 1, 2}")).toBe("\\{0, 1, 2\\}")
  })

  test("leaves real grouping math untouched", () => {
    expect(normalizeLegacyTex("\\frac{1}{2}")).toBe("\\frac{1}{2}")
    expect(normalizeLegacyTex("x = \\{1, 2\\}")).toBe("x = \\{1, 2\\}")
  })
})

describe("legacyMathToHtml", () => {
  test("renders inline math with KaTeX and escapes surrounding text", () => {
    const html = legacyMathToHtml("Set ${0, 1}$ & <script>alert(1)</script>")

    expect(html).toContain('<span class="math-inline">')
    expect(html).toContain('class="katex"')
    expect(html).toContain("&amp;")
    expect(html).toContain("&lt;script&gt;")
  })

  test("renders display math in a block wrapper", () => {
    const html = legacyMathToHtml("$$\\frac{1}{2}$$")

    expect(html).toContain('<span class="math-block">')
    expect(html).toContain('class="katex"')
    expect(html).not.toContain("\\frac{1}{2}")
  })

  test("returns null when nothing needs enhancing", () => {
    expect(legacyMathToHtml("plain text $5")).toBeNull()
    expect(legacyMathToHtml("no math here")).toBeNull()
  })

  test("does not throw on invalid TeX", () => {
    const html = legacyMathToHtml("$\\frac{}$")

    expect(html).toContain("katex-error")
  })
})

describe("balanced numeric and escaped delimiters", () => {
  test("renders numeric answer choices and adjacent unit equations", () => {
    expect(tokenizeLegacyMath("$100$ ns and $1$ $\\mu$s")).toEqual([
      "",
      { tex: "100", display: false },
      " ns and ",
      { tex: "1", display: false },
      " ",
      { tex: "\\mu", display: false },
      "s",
    ])
    expect(legacyMathToHtml("$100$ ns")).toContain('class="katex"')
  })
  test("keeps escaped currency and exposes exact source ranges", () => {
    const source = "Price \\$5; $100$ ns; $$x^2$$."
    const tokens = tokenizeLegacyMathWithRanges(source)
    expect(tokens.map((t) => source.slice(t.from, t.to))).toEqual([
      "$100$",
      "$$x^2$$",
    ])
    expect(tokenizeLegacyMath("Price \\$5 and $10")).toEqual([
      "Price \\$5 and $10",
    ])
  })
})
