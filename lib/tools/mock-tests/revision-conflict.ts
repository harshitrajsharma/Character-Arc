/**
 * Shared marker for optimistic-concurrency conflicts on mock-test blocks.
 *
 * The handler (server) and the client save-error helper both import this so
 * the user-facing message stays in sync across the server-action boundary,
 * where custom error classes are not serialized.
 */
export const REVISION_CONFLICT_MESSAGE =
  "This test changed in another session. Reload to sync, then try again."
