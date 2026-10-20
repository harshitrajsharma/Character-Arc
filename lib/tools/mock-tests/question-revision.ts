type RevisionContent = {
  stem: string
  kind: string
  options?: Array<{ key: string; content: string; position?: number }>
  answerKeys?: string[]
  explanation?: string | null
  numericAnswer?: number | null
  textAnswer?: string | null
}

function decodeAttribute(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",
    nbsp: " ",
  }
  return value.replace(
    /&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi,
    (entity, key: string) => {
      if (!key.startsWith("#")) return named[key.toLowerCase()] ?? entity
      const code =
        key[1].toLowerCase() === "x"
          ? parseInt(key.slice(2), 16)
          : parseInt(key.slice(1), 10)
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : entity
    }
  )
}

/** Only normalize editor serialization, never discard arbitrary formatting or media. */
export function canonicalQuestionContent(
  value: string | null | undefined
): string {
  const atoms = (value ?? "").replace(
    /<(span|div)\b([^>]*)>\s*<\/\1>/gi,
    (whole, tag: string, attrs: string) => {
      const display = /\bdata-math-block\s*=\s*["']true["']/i.test(attrs)
      const inline = /\bdata-math-inline\s*=\s*["']true["']/i.test(attrs)
      if (
        (display && tag.toLowerCase() !== "div") ||
        (inline && tag.toLowerCase() !== "span") ||
        display === inline
      )
        return whole
      const attributes = [
        ...attrs.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g),
      ]
      if (attrs.replace(/([\w:-]+)\s*=\s*(?:"[^"]*"|'[^']*')/g, "").trim()) return whole
      if (
        attributes.some(
          (attribute) =>
            ![
              "data-tex",
              "data-math-inline",
              "data-math-block",
              "class",
            ].includes(attribute[1].toLowerCase()) ||
            (attribute[1].toLowerCase() === "class" &&
              (attribute[2] ?? attribute[3]) !==
                `math-${display ? "block" : "inline"}`)
        )
      )
        return whole
      const tex = /\bdata-tex\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs)
      if (!tex) return whole
      const delimiter = display ? "$$" : "$"
      return `${delimiter}${decodeAttribute(tex[1] ?? tex[2]).trim()}${delimiter}`
    }
  )
  const paragraphs = atoms
    .replace(/<p\s*>([\s\S]*?)<\/p>/gi, "$1\n")
    .replace(/<br\s*\/?\s*>/gi, "\n")
  return paragraphs
    .split(/(<[^>]+>)/g)
    .map((part) => (part.startsWith("<") ? part : part.replace(/\s+/g, " ")))
    .join("")
    .trim()
}

export function equivalentQuestionRevision(
  previous: RevisionContent,
  next: RevisionContent
): boolean {
  if (
    previous.kind !== next.kind ||
    canonicalQuestionContent(previous.stem) !==
      canonicalQuestionContent(next.stem)
  )
    return false
  if (
    canonicalQuestionContent(previous.explanation) !==
    canonicalQuestionContent(next.explanation)
  )
    return false
  if (
    (previous.numericAnswer ?? null) !== (next.numericAnswer ?? null) ||
    (previous.textAnswer ?? null) !== (next.textAnswer ?? null)
  )
    return false
  const options = (value: RevisionContent) =>
    (value.options ?? [])
      .map((option, index) => ({
        key: option.key,
        content: canonicalQuestionContent(option.content),
        position: option.position ?? index,
      }))
      .sort((a, b) => a.key.localeCompare(b.key))
  if (JSON.stringify(options(previous)) !== JSON.stringify(options(next)))
    return false
  return (
    JSON.stringify([...(previous.answerKeys ?? [])].sort()) ===
    JSON.stringify([...(next.answerKeys ?? [])].sort())
  )
}
