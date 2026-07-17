import { isScalar, parseDocument, stringify, type Pair } from "yaml"

export const OKF_VERSION = "0.1" as const

export type OkfValue =
  | null
  | boolean
  | number
  | string
  | readonly OkfValue[]
  | { readonly [key: string]: OkfValue | undefined }

export type OkfFrontmatter = {
  readonly type: string
  readonly title?: string
  readonly description?: string
  readonly resource?: string
  readonly tags?: readonly string[]
  readonly timestamp?: string
  readonly [key: string]: OkfValue | undefined
}

export type OkfDocument = Readonly<{
  frontmatter: OkfFrontmatter
  body: string
}>

export type OkfErrorCode =
  | "missing_frontmatter"
  | "malformed_frontmatter"
  | "non_object_frontmatter"
  | "missing_type"

export class OkfValidationError extends Error {
  readonly code: OkfErrorCode

  constructor(code: OkfErrorCode, message: string) {
    super(message)
    this.name = "OkfValidationError"
    this.code = code
  }
}

const FRONTMATTER_KEY_ORDER = new Map(
  ["type", "title", "description", "resource", "tags", "timestamp"].map(
    (key, index) => [key, index]
  )
)

function keyText(pair: Pair): string {
  return isScalar(pair.key) ? String(pair.key.value) : String(pair.key)
}

function compareKeys(left: Pair, right: Pair): number {
  const leftKey = keyText(left)
  const rightKey = keyText(right)
  const fallbackRank = FRONTMATTER_KEY_ORDER.size
  const leftRank = FRONTMATTER_KEY_ORDER.get(leftKey) ?? fallbackRank
  const rightRank = FRONTMATTER_KEY_ORDER.get(rightKey) ?? fallbackRank

  if (leftRank !== rightRank) return leftRank - rightRank
  if (leftKey === rightKey) return 0
  return leftKey < rightKey ? -1 : 1
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n?/g, "\n")
}

export function normalizeOkfBody(body: string): string {
  const lines = normalizeLineEndings(body).split("\n")

  while (lines.length > 0 && lines[0].trim() === "") lines.shift()
  while (lines.length > 0 && lines.at(-1)?.trim() === "") lines.pop()

  return lines.join("\n")
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function assertFrontmatter(
  value: unknown
): asserts value is Record<string, unknown> & { type: string } {
  if (!isObjectRecord(value)) {
    throw new OkfValidationError(
      "non_object_frontmatter",
      "OKF frontmatter must be a YAML object."
    )
  }

  if (
    !Object.prototype.hasOwnProperty.call(value, "type") ||
    typeof value.type !== "string" ||
    value.type.trim() === ""
  ) {
    throw new OkfValidationError(
      "missing_type",
      "OKF frontmatter requires a non-empty type string."
    )
  }
}

export function serializeOkf(document: OkfDocument): string {
  assertFrontmatter(document.frontmatter)

  const yaml = stringify(document.frontmatter, {
    aliasDuplicateObjects: false,
    lineWidth: 0,
    sortMapEntries: compareKeys,
    version: "1.2",
  })
  const body = normalizeOkfBody(document.body)
  const frontmatter = `---\n${yaml}---\n`

  return body === "" ? frontmatter : `${frontmatter}\n${body}\n`
}

export function parseOkf(markdown: string): OkfDocument {
  const source = normalizeLineEndings(
    markdown.charCodeAt(0) === 0xfeff ? markdown.slice(1) : markdown
  )
  const lines = source.split("\n")

  if (lines[0] !== "---") {
    throw new OkfValidationError(
      "missing_frontmatter",
      "OKF documents must start with a YAML frontmatter block."
    )
  }

  const closingDelimiter = lines.indexOf("---", 1)
  if (closingDelimiter === -1) {
    throw new OkfValidationError(
      "malformed_frontmatter",
      "OKF frontmatter is missing its closing delimiter."
    )
  }

  const yamlSource = lines.slice(1, closingDelimiter).join("\n")
  const yamlDocument = parseDocument(yamlSource, {
    prettyErrors: true,
    schema: "core",
    strict: true,
    stringKeys: true,
    uniqueKeys: true,
    version: "1.2",
  })

  if (yamlDocument.errors.length > 0) {
    throw new OkfValidationError(
      "malformed_frontmatter",
      `Malformed OKF frontmatter: ${yamlDocument.errors[0].message}`
    )
  }

  let parsed: unknown
  try {
    parsed = yamlDocument.toJS({ maxAliasCount: 100 })
  } catch (error) {
    const detail = error instanceof Error ? error.message : "invalid YAML"
    throw new OkfValidationError(
      "malformed_frontmatter",
      `Malformed OKF frontmatter: ${detail}`
    )
  }

  assertFrontmatter(parsed)

  return {
    frontmatter: parsed as OkfFrontmatter,
    body: normalizeOkfBody(lines.slice(closingDelimiter + 1).join("\n")),
  }
}
