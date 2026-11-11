import { createHash } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { MCP_ERROR_CODES } from "./contracts"

export type AuthenticatedMcpPrincipal = {
  userId: string
  workspaceId: string
  role: "OWNER" | "EDITOR" | "VIEWER"
}

export type McpAuthResult =
  | { success: true; principal: AuthenticatedMcpPrincipal }
  | { success: false; errorCode: number; errorMessage: string; status: number }

type TokenRecord = {
  id: string
  workspaceId: string
  createdById: string
  revokedAt: Date | null
  lastUsedAt: Date | null
}
type Membership = Pick<AuthenticatedMcpPrincipal, "workspaceId" | "role">
export type McpAuthDependencies = {
  findToken: (hash: string) => Promise<TokenRecord | null>
  findMembership: (
    userId: string,
    workspaceId?: string
  ) => Promise<Membership | null>
  verifyJwt: (token: string) => Promise<string | null>
  touchToken: (id: string) => Promise<unknown>
}

const dependencies: McpAuthDependencies = {
  findToken: (keyHash) =>
    prisma.mcpToken.findUnique({
      where: { keyHash },
      select: {
        id: true,
        workspaceId: true,
        createdById: true,
        revokedAt: true,
        lastUsedAt: true,
      },
    }),
  findMembership: (userId, workspaceId) =>
    prisma.workspaceMember.findFirst({
      where: {
        userId,
        ...(workspaceId ? { workspaceId } : {}),
        workspace: { archivedAt: null },
      },
      select: { workspaceId: true, role: true },
      orderBy: { joinedAt: "asc" },
    }),
  verifyJwt: async (token) => {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.getUser(token)
    if (error && (!error.status || error.status === 429 || error.status >= 500)) {
      throw new Error("Authentication service unavailable.")
    }
    return error ? null : (data.user?.id ?? null)
  },
  touchToken: (id) =>
    prisma.mcpToken.update({ where: { id }, data: { lastUsedAt: new Date() } }),
}

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const deny = (message: string, status = 401): McpAuthResult => ({
  success: false,
  errorCode:
    status === 403
      ? MCP_ERROR_CODES.FORBIDDEN
      : status === 503
        ? MCP_ERROR_CODES.INTERNAL_ERROR
        : MCP_ERROR_CODES.UNAUTHORIZED,
  errorMessage: message,
  status,
})

/** Explicit credentials only: cookie ambient authority and URL secrets are not MCP authentication. */
export async function authenticateMcpRequest(
  req: Request,
  deps: McpAuthDependencies = dependencies
): Promise<McpAuthResult> {
  const url = new URL(req.url)
  if (["apiKey", "token", "key"].some((key) => url.searchParams.has(key))) {
    return deny(
      "Credentials in URLs are not accepted. Use Authorization: Bearer <key>."
    )
  }
  const header = req.headers.get("authorization")
  if (["workspaceId", "workspace"].some((key) => url.searchParams.has(key))) {
    return deny("Select a workspace through x-workspace-id, not a URL parameter.", 403)
  }
  const apiKey = req.headers.get("x-api-key")?.trim()
  const match = header?.match(/^Bearer\s+(\S+)$/i)
  if ((header && !match) || (match && apiKey && match[1] !== apiKey)) {
    return deny("Provide one valid Bearer credential.")
  }
  const token = match?.[1] ?? apiKey
  if (!token || token.length > 8192)
    return deny("A Bearer token or x-api-key is required.")

  const explicitWorkspace = req.headers
    .get("x-workspace-id")
    ?.trim()
    .toLowerCase()
  if (explicitWorkspace && !uuid.test(explicitWorkspace)) {
    return deny(
      "x-workspace-id must identify an active workspace membership.",
      403
    )
  }
  try {
    if (token.startsWith("mcp_sec_")) {
      if (!/^mcp_sec_[a-f0-9]{40,128}$/.test(token))
        return deny("Invalid or revoked MCP key.")
      const record = await deps.findToken(
        createHash("sha256").update(token).digest("hex")
      )
      if (!record || record.revokedAt)
        return deny("Invalid or revoked MCP key.")
      if (explicitWorkspace && explicitWorkspace !== record.workspaceId) {
        return deny("This MCP key belongs to a different workspace.", 403)
      }
      const membership = await deps.findMembership(
        record.createdById,
        record.workspaceId
      )
      if (!membership)
        return deny(
          "The key owner no longer has access to this active workspace.",
          403
        )
      if (
        !record.lastUsedAt ||
        record.lastUsedAt.getTime() < Date.now() - 60_000
      ) {
        await deps.touchToken(record.id).catch(() => undefined)
      }
      return {
        success: true,
        principal: { userId: record.createdById, ...membership },
      }
    }
    const userId = await deps.verifyJwt(token)
    if (!userId) return deny("Invalid or expired Bearer token.")
    const membership = await deps.findMembership(userId, explicitWorkspace)
    if (!membership)
      return deny("Active workspace membership is required.", 403)
    return { success: true, principal: { userId, ...membership } }
  } catch {
    return deny(
      "MCP authentication is temporarily unavailable. Retry later.",
      503
    )
  }
}
