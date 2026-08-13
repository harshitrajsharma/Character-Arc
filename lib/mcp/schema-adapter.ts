import type { McpTool } from "./contracts"
import { formatMcpToolName } from "./contracts"
import type { ToolManifest } from "@/lib/tools/contracts"

/**
 * Transforms a Character Arc Tool Manifest into a collection of MCP tool definitions.
 */
export function manifestToMcpTools(manifest: ToolManifest): McpTool[] {
  return manifest.actions.map((action) => {
    const mcpName = formatMcpToolName(manifest.tool.key, action.key)
    const description = `[${manifest.tool.name}] ${action.name} - ${action.description}`

    // Input schema validation & cleanup
    const rawSchema = action.inputSchema as Record<string, unknown>
    const inputSchema: Record<string, unknown> = {
      type: "object",
      properties: (rawSchema.properties as Record<string, unknown>) ?? {},
      required: (rawSchema.required as string[]) ?? [],
      additionalProperties: rawSchema.additionalProperties ?? false,
    }

    if (typeof rawSchema.description === "string") {
      inputSchema.description = rawSchema.description
    }

    return {
      name: mcpName,
      description,
      inputSchema,
    }
  })
}

/**
 * Transforms multiple Tool Manifests into a flat array of MCP tools.
 */
export function manifestsToMcpTools(manifests: ToolManifest[]): McpTool[] {
  return manifests.flatMap(manifestToMcpTools)
}
