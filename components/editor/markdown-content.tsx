import type { ComponentPropsWithoutRef, ReactNode } from "react"

import { cn } from "@/lib/utils"

type InlineNode =
  | { type: "text"; value: string }
  | { type: "code"; value: string }
  | { type: "emphasis"; children: InlineNode[] }
  | { type: "strong"; children: InlineNode[] }
  | { type: "link"; href: string | null; children: InlineNode[] }

type MarkdownBlock =
  | { type: "heading"; level: number; children: InlineNode[] }
  | { type: "paragraph"; children: InlineNode[] }
  | { type: "code"; language?: string; value: string }
  | {
      type: "list"
      ordered: boolean
      start?: number
      items: InlineNode[][]
    }

export type MarkdownContentProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> & {
  markdown: string
}

const headingClasses = [
  "text-2xl font-semibold leading-tight",
  "text-xl font-semibold leading-tight",
  "text-lg font-semibold leading-snug",
  "text-base font-semibold leading-snug",
  "text-sm font-semibold leading-snug",
  "text-sm font-semibold leading-snug",
] as const

const blockStartPattern =
  /^(?: {0,3}#{1,6}(?:[ \t]+|$)| {0,3}(?:`{3,}|~{3,})| {0,3}(?:[-+*]|\d+[.)])[ \t]+)/

function appendText(nodes: InlineNode[], value: string) {
  if (!value) {
    return
  }

  const previous = nodes.at(-1)

  if (previous?.type === "text") {
    previous.value += value
  } else {
    nodes.push({ type: "text", value })
  }
}

function isEscaped(value: string, index: number) {
  let backslashes = 0

  for (
    let cursor = index - 1;
    cursor >= 0 && value[cursor] === "\\";
    cursor--
  ) {
    backslashes++
  }

  return backslashes % 2 === 1
}

function findClosingDelimiter(value: string, delimiter: string, from: number) {
  let cursor = value.indexOf(delimiter, from)

  while (cursor !== -1) {
    if (!isEscaped(value, cursor) && !/\s/.test(value[cursor - 1] ?? "")) {
      return cursor
    }

    cursor = value.indexOf(delimiter, cursor + delimiter.length)
  }

  return -1
}

function readLink(value: string, from: number) {
  if (from > 0 && value[from - 1] === "!") {
    return null
  }

  let labelEnd = from + 1

  while (labelEnd < value.length) {
    if (value[labelEnd] === "]" && !isEscaped(value, labelEnd)) {
      break
    }

    labelEnd++
  }

  if (labelEnd >= value.length || value[labelEnd + 1] !== "(") {
    return null
  }

  let depth = 1
  let destinationEnd = labelEnd + 2

  while (destinationEnd < value.length && depth > 0) {
    const character = value[destinationEnd]

    if (!isEscaped(value, destinationEnd)) {
      if (character === "(") {
        depth++
      } else if (character === ")") {
        depth--
      }
    }

    destinationEnd++
  }

  if (depth !== 0) {
    return null
  }

  const rawDestination = value.slice(labelEnd + 2, destinationEnd - 1).trim()
  const destination = rawDestination.startsWith("<")
    ? rawDestination.match(/^<([^>]*)>(?:\s+.*)?$/)?.[1]
    : rawDestination.match(/^(\S+)(?:\s+.*)?$/)?.[1]

  if (destination === undefined) {
    return null
  }

  return {
    end: destinationEnd,
    label: value.slice(from + 1, labelEnd),
    destination: destination.replace(/\\([\\()])/g, "$1"),
  }
}

function safeHref(href: string) {
  const normalized = href.trim()

  if (!normalized || /[\u0000-\u001f\u007f]/.test(normalized)) {
    return null
  }

  if (/^(?:#|\/|\.\/|\.\.\/|\?)/.test(normalized)) {
    return normalized
  }

  const scheme = normalized.match(/^([a-z][a-z\d+.-]*):/i)?.[1]

  if (!scheme) {
    return normalized
  }

  return ["http", "https", "mailto", "tel"].includes(scheme.toLowerCase())
    ? normalized
    : null
}

function parseInline(value: string): InlineNode[] {
  const nodes: InlineNode[] = []
  let cursor = 0

  while (cursor < value.length) {
    const character = value[cursor]

    if (character === "\\" && cursor + 1 < value.length) {
      appendText(nodes, value[cursor + 1])
      cursor += 2
      continue
    }

    if (character === "`") {
      let runLength = 1

      while (value[cursor + runLength] === "`") {
        runLength++
      }

      const delimiter = "`".repeat(runLength)
      const closing = value.indexOf(delimiter, cursor + runLength)

      if (closing !== -1) {
        let code = value
          .slice(cursor + runLength, closing)
          .replace(/\s*\n\s*/g, " ")

        if (/^\s[\s\S]*\s$/.test(code) && !/^\s+$/.test(code)) {
          code = code.slice(1, -1)
        }

        nodes.push({ type: "code", value: code })
        cursor = closing + runLength
        continue
      }
    }

    if (character === "[") {
      const link = readLink(value, cursor)

      if (link) {
        nodes.push({
          type: "link",
          href: safeHref(link.destination),
          children: parseInline(link.label),
        })
        cursor = link.end
        continue
      }
    }

    const strongDelimiter = value.startsWith("**", cursor)
      ? "**"
      : value.startsWith("__", cursor)
        ? "__"
        : null

    if (strongDelimiter && !/\s/.test(value[cursor + 2] ?? "")) {
      const closing = findClosingDelimiter(
        value,
        strongDelimiter,
        cursor + strongDelimiter.length
      )

      if (closing !== -1) {
        nodes.push({
          type: "strong",
          children: parseInline(
            value.slice(cursor + strongDelimiter.length, closing)
          ),
        })
        cursor = closing + strongDelimiter.length
        continue
      }
    }

    if (character === "*" || character === "_") {
      const previous = value[cursor - 1]
      const next = value[cursor + 1]
      const intrawordUnderscore =
        character === "_" && /[\p{L}\p{N}]/u.test(previous ?? "")

      if (next && !/\s/.test(next) && !intrawordUnderscore) {
        const closing = findClosingDelimiter(value, character, cursor + 1)

        if (closing !== -1) {
          nodes.push({
            type: "emphasis",
            children: parseInline(value.slice(cursor + 1, closing)),
          })
          cursor = closing + 1
          continue
        }
      }
    }

    appendText(nodes, character)
    cursor++
  }

  return nodes
}

function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n")
  const blocks: MarkdownBlock[] = []
  let cursor = 0

  while (cursor < lines.length) {
    const line = lines[cursor]

    if (!line.trim()) {
      cursor++
      continue
    }

    const fence = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*([^`~]*)$/)

    if (fence) {
      const marker = fence[1]
      const closingPattern = new RegExp(
        `^ {0,3}${marker[0] === "`" ? "`" : "~"}{${marker.length},}[ \\t]*$`
      )
      const codeLines: string[] = []
      cursor++

      while (cursor < lines.length && !closingPattern.test(lines[cursor])) {
        codeLines.push(lines[cursor])
        cursor++
      }

      if (cursor < lines.length) {
        cursor++
      }

      blocks.push({
        type: "code",
        language: fence[2].trim().split(/\s+/)[0] || undefined,
        value: codeLines.join("\n"),
      })
      continue
    }

    const heading = line.match(/^ {0,3}(#{1,6})(?:[ \t]+|$)(.*)$/)

    if (heading) {
      const content = heading[2].replace(/[ \t]+#+[ \t]*$/, "").trim()
      blocks.push({
        type: "heading",
        level: heading[1].length,
        children: parseInline(content),
      })
      cursor++
      continue
    }

    const listItem = line.match(/^ {0,3}([-+*]|(\d+)[.)])[ \t]+(.*?)[ \t]*$/)

    if (listItem) {
      const ordered = Boolean(listItem[2])
      const items: InlineNode[][] = []
      const start = ordered ? Number(listItem[2]) : undefined

      while (cursor < lines.length) {
        const item = lines[cursor].match(
          /^ {0,3}([-+*]|(\d+)[.)])[ \t]+(.*?)[ \t]*$/
        )

        if (!item || Boolean(item[2]) !== ordered) {
          break
        }

        items.push(parseInline(item[3]))
        cursor++

        while (!lines[cursor]?.trim() && cursor < lines.length) {
          const nextItem = lines[cursor + 1]?.match(
            /^ {0,3}([-+*]|(\d+)[.)])[ \t]+(.*?)[ \t]*$/
          )

          if (nextItem && Boolean(nextItem[2]) === ordered) {
            cursor++
          } else {
            break
          }
        }
      }

      blocks.push({ type: "list", ordered, start, items })
      continue
    }

    const paragraphLines = [line.trim()]
    cursor++

    while (
      cursor < lines.length &&
      lines[cursor].trim() &&
      !blockStartPattern.test(lines[cursor])
    ) {
      paragraphLines.push(lines[cursor].trim())
      cursor++
    }

    blocks.push({
      type: "paragraph",
      children: parseInline(paragraphLines.join(" ")),
    })
  }

  return blocks
}

function renderInline(nodes: InlineNode[]): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${node.type}-${index}`

    switch (node.type) {
      case "text":
        return node.value
      case "code":
        return (
          <code
            key={key}
            className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.875em] text-foreground"
          >
            {node.value}
          </code>
        )
      case "emphasis":
        return <em key={key}>{renderInline(node.children)}</em>
      case "strong":
        return (
          <strong key={key} className="font-semibold">
            {renderInline(node.children)}
          </strong>
        )
      case "link": {
        const children = renderInline(node.children)

        return node.href ? (
          <a
            key={key}
            href={node.href}
            className="font-medium text-primary underline decoration-border underline-offset-4 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {children}
          </a>
        ) : (
          <span key={key}>{children}</span>
        )
      }
    }
  })
}

function renderBlock(block: MarkdownBlock, index: number) {
  const key = `${block.type}-${index}`

  switch (block.type) {
    case "heading": {
      const Tag = `h${block.level}` as keyof React.JSX.IntrinsicElements

      return (
        <Tag key={key} className={headingClasses[block.level - 1]}>
          {renderInline(block.children)}
        </Tag>
      )
    }
    case "paragraph":
      return <p key={key}>{renderInline(block.children)}</p>
    case "code":
      return (
        <pre
          key={key}
          className="max-w-full overflow-x-auto rounded-md border border-border bg-muted p-4 text-sm leading-6 text-foreground"
        >
          <code
            className="font-mono"
            data-language={block.language || undefined}
          >
            {block.value}
          </code>
        </pre>
      )
    case "list": {
      const Tag = block.ordered ? "ol" : "ul"

      return (
        <Tag
          key={key}
          start={block.ordered && block.start !== 1 ? block.start : undefined}
          className={cn(
            "ml-6 list-outside space-y-1 marker:text-muted-foreground",
            block.ordered ? "list-decimal" : "list-disc"
          )}
        >
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </Tag>
      )
    }
  }
}

export function MarkdownContent({
  markdown,
  className,
  ...props
}: MarkdownContentProps) {
  const blocks = parseMarkdown(markdown)

  return (
    <div
      className={cn(
        "min-w-0 text-sm leading-7 text-foreground [&>*+*]:mt-4",
        className
      )}
      {...props}
    >
      {blocks.map(renderBlock)}
    </div>
  )
}
