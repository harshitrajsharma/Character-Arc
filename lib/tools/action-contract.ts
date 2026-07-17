import type { ToolManifest } from "@/lib/tools/contracts"

export type ToolAction = ToolManifest["actions"][number]

export type ActionResolutionIssue = {
  code: "action_not_found"
  actionKey: string
  message: string
}

export type ActionResolutionResult =
  | { success: true; action: ToolAction }
  | { success: false; issue: ActionResolutionIssue }

export type ActionInputValidationIssueCode =
  | "action_not_found"
  | "unsupported_schema_keyword"
  | "unsupported_schema_type"
  | "invalid_schema"
  | "invalid_type"
  | "required"
  | "additional_property"
  | "min_length"
  | "max_length"
  | "invalid_format"
  | "invalid_enum"
  | "minimum"
  | "maximum"
  | "max_items"

export type ActionInputValidationIssue = {
  code: ActionInputValidationIssueCode
  path: Array<string | number>
  message: string
  schemaPath?: Array<string | number>
}

export type ActionInputValidationResult =
  | { success: true; data: unknown }
  | { success: false; issues: ActionInputValidationIssue[] }

type JsonSchema = Record<string, unknown>

const SUPPORTED_TYPES = new Set([
  "object",
  "string",
  "number",
  "integer",
  "array",
  "null",
])

const SUPPORTED_KEYWORDS: Record<string, ReadonlySet<string>> = {
  object: new Set(["type", "properties", "required", "additionalProperties"]),
  string: new Set([
    "type",
    "minLength",
    "maxLength",
    "format",
    "contentMediaType",
    "enum",
  ]),
  number: new Set(["type", "minimum", "maximum"]),
  integer: new Set(["type", "minimum", "maximum"]),
  array: new Set(["type", "maxItems", "items"]),
  null: new Set(["type"]),
}

export class ToolActionResolutionError extends Error {
  readonly code = "action_not_found"

  constructor(
    readonly toolKey: string,
    readonly actionKey: string
  ) {
    super(`Unknown action "${actionKey}" for tool "${toolKey}".`)
    this.name = "ToolActionResolutionError"
  }
}

export function resolveToolAction(
  manifest: ToolManifest,
  actionKey: string
): ActionResolutionResult {
  const action = manifest.actions.find(
    (candidate) => candidate.key === actionKey
  )

  if (action) {
    return { success: true, action }
  }

  return {
    success: false,
    issue: {
      code: "action_not_found",
      actionKey,
      message: `Unknown action "${actionKey}" for tool "${manifest.tool.key}".`,
    },
  }
}

export function resolveToolActionStrict(
  manifest: ToolManifest,
  actionKey: string
): ToolAction {
  const result = resolveToolAction(manifest, actionKey)

  if (!result.success) {
    throw new ToolActionResolutionError(manifest.tool.key, actionKey)
  }

  return result.action
}

export function validateActionInput(
  action: ToolAction,
  input: unknown
): ActionInputValidationResult {
  const schemaIssues: ActionInputValidationIssue[] = []
  inspectSchema(action.inputSchema, [], schemaIssues)

  if (schemaIssues.length > 0) {
    return { success: false, issues: schemaIssues }
  }

  const issues: ActionInputValidationIssue[] = []
  validateValue(action.inputSchema, input, [], [], issues)

  return issues.length === 0
    ? { success: true, data: input }
    : { success: false, issues }
}

export function validateToolActionInput(
  manifest: ToolManifest,
  actionKey: string,
  input: unknown
): ActionInputValidationResult {
  const resolution = resolveToolAction(manifest, actionKey)

  if (!resolution.success) {
    return {
      success: false,
      issues: [
        {
          code: resolution.issue.code,
          path: [],
          message: resolution.issue.message,
        },
      ],
    }
  }

  return validateActionInput(resolution.action, input)
}

