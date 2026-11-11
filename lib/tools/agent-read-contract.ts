/** Shared bounded inputs for manifest-driven agent inventory/context reads. */
export const agentReadPageProperties = {
  search: { type: "string", maxLength: 120 },
  limit: { type: "integer", minimum: 1, maximum: 50 },
  cursor: { type: "string", minLength: 1, maxLength: 512 },
}
