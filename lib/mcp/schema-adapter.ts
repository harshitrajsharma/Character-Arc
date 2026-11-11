import type { McpTool } from "./contracts"
import { formatMcpToolName, MCP_IDEMPOTENCY_FIELD } from "./contracts"
import type { ToolManifest } from "@/lib/tools/contracts"

/**
 * Transforms a Character Arc Tool Manifest into a collection of MCP tool definitions.
 */
export function manifestToMcpTools(manifest: ToolManifest): McpTool[] {
  return manifest.actions.map((action) => {
    const mcpName = formatMcpToolName(manifest.tool.key, action.key)
    const readOnly = action.requiredPermissions.every((permission) =>
      permission.startsWith("blocks.read")
    )
    const description =
      `[${manifest.tool.name}] ${action.name} - ${action.description}` +
      (readOnly
        ? ""
        : " Use a unique _idempotencyKey for each intended change; retain it unchanged when retrying that change.")

    // Input schema validation & cleanup
    const rawSchema = action.inputSchema as Record<string, unknown>
    // Preserve composition, limits and all other validation keywords from the trusted manifest.
    const inputSchema: Record<string, unknown> = structuredClone(rawSchema)
    if (!readOnly) {
      inputSchema.properties = {
        ...((inputSchema.properties as Record<string, unknown>) ?? {}),
        [MCP_IDEMPOTENCY_FIELD]: {
          type: "string",
          minLength: 8,
          maxLength: 128,
          description:
            "Unique operation key. Reuse this exact key and arguments after an uncertain response; use a new key for a new change.",
        },
      }
      inputSchema.required = [
        ...((inputSchema.required as string[]) ?? []),
        MCP_IDEMPOTENCY_FIELD,
      ]
    }

    return {
      name: mcpName,
      title: `${manifest.tool.name}: ${action.name}`,
      description,
      inputSchema,
      annotations: {
        readOnlyHint: readOnly,
        destructiveHint:
          !readOnly && /delete|remove|abandon|cancel/.test(action.key),
        idempotentHint: !readOnly,
        openWorldHint: false,
      },
    }
  })
}

/**
 * Transforms multiple Tool Manifests into a flat array of MCP tools.
 */
export function manifestsToMcpTools(manifests: ToolManifest[]): McpTool[] {
  return manifests.flatMap(manifestToMcpTools)
}