function inspectSchema(
  value: unknown,
  schemaPath: Array<string | number>,
  issues: ActionInputValidationIssue[]
): void {
  if (!isRecord(value)) {
    addSchemaIssue(
      issues,
      "invalid_schema",
      schemaPath,
      "Schema nodes must be objects."
    )
    return
  }

  const types = readSchemaTypes(value.type, schemaPath, issues)
  if (!types) {
    return
  }

  const allowedKeywords = new Set<string>(["type"])
  for (const type of types) {
    for (const keyword of SUPPORTED_KEYWORDS[type]) {
      allowedKeywords.add(keyword)
    }
  }

  for (const keyword of Object.keys(value)) {
    if (!allowedKeywords.has(keyword)) {
      issues.push({
        code: "unsupported_schema_keyword",
        path: [],
        schemaPath: [...schemaPath, keyword],
        message: `Unsupported schema keyword "${keyword}".`,
      })
    }
  }

  const nonNullType = types.find((type) => type !== "null") ?? "null"

  switch (nonNullType) {
    case "object":
      inspectObjectSchema(value, schemaPath, issues)
      break
    case "string":
      inspectStringSchema(value, schemaPath, issues)
      break
    case "number":
    case "integer":
      inspectNumberSchema(value, schemaPath, issues)
      break
    case "array":
      inspectArraySchema(value, schemaPath, issues)
      break
  }
}

function readSchemaTypes(
  value: unknown,
  schemaPath: Array<string | number>,
  issues: ActionInputValidationIssue[]
): string[] | undefined {
  const typePath = [...schemaPath, "type"]

  if (typeof value === "string") {
    if (!SUPPORTED_TYPES.has(value)) {
      addSchemaIssue(
        issues,
        "unsupported_schema_type",
        typePath,
        `Unsupported schema type "${value}".`
      )
      return undefined
    }

    return [value]
  }

  if (Array.isArray(value)) {
    const uniqueTypes = new Set(value)
    const validNullableUnion =
      value.length === 2 &&
      uniqueTypes.size === 2 &&
      value.every((type) => typeof type === "string") &&
      value.includes("null") &&
      value.some((type) => type !== "null" && SUPPORTED_TYPES.has(type))

    if (validNullableUnion) {
      return value as string[]
    }

    addSchemaIssue(
      issues,
      "unsupported_schema_type",
      typePath,
      "Only a single supported type or a union of one supported type with null is allowed."
    )
    return undefined
  }

  addSchemaIssue(
    issues,
    "invalid_schema",
    typePath,
    "Schema type must be declared."
  )
  return undefined
}

function inspectObjectSchema(
  schema: JsonSchema,
  schemaPath: Array<string | number>,
  issues: ActionInputValidationIssue[]
): void {
  if (!isRecord(schema.properties)) {
    addSchemaIssue(
      issues,
      "invalid_schema",
      [...schemaPath, "properties"],
      "Object schemas must declare a properties object."
    )
    return
  }

  if (schema.additionalProperties !== false) {
    addSchemaIssue(
      issues,
      "invalid_schema",
      [...schemaPath, "additionalProperties"],
      "Object schemas must set additionalProperties to false."
    )
  }

  if (schema.required !== undefined) {
    if (
      !Array.isArray(schema.required) ||
      schema.required.some((key) => typeof key !== "string") ||
      new Set(schema.required).size !== schema.required.length
    ) {
      addSchemaIssue(
        issues,
        "invalid_schema",
        [...schemaPath, "required"],
        "Required must be an array of unique property names."
      )
    } else {
      for (const key of schema.required) {
        if (!Object.hasOwn(schema.properties, key)) {
          addSchemaIssue(
            issues,
            "invalid_schema",
            [...schemaPath, "required"],
            `Required property "${key}" is not declared in properties.`
          )
        }
      }
    }
  }

  for (const [key, propertySchema] of Object.entries(schema.properties)) {
    inspectSchema(propertySchema, [...schemaPath, "properties", key], issues)
  }
}

function inspectStringSchema(
  schema: JsonSchema,
  schemaPath: Array<string | number>,
  issues: ActionInputValidationIssue[]
): void {
  inspectNonNegativeIntegerKeyword(schema, "minLength", schemaPath, issues)
  inspectNonNegativeIntegerKeyword(schema, "maxLength", schemaPath, issues)

  if (
    schema.enum !== undefined &&
    (!Array.isArray(schema.enum) ||
      schema.enum.length === 0 ||
      schema.enum.some((value) => typeof value !== "string") ||
      new Set(schema.enum).size !== schema.enum.length)
  ) {
    addSchemaIssue(
      issues,
      "invalid_schema",
      [...schemaPath, "enum"],
      "String enum must contain unique string values."
    )
  }

  if (
    typeof schema.minLength === "number" &&
    typeof schema.maxLength === "number" &&
    schema.minLength > schema.maxLength
  ) {
    addSchemaIssue(
      issues,
      "invalid_schema",
      schemaPath,
      "minLength cannot exceed maxLength."
    )
  }

  if (
    schema.format !== undefined &&
    schema.format !== "date" &&
    schema.format !== "uuid"
  ) {
    addSchemaIssue(
      issues,
      "invalid_schema",
      [...schemaPath, "format"],
      "Only date and uuid string formats are supported."
    )
  }

  if (
    schema.contentMediaType !== undefined &&
    schema.contentMediaType !== "text/markdown"
  ) {
    addSchemaIssue(
      issues,
      "invalid_schema",
      [...schemaPath, "contentMediaType"],
      'Only the "text/markdown" content media type is supported.'
    )
  }
}

