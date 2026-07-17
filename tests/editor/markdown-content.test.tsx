// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

import { MarkdownContent } from "@/components/editor/markdown-content"

function render(markdown: string) {
  return renderToStaticMarkup(<MarkdownContent markdown={markdown} />)
}

describe("MarkdownContent", () => {
  test("renders the editor's core block and inline Markdown", () => {
    const html = render(
      [
        "## Build **carefully**",
        "",
        "Keep *context* in [the wiki](https://example.com/docs).",
        "",
        "- First item",
        "- Second `item`",
        "",
        "3. Third",
        "4. Fourth",
      ].join("\n")
    )

    expect(html).toContain("<h2")
    expect(html).toContain("Build <strong")
    expect(html).toContain("<em>context</em>")
    expect(html).toContain('href="https://example.com/docs"')
    expect(html).toContain("<ul")
    expect(html).toContain('<ol start="3"')
    expect(html).toContain("<code")
  })

  test("preserves and labels fenced code without interpreting Markdown", () => {
    const html = render("```ts\nconst value = '<safe>'\n**not strong**\n```")

    expect(html).toContain('data-language="ts"')
    expect(html).toContain("const value = &#x27;&lt;safe&gt;&#x27;")
    expect(html).toContain("**not strong**")
    expect(html).not.toContain("<strong")
  })

  test("keeps raw HTML inert and rejects unsafe link schemes", () => {
    const html = render(
      '<script>alert("x")</script> [unsafe](javascript:alert(1)) [safe](/wiki/start)'
    )

    expect(html).toContain("&lt;script&gt;")
    expect(html).not.toContain("<script>")
    expect(html).not.toContain("javascript:")
    expect(html).toContain(">unsafe</span>")
    expect(html).toContain('href="/wiki/start"')
  })
})
