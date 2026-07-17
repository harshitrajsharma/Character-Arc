import type { OkfDocument, OkfFrontmatter, OkfValue } from "./okf"

export const CHARACTER_ARC_TYPE = "Character Arc" as const
export const CHARACTER_ARC_SCHEMA_VERSION = 1 as const

export type ArcBodyInput = Readonly<{
  objective: string
  currentReality: string
  whyThisMatters?: string | null
  why?: string | null
  constraints?: readonly string[] | null
}>

export type ArcOkfInput = ArcBodyInput &
  Readonly<{
    title?: string
    description?: string
    resource?: string
    tags?: readonly string[]
    timestamp?: string
    schemaVersion?: string | number
    targetDate?: string | null
    privacy?: string | null
    cloudBlockId?: string | null
    extensions?: Readonly<Record<string, OkfValue | undefined>>
  }>

function normalizeSection(value: string, name: string): string {
  const lines = value.replace(/\r\n?/g, "\n").split("\n")

  while (lines.length > 0 && lines[0].trim() === "") lines.shift()
  while (lines.length > 0 && lines.at(-1)?.trim() === "") lines.pop()

  const normalized = lines.join("\n")
  if (normalized.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string.`)
  }

  return normalized
}

function optionalSection(value: string | null | undefined): string | null {
  if (value == null || value.trim() === "") return null
  return normalizeSection(value, "Optional Arc section")
}

function formatConstraint(value: string): string | null {
  if (value.trim() === "") return null

  const lines = normalizeSection(value, "Constraint").split("\n")
  return [`- ${lines[0]}`, ...lines.slice(1).map((line) => `  ${line}`)].join(
    "\n"
  )
}

export function buildArcMarkdownBody(input: ArcBodyInput): string {
  const sections = [
    `# Objective\n\n${normalizeSection(input.objective, "Objective")}`,
    `# Current Reality\n\n${normalizeSection(
      input.currentReality,
      "Current reality"
    )}`,
  ]
  const why = optionalSection(input.whyThisMatters ?? input.why)
  if (why) sections.push(`# Why This Matters\n\n${why}`)

  const constraints = (input.constraints ?? [])
    .map(formatConstraint)
    .filter((constraint): constraint is string => constraint !== null)
  if (constraints.length > 0) {
    sections.push(`# Constraints\n\n${constraints.join("\n")}`)
  }

  return sections.join("\n\n")
}

export function buildArcOkfDocument(input: ArcOkfInput): OkfDocument {
  const frontmatter: OkfFrontmatter = {
    ...input.extensions,
    type: CHARACTER_ARC_TYPE,
    schema_version: input.schemaVersion ?? CHARACTER_ARC_SCHEMA_VERSION,
    ...(input.title !== undefined && { title: input.title }),
    ...(input.description !== undefined && {
      description: input.description,
    }),
    ...(input.resource !== undefined && { resource: input.resource }),
    ...(input.tags !== undefined && { tags: input.tags }),
    ...(input.timestamp !== undefined && { timestamp: input.timestamp }),
    ...(input.targetDate != null && { target_date: input.targetDate }),
    ...(input.privacy != null && { privacy: input.privacy }),
    ...(input.cloudBlockId != null && {
      cloud_block_id: input.cloudBlockId,
    }),
  }

  return {
    frontmatter,
    body: buildArcMarkdownBody(input),
  }
}