function inspectNumberSchema(
  schema: JsonSchema,
  schemaPath: Array<string | number>,
  issues: ActionInputValidationIssue[]
): void {
  inspectFiniteNumberKeyword(schema, "minimum", schemaPath, issues)
  inspectFiniteNumberKeyword(schema, "maximum", schemaPath, issues)

  if (
    typeof schema.minimum === "number" &&
    typeof schema.maximum === "number" &&
    schema.minimum > schema.maximum
  ) {
    addSchemaIssue(
      issues,
      "invalid_schema",
      schemaPath,
      "minimum cannot exceed maximum."
    )
  }
}

function inspectArraySchema(
  schema: JsonSchema,
  schemaPath: Array<string | number>,
  issues: ActionInputValidationIssue[]
): void {
  inspectNonNegativeIntegerKeyword(schema, "maxItems", schemaPath, issues)

  if (schema.items === undefined) {
    addSchemaIssue(
      issues,
      "invalid_schema",
      [...schemaPath, "items"],
      "Array schemas must declare an items schema."
    )
    return
  }

  inspectSchema(schema.items, [...schemaPath, "items"], issues)
}

function inspectNonNegativeIntegerKeyword(
  schema: JsonSchema,
  keyword: "minLength" | "maxLength" | "maxItems",
  schemaPath: Array<string | number>,
  issues: ActionInputValidationIssue[]
): void {
  const value = schema[keyword]
  if (
    value !== undefined &&
    (!Number.isInteger(value) || (value as number) < 0)
  ) {
    addSchemaIssue(
      issues,
      "invalid_schema",
      [...schemaPath, keyword],
      `${keyword} must be a non-negative integer.`
    )
  }
}

function inspectFiniteNumberKeyword(
  schema: JsonSchema,
  keyword: "minimum" | "maximum",
  schemaPath: Array<string | number>,
  issues: ActionInputValidationIssue[]
): void {
  const value = schema[keyword]
  if (
    value !== undefined &&
    (typeof value !== "number" || !Number.isFinite(value))
  ) {
    addSchemaIssue(
      issues,
      "invalid_schema",
      [...schemaPath, keyword],
      `${keyword} must be a finite number.`
    )
  }
}

function validateValue(
  schema: JsonSchema,
  value: unknown,
  path: Array<string | number>,
  schemaPath: Array<string | number>,
  issues: ActionInputValidationIssue[]
): void {
  const types = Array.isArray(schema.type) ? schema.type : [schema.type]

  if (value === null && types.includes("null")) {
    return
  }

  const type = types.find((candidate) => candidate !== "null") as string

  switch (type) {
    case "object":
      validateObject(schema, value, path, schemaPath, issues)
      break
    case "string":
      validateString(schema, value, path, schemaPath, issues)
      break
    case "number":
    case "integer":
      validateNumber(schema, value, type, path, schemaPath, issues)
      break
    case "array":
      validateArray(schema, value, path, schemaPath, issues)
      break
    case "null":
      addTypeIssue(issues, path, schemaPath, "null")
      break
  }
}

function validateObject(
  schema: JsonSchema,
  value: unknown,
  path: Array<string | number>,
  schemaPath: Array<string | number>,
  issues: ActionInputValidationIssue[]
): void {
  if (!isRecord(value)) {
    addTypeIssue(issues, path, schemaPath, "object")
    return
  }

  const properties = schema.properties as Record<string, JsonSchema>
  const required = (schema.required as string[] | undefined) ?? []

  for (const key of required) {
    if (!Object.hasOwn(value, key)) {
      issues.push({
        code: "required",
        path: [...path, key],
        schemaPath: [...schemaPath, "required"],
        message: `Required property "${key}" is missing.`,
      })
    }
  }

  for (const [key, propertyValue] of Object.entries(value)) {
    const propertySchema = properties[key]

    if (!propertySchema) {
      issues.push({
        code: "additional_property",
        path: [...path, key],
        schemaPath: [...schemaPath, "additionalProperties"],
        message: `Property "${key}" is not allowed.`,
      })
      continue
    }

    validateValue(
      propertySchema,
      propertyValue,
      [...path, key],
      [...schemaPath, "properties", key],
      issues
    )
  }
}

