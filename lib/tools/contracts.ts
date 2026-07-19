import { z } from "zod"

const registryKeySchema = z
  .string()
  .min(3)
  .max(120)
  .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/, "Use lowercase namespaced keys.")

const jsonObjectSchema = z.record(z.string(), z.unknown())

const toolGrantSchema = z.object({
  permissionKey: registryKeySchema,
  effect: z.enum(["allow", "deny"]),
  constraints: jsonObjectSchema.default({}),
})

const toolBlockTypeSchema = z.object({
  key: registryKeySchema,
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(240),
  kind: z.enum(["entity", "container", "content"]),
  schemaVersion: z.number().int().positive(),
  propertiesSchema: jsonObjectSchema,
})

const toolRelationTypeSchema = z.object({
  key: registryKeySchema,
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(240),
  sourceBlockTypeKey: registryKeySchema,
  targetBlockTypeKey: registryKeySchema,
  cardinality: z.enum(["one_to_one", "one_to_many", "many_to_many"]),
})

const toolActionSchema = z.object({
  key: registryKeySchema,
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(240),
  execution: z.enum(["deterministic", "ai_assisted"]),
  requiredPermissions: z.array(registryKeySchema).min(1),
  inputSchema: jsonObjectSchema,
  output: z
    .object({
      rootBlockTypeKey: registryKeySchema,
      createsBlockTypeKeys: z.array(registryKeySchema).default([]),
      writesBlockTypeKeys: z.array(registryKeySchema).default([]),
    })
    .refine(
      (output) =>
        output.createsBlockTypeKeys.length > 0 ||
        output.writesBlockTypeKeys.length > 0,
      "An action must create or write at least one block type."
    ),
})

export const toolManifestSchema = z
  .object({
    manifestVersion: z.literal(1),
    tool: z.object({
      key: registryKeySchema,
      name: z.string().min(1).max(80),
      description: z.string().min(1).max(240),
      icon: z.string().min(1).max(80),
      category: z.enum([
        "learn",
        "plan",
        "decide",
        "track",
        "practice",
        "connect",
      ]),
    }),
    release: z.object({
      version: z.string().regex(/^\d+\.\d+\.\d+$/, "Use semantic versioning."),
      schemaVersion: z.number().int().positive(),
    }),
    routes: z.object({
      home: z.string().startsWith("/"),
      create: z.string().startsWith("/").optional(),
    }),
    defaultGrants: z.array(toolGrantSchema),
    blockTypes: z.array(toolBlockTypeSchema).min(1),
    relationTypes: z.array(toolRelationTypeSchema),
    actions: z.array(toolActionSchema).min(1),
  })
  .superRefine((manifest, context) => {
    const blockTypeKeys = new Set(manifest.blockTypes.map((type) => type.key))
    const grantKeys = new Set(
      manifest.defaultGrants.map((grant) => grant.permissionKey)
    )
    const relationTypeKeys = new Set(
      manifest.relationTypes.map((relation) => relation.key)
    )
    const actionKeys = new Set(manifest.actions.map((action) => action.key))

    if (blockTypeKeys.size !== manifest.blockTypes.length) {
      context.addIssue({
        code: "custom",
        message: "Block type keys must be unique within a tool release.",
        path: ["blockTypes"],
      })
    }

    if (grantKeys.size !== manifest.defaultGrants.length) {
      context.addIssue({
        code: "custom",
        message:
          "Default permission keys must be unique within a tool release.",
        path: ["defaultGrants"],
      })
    }

    if (relationTypeKeys.size !== manifest.relationTypes.length) {
      context.addIssue({
        code: "custom",
        message: "Relation type keys must be unique within a tool release.",
        path: ["relationTypes"],
      })
    }

    if (actionKeys.size !== manifest.actions.length) {
      context.addIssue({
        code: "custom",
        message: "Action keys must be unique within a tool release.",
        path: ["actions"],
      })
    }

    manifest.relationTypes.forEach((relation, index) => {
      if (!blockTypeKeys.has(relation.sourceBlockTypeKey)) {
        context.addIssue({
          code: "custom",
          message: `Unknown source block type: ${relation.sourceBlockTypeKey}`,
          path: ["relationTypes", index, "sourceBlockTypeKey"],
        })
      }

      if (!blockTypeKeys.has(relation.targetBlockTypeKey)) {
        context.addIssue({
          code: "custom",
          message: `Unknown target block type: ${relation.targetBlockTypeKey}`,
          path: ["relationTypes", index, "targetBlockTypeKey"],
        })
      }
    })

    manifest.actions.forEach((action, actionIndex) => {
      const outputKeys = [
        action.output.rootBlockTypeKey,
        ...action.output.createsBlockTypeKeys,
        ...action.output.writesBlockTypeKeys,
      ]

      outputKeys.forEach((blockTypeKey) => {
        if (!blockTypeKeys.has(blockTypeKey)) {
          context.addIssue({
            code: "custom",
            message: `Unknown output block type: ${blockTypeKey}`,
            path: ["actions", actionIndex, "output"],
          })
        }
      })

      action.requiredPermissions.forEach((permissionKey) => {
        if (!grantKeys.has(permissionKey)) {
          context.addIssue({
            code: "custom",
            message: `Action references an undeclared permission: ${permissionKey}`,
            path: ["actions", actionIndex, "requiredPermissions"],
          })
        }
      })
    })
  })

export type ToolManifest = z.infer<typeof toolManifestSchema>

export type ToolExecutionPrincipal = {
  actorId: string
  workspaceId: string
  invocationSource: "web" | "agent_api" | "mcp"
}

export type ToolExecutionContext = {
  userId: string
  workspaceId: string
  installationId: string
  releaseId: string
  grantedPermissions: ReadonlySet<string>
}

export type ToolActionResult = {
  runId: string
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled"
  rootBlockId?: string
  createdBlockIds: string[]
  evidenceIds: string[]
}

export function parseToolManifest(input: unknown) {
  return toolManifestSchema.parse(input)
}
