import type { AuthenticatedMcpPrincipal } from "./auth"

type SseSession = {
  sessionId: string
  controller: ReadableStreamDefaultController<Uint8Array>
  principal: AuthenticatedMcpPrincipal
  createdAt: number
}

const activeSessions = new Map<string, SseSession>()

/**
 * Registers a new SSE transport streaming session.
 */
export function registerSseSession(
  sessionId: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  principal: AuthenticatedMcpPrincipal
) {
  const session: SseSession = {
    sessionId,
    controller,
    principal,
    createdAt: Date.now(),
  }
  activeSessions.set(sessionId, session)
}

/**
 * Removes an SSE transport session when client disconnects.
 */
export function unregisterSseSession(sessionId: string) {
  activeSessions.delete(sessionId)
}

/**
 * Retrieves an active SSE transport session.
 */
export function getSseSession(sessionId: string): SseSession | undefined {
  return activeSessions.get(sessionId)
}

/**
 * Sends a JSON-RPC response message down the active SSE stream.
 */
export function sendSseMessage(sessionId: string, data: unknown): boolean {
  const session = activeSessions.get(sessionId)
  if (!session) {
    return false
  }

  try {
    const textEncoder = new TextEncoder()
    const payload = `event: message\ndata: ${JSON.stringify(data)}\n\n`
    session.controller.enqueue(textEncoder.encode(payload))
    return true
  } catch {
    activeSessions.delete(sessionId)
    return false
  }
}