function validateString(
  schema: JsonSchema,
  value: unknown,
  path: Array<string | number>,
  schemaPath: Array<string | number>,
  issues: ActionInputValidationIssue[]
): void {
  if (typeof value !== "string") {
    addTypeIssue(issues, path, schemaPath, "string")
    return
  }

  const length = Array.from(value).length

  if (typeof schema.minLength === "number" && length < schema.minLength) {
    issues.push({
      code: "min_length",
      path,
      schemaPath: [...schemaPath, "minLength"],
      message: `String must contain at least ${schema.minLength} characters.`,
    })
  }

  if (typeof schema.maxLength === "number" && length > schema.maxLength) {
    issues.push({
      code: "max_length",
      path,
      schemaPath: [...schemaPath, "maxLength"],
      message: `String must contain at most ${schema.maxLength} characters.`,
    })
  }

  if (schema.format === "date" && !isDate(value)) {
    addFormatIssue(issues, path, schemaPath, "date")
  }

  if (schema.format === "uuid" && !isUuid(value)) {
    addFormatIssue(issues, path, schemaPath, "uuid")
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    issues.push({
      code: "invalid_enum",
      path,
      schemaPath: [...schemaPath, "enum"],
      message: `String must be one of: ${schema.enum.join(", ")}.`,
    })
  }
}

function validateNumber(
  schema: JsonSchema,
  value: unknown,
  type: "number" | "integer",
  path: Array<string | number>,
  schemaPath: Array<string | number>,
  issues: ActionInputValidationIssue[]
): void {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    (type === "integer" && !Number.isInteger(value))
  ) {
    addTypeIssue(issues, path, schemaPath, type)
    return
  }

  if (typeof schema.minimum === "number" && value < schema.minimum) {
    issues.push({
      code: "minimum",
      path,
      schemaPath: [...schemaPath, "minimum"],
      message: `Number must be at least ${schema.minimum}.`,
    })
  }

  if (typeof schema.maximum === "number" && value > schema.maximum) {
    issues.push({
      code: "maximum",
      path,
      schemaPath: [...schemaPath, "maximum"],
      message: `Number must be at most ${schema.maximum}.`,
    })
  }
}

function validateArray(
  schema: JsonSchema,
  value: unknown,
  path: Array<string | number>,
  schemaPath: Array<string | number>,
  issues: ActionInputValidationIssue[]
): void {
  if (!Array.isArray(value)) {
    addTypeIssue(issues, path, schemaPath, "array")
    return
  }

  if (typeof schema.maxItems === "number" && value.length > schema.maxItems) {
    issues.push({
      code: "max_items",
      path,
      schemaPath: [...schemaPath, "maxItems"],
      message: `Array must contain at most ${schema.maxItems} items.`,
    })
  }

  const itemSchema = schema.items as JsonSchema
  value.forEach((item, index) => {
    validateValue(
      itemSchema,
      item,
      [...path, index],
      [...schemaPath, "items"],
      issues
    )
  })
}

function addSchemaIssue(
  issues: ActionInputValidationIssue[],
  code:
    "unsupported_schema_keyword" | "unsupported_schema_type" | "invalid_schema",
  schemaPath: Array<string | number>,
  message: string
): void {
  issues.push({ code, path: [], schemaPath, message })
}

function addTypeIssue(
  issues: ActionInputValidationIssue[],
  path: Array<string | number>,
  schemaPath: Array<string | number>,
  expectedType: string
): void {
  issues.push({
    code: "invalid_type",
    path,
    schemaPath: [...schemaPath, "type"],
    message: `Expected ${expectedType}.`,
  })
}

function addFormatIssue(
  issues: ActionInputValidationIssue[],
  path: Array<string | number>,
  schemaPath: Array<string | number>,
  format: "date" | "uuid"
): void {
  issues.push({
    code: "invalid_format",
    path,
    schemaPath: [...schemaPath, "format"],
    message: `String must use ${format} format.`,
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return false
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysByMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]

  return month >= 1 && month <= 12 && day >= 1 && day <= daysByMonth[month - 1]
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  )
}
