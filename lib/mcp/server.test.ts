// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"
import { formatMcpToolName, parseMcpToolName } from "./contracts"
import { manifestsToMcpTools } from "./schema-adapter"
import { listFirstPartyToolManifests } from "@/lib/tools/registry"

describe("MCP Tool Formatting & Translation", () => {
  test("formats tool and action keys correctly", () => {
    const formatted = formatMcpToolName("core.exam-prep", "exam.create")
    expect(formatted).toBe("core_exam_prep__exam_create")
  })

  test("parses formatted MCP tool name back to original keys", () => {
    const manifests = listFirstPartyToolManifests()
    const parsed = parseMcpToolName("core_exam_prep__exam_create", manifests)
    expect(parsed).not.toBeNull()
    expect(parsed?.toolKey).toBe("core.exam-prep")
    expect(parsed?.actionKey).toBe("exam.create")
  })

  test("transforms tool manifests to MCP tool format", () => {
    const manifests = listFirstPartyToolManifests()
    const mcpTools = manifestsToMcpTools(manifests)
    expect(mcpTools.length).toBeGreaterThan(0)

    const examCreateTool = mcpTools.find(
      (t) => t.name === "core_exam_prep__exam_create"
    )
    expect(examCreateTool).toBeDefined()
    expect(examCreateTool?.description).toContain("Exam Prep")
    expect(examCreateTool?.inputSchema.type).toBe("object")
  })
})

