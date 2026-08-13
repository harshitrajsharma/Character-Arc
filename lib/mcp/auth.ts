import { createHash } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export type AuthenticatedMcpPrincipal = {
  userId: string
  workspaceId: string
  role: "OWNER" | "EDITOR" | "VIEWER"
}

export type McpAuthResult =
  | { success: true; principal: AuthenticatedMcpPrincipal }
  | { success: false; errorCode: number; errorMessage: string }

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/**
 * Authenticates an incoming MCP HTTP request using Bearer JWT, McpToken secret, x-api-key, or cookie session.
 */
export async function authenticateMcpRequest(
  req: Request
): Promise<McpAuthResult> {
  const authHeader = req.headers.get("authorization")
  const apiKeyHeader = req.headers.get("x-api-key")
  const explicitWorkspaceId = req.headers.get("x-workspace-id")

  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : apiKeyHeader?.trim()

  // 1. Check for Character Arc API Token (mcp_sec_...)
  if (bearerToken?.startsWith("mcp_sec_")) {
    try {
      const keyHash = hashToken(bearerToken)
      const dbToken = await prisma.mcpToken.findUnique({
        where: { keyHash },
        select: {
          id: true,
          workspaceId: true,
          createdById: true,
          revokedAt: true,
        },
      })

      if (dbToken && !dbToken.revokedAt) {
        // Touch lastUsedAt asynchronously
        void prisma.mcpToken.update({
          where: { id: dbToken.id },
          data: { lastUsedAt: new Date() },
        }).catch(() => {})

        return {
          success: true,
          principal: {
            userId: dbToken.createdById,
            workspaceId: dbToken.workspaceId,
            role: "OWNER",
          },
        }
      }

      return {
        success: false,
        errorCode: -32001,
        errorMessage: "Invalid or revoked MCP API Token.",
      }
    } catch {
      // Fall through to JWT/session auth if mcp_tokens table is missing
    }
  }

  let userId: string | null = null

  // 2. Try Supabase JWT Bearer token
  if (bearerToken) {
    try {
      const supabase = await createServerSupabaseClient()
      const { data, error } = await supabase.auth.getUser(bearerToken)
      if (!error && data?.user) {
        userId = data.user.id
      }
    } catch {
      // Fall through to cookie check if client pass-through failed
    }
  }

  // 3. Fallback to server session cookies if no Bearer token worked
  if (!userId) {
    try {
      const supabase = await createServerSupabaseClient()
      const { data, error } = await supabase.auth.getClaims()
      if (!error && data?.claims?.sub) {
        userId = data.claims.sub as string
      }
    } catch {
      // No valid cookie session
    }
  }

  if (!userId) {
    return {
      success: false,
      errorCode: -32001,
      errorMessage:
        "Unauthorized. Provide a valid Bearer token, MCP API key, or session in authorization headers.",
    }
  }

  // 4. Resolve target workspace
  let membership = null

  if (explicitWorkspaceId) {
    membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: explicitWorkspaceId,
          userId,
        },
      },
      select: { workspaceId: true, role: true },
    })
  }

  if (!membership) {
    // Default to the user's first available personal/active workspace
    membership = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspace: { archivedAt: null },
      },
      select: { workspaceId: true, role: true },
      orderBy: { joinedAt: "asc" },
    })
  }

  if (!membership) {
    return {
      success: false,
      errorCode: -32003,
      errorMessage:
        "No active workspace membership found for this user account.",
    }
  }

  return {
    success: true,
    principal: {
      userId,
      workspaceId: membership.workspaceId,
      role: membership.role as "OWNER" | "EDITOR" | "VIEWER",
    },
  }
}
