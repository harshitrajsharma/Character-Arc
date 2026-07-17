export type ToolGrantEffect = "allow" | "deny" | "ALLOW" | "DENY"

export type ToolGrantLike = Readonly<{
  permissionKey: string
  effect: ToolGrantEffect
  constraints?: unknown
}>

export type PermissionEvaluationContext = Readonly<{
  origin?: "installation" | "external"
  installationId?: string
  originInstallationId?: string | null
  blockTypeKeys?: readonly string[]
  entitlements?: ReadonlySet<string> | readonly string[]
}>

export type PermissionDenialReason =
  "explicit_deny" | "invalid_rule" | "not_allowed"

export type PermissionDecision =
  | Readonly<{ allowed: true; permissionKey: string }>
  | Readonly<{
      allowed: false
      permissionKey: string
      reason: PermissionDenialReason
    }>

export type RequiredPermissionsDecision =
  | Readonly<{ allowed: true }>
  | Readonly<{
      allowed: false
      permissionKey: string
      reason: PermissionDenialReason
    }>

type SupportedConstraints = Readonly<{
  origin?: "installation"
  blockTypeKeys?: readonly string[]
  requiresEntitlement?: string
}>

const CONSTRAINT_KEYS = new Set([
  "origin",
  "blockTypeKeys",
  "requiresEntitlement",
])

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function parseConstraints(input: unknown): SupportedConstraints | null {
  if (input === undefined) {
    return {}
  }

  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return null
  }

  const constraints = input as Record<string, unknown>

  if (Object.keys(constraints).some((key) => !CONSTRAINT_KEYS.has(key))) {
    return null
  }

  if ("origin" in constraints && constraints.origin !== "installation") {
    return null
  }

  if ("blockTypeKeys" in constraints) {
    if (
      !Array.isArray(constraints.blockTypeKeys) ||
      constraints.blockTypeKeys.some((key) => !isNonEmptyString(key))
    ) {
      return null
    }
  }

  if (
    "requiresEntitlement" in constraints &&
    !isNonEmptyString(constraints.requiresEntitlement)
  ) {
    return null
  }

  return constraints as SupportedConstraints
}

function hasInstallationOrigin(context: PermissionEvaluationContext) {
  const hasInstallationId = context.installationId !== undefined
  const hasOriginInstallationId = context.originInstallationId !== undefined

  if (hasInstallationId || hasOriginInstallationId) {
    return (
      isNonEmptyString(context.installationId) &&
      isNonEmptyString(context.originInstallationId) &&
      context.installationId === context.originInstallationId &&
      context.origin !== "external"
    )
  }

  return context.origin === "installation"
}

function hasEntitlement(
  entitlements: PermissionEvaluationContext["entitlements"],
  entitlement: string
) {
  if (!entitlements) {
    return false
  }

  const entitlementSet = entitlements as ReadonlySet<string>

  return typeof entitlementSet.has === "function"
    ? entitlementSet.has(entitlement)
    : (entitlements as readonly string[]).includes(entitlement)
}

function constraintsMatch(
  constraints: SupportedConstraints,
  context: PermissionEvaluationContext
) {
  if (constraints.origin && !hasInstallationOrigin(context)) {
    return false
  }

  if (constraints.blockTypeKeys) {
    const requestedBlockTypeKeys = context.blockTypeKeys

    if (!requestedBlockTypeKeys || requestedBlockTypeKeys.length === 0) {
      return false
    }

    const allowedBlockTypeKeys = new Set(constraints.blockTypeKeys)

    if (
      requestedBlockTypeKeys.some(
        (blockTypeKey) =>
          !isNonEmptyString(blockTypeKey) ||
          !allowedBlockTypeKeys.has(blockTypeKey)
      )
    ) {
      return false
    }
  }

  if (
    constraints.requiresEntitlement &&
    !hasEntitlement(context.entitlements, constraints.requiresEntitlement)
  ) {
    return false
  }

  return true
}

function normalizeEffect(effect: ToolGrantEffect): "allow" | "deny" | null {
  if (effect === "allow" || effect === "ALLOW") {
    return "allow"
  }

  if (effect === "deny" || effect === "DENY") {
    return "deny"
  }

  return null
}

export function evaluateToolPermission(
  grants: readonly ToolGrantLike[],
  permissionKey: string,
  context: PermissionEvaluationContext = {}
): PermissionDecision {
  let hasMatchingAllow = false
  let hasMatchingDeny = false
  let hasInvalidRule = false

  for (const grant of grants) {
    if (grant.permissionKey !== permissionKey) {
      continue
    }

    const effect = normalizeEffect(grant.effect)
    const constraints = parseConstraints(grant.constraints)

    if (!effect || !constraints) {
      hasInvalidRule = true
      continue
    }

    if (!constraintsMatch(constraints, context)) {
      continue
    }

    if (effect === "deny") {
      hasMatchingDeny = true
    } else {
      hasMatchingAllow = true
    }
  }

  if (hasInvalidRule) {
    return { allowed: false, permissionKey, reason: "invalid_rule" }
  }

  if (hasMatchingDeny) {
    return { allowed: false, permissionKey, reason: "explicit_deny" }
  }

  if (hasMatchingAllow) {
    return { allowed: true, permissionKey }
  }

  return { allowed: false, permissionKey, reason: "not_allowed" }
}

export function evaluateToolPermissions(
  grants: readonly ToolGrantLike[],
  requiredPermissions: readonly string[],
  context: PermissionEvaluationContext = {}
): RequiredPermissionsDecision {
  for (const permissionKey of requiredPermissions) {
    if (!isNonEmptyString(permissionKey)) {
      return { allowed: false, permissionKey, reason: "invalid_rule" }
    }

    const decision = evaluateToolPermission(grants, permissionKey, context)

    if (!decision.allowed) {
      return decision
    }
  }

  return { allowed: true }
}
