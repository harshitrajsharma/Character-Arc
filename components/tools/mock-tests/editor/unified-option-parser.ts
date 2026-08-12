export interface ParsedOption {
  key: string
  content: string
}

export interface UnifiedParseResult {
  options: ParsedOption[]
  answerKeys: string[]
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

function optionLetter(index: number): string {
  return LETTERS[index] ?? `Q${index + 1}`
}

/**
 * Format structured options + answer keys into unified authoring text.
 */
export function formatOptionsToUnifiedText(
  options: Array<{ key: string; content: string }>,
  answerKeys: string[] = []
): string {
  const lines: string[] = options.map((opt) => `${opt.key}) ${opt.content}`)
  if (answerKeys.length > 0) {
    lines.push(`\nCorrect: ${answerKeys.join(", ")}`)
  }
  return lines.join("\n")
}

/**
 * Extract trailing answer key declarations like "Answer: A", "Correct: A, C", "Key: B".
 */
function extractAnswerKey(text: string): { body: string; detectedKeys: string[] } {
  const detectedKeys: string[] = []
  const lines = text.split(/\r?\n/)
  const remainingLines: string[] = []

  const keyPattern = /^\s*(?:correct(?:\s+answer)?|answer(?:\s+key)?|ans|key)\s*[:=\-]\s*([a-z0-9,\s]+)/i

  for (const line of lines) {
    const match = line.match(keyPattern)
    if (match && match[1]) {
      const raw = match[1]
      const tokens = raw
        .split(/[,\s]+/)
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean)
      for (const t of tokens) {
        // Handle letter A-Z
        if (/^[A-Z]$/.test(t)) {
          if (!detectedKeys.includes(t)) detectedKeys.push(t)
        } else if (/^\d+$/.test(t)) {
          // Handle number 1-26 -> A-Z
          const num = parseInt(t, 10)
          if (num >= 1 && num <= 26) {
            const letter = optionLetter(num - 1)
            if (!detectedKeys.includes(letter)) detectedKeys.push(letter)
          }
        }
      }
    } else {
      remainingLines.push(line)
    }
  }

  return {
    body: remainingLines.join("\n"),
    detectedKeys,
  }
}

/**
 * Regex identifying the beginning of an option entry:
 * - "A)", "(A)", "[A]", "A.", "Option A:"
 * - "1.", "1)", "(1)", "[1]"
 */
const OPTION_START_PATTERN =
  /(?:^|\n)\s*(?:(?:(?:Option\s+)?([A-Za-z])[\.\)\:\-]|[\(\[]([A-Za-z])[\)\]])|(?:(\d+)[\.\)\:\-]|[\(\[](\d+)[\)\]]))\s+/g

/**
 * Parses unified text into individual option cards and detected answer keys.
 */
export function parseUnifiedTextToOptions(text: string): UnifiedParseResult {
  const { body, detectedKeys } = extractAnswerKey(text)
  const cleanBody = body.trim()

  if (!cleanBody) {
    return {
      options: [],
      answerKeys: detectedKeys,
    }
  }

  // Step 1: Scan for prefixed option markers (A), B), 1., etc.)
  const matches: Array<{
    index: number
    length: number
    rawLabel: string
  }> = []

  const re = new RegExp(OPTION_START_PATTERN.source, "g")
  let m: RegExpExecArray | null
  while ((m = re.exec(cleanBody)) !== null) {
    const rawLabel = (m[1] || m[2] || m[3] || m[4] || "").trim()
    matches.push({
      index: m.index,
      length: m[0].length,
      rawLabel,
    })
  }

  // If at least 2 prefixed markers were found, split by those positions
  if (matches.length >= 2) {
    const options: ParsedOption[] = []
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i]
      const startContent = current.index + current.length
      const endContent =
        i + 1 < matches.length ? matches[i + 1].index : cleanBody.length
      const content = cleanBody.slice(startContent, endContent).trim()

      options.push({
        key: optionLetter(i),
        content,
      })
    }

    return {
      options,
      answerKeys: detectedKeys,
    }
  }

  // Step 2: Fallback to non-empty lines if no prefixes detected
  const nonBlankLines = cleanBody
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const options: ParsedOption[] = nonBlankLines.map((line, index) => ({
    key: optionLetter(index),
    content: line,
  }))

  return {
    options,
    answerKeys: detectedKeys,
  }
}
