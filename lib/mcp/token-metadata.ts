/** Never return a recoverable legacy secret through token-list DTOs. */
export function maskMcpTokenPrefix(prefix: string) {
  return `${prefix.slice(0, 16)}…`
}
