import { createHash } from "node:crypto"
import { parseArgs } from "node:util"

const options = {
  "workspace-slug": { type: "string" as const },
  "actor-id": { type: "string" as const },
  confirm: { type: "boolean" as const },
}

export type GateCsDemoSeedArguments = {
  workspaceSlug?: string
  actorId?: string
  confirm: boolean
}

export function getGateCsDemoIdempotencyKey(action: string, identifier: string) {
  const prefix = `seed-gate-2027-${action}`
  const normalizedIdentifier = identifier
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase()
  const fullKey = `${prefix}-${normalizedIdentifier}`

  if (fullKey.length <= 128) {
    return fullKey
  }

  const suffix = createHash("sha256").update(fullKey).digest("hex").slice(0, 12)
  const remainingLength = 128 - prefix.length - suffix.length - 2

  return `${prefix}-${normalizedIdentifier.slice(0, remainingLength)}-${suffix}`
}

export function parseGateCsDemoSeedArguments(
  args: string[]
): GateCsDemoSeedArguments {
  const { values } = parseArgs({ args, options, strict: true })

  return {
    workspaceSlug: values["workspace-slug"],
    actorId: values["actor-id"],
    confirm: values.confirm === true,
  }
}
