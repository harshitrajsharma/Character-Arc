// @ts-expect-error -- Bun provides this module at test runtime; the repo omits Bun types.
import { describe, expect, test } from "bun:test"

import {
  evaluateToolPermission,
  evaluateToolPermissions,
  type ToolGrantLike,
} from "../../lib/tools/permissions"

const installationContext = {
  installationId: "installation-1",
  originInstallationId: "installation-1",
  blockTypeKeys: ["goals-paths.arc", "goals-paths.milestone"],
  entitlements: new Set(["in_app_ai"]),
} as const

describe("evaluateToolPermission", () => {
  test("allows an applicable allow rule", () => {
    const grants: ToolGrantLike[] = [
      {
        permissionKey: "blocks.write.owned",
        effect: "allow",
        constraints: {},
      },
    ]

    expect(
      evaluateToolPermission(grants, "blocks.write.owned", {}).allowed
    ).toBe(true)
  })

  test("defaults to denied when no allow rule applies", () => {
    expect(evaluateToolPermission([], "blocks.write.owned", {})).toEqual({
      allowed: false,
      permissionKey: "blocks.write.owned",
      reason: "not_allowed",
    })
  })

  test("lets an applicable deny override allows regardless of grant order", () => {
    const allow: ToolGrantLike = {
      permissionKey: "ai.generate",
      effect: "allow",
      constraints: {},
    }
    const deny: ToolGrantLike = {
      permissionKey: "ai.generate",
      effect: "DENY",
      constraints: {},
    }

    expect(evaluateToolPermission([allow, deny], "ai.generate")).toEqual({
      allowed: false,
      permissionKey: "ai.generate",
      reason: "explicit_deny",
    })
    expect(evaluateToolPermission([deny, allow], "ai.generate")).toEqual({
      allowed: false,
      permissionKey: "ai.generate",
      reason: "explicit_deny",
    })
  })

  test("supports installation origin by identity or explicit origin", () => {
    const grants: ToolGrantLike[] = [
      {
        permissionKey: "blocks.read.owned",
        effect: "ALLOW",
        constraints: { origin: "installation" },
      },
    ]

    expect(
      evaluateToolPermission(grants, "blocks.read.owned", installationContext)
        .allowed
    ).toBe(true)
    expect(
      evaluateToolPermission(grants, "blocks.read.owned", {
        origin: "installation",
      }).allowed
    ).toBe(true)
    expect(
      evaluateToolPermission(grants, "blocks.read.owned", {
        installationId: "installation-1",
        originInstallationId: "installation-2",
      }).allowed
    ).toBe(false)
  })

  test("requires every requested block type to be allowed", () => {
    const grants: ToolGrantLike[] = [
      {
        permissionKey: "blocks.write.owned",
        effect: "allow",
        constraints: {
          blockTypeKeys: ["goals-paths.arc", "goals-paths.milestone"],
        },
      },
    ]

    expect(
      evaluateToolPermission(grants, "blocks.write.owned", installationContext)
        .allowed
    ).toBe(true)
    expect(
      evaluateToolPermission(grants, "blocks.write.owned", {
        blockTypeKeys: ["goals-paths.arc", "another-tool.block"],
      }).allowed
    ).toBe(false)
    expect(
      evaluateToolPermission(grants, "blocks.write.owned", {}).allowed
    ).toBe(false)
  })

  test("requires the named entitlement", () => {
    const grants: ToolGrantLike[] = [
      {
        permissionKey: "ai.generate",
        effect: "allow",
        constraints: { requiresEntitlement: "in_app_ai" },
      },
    ]

    expect(
      evaluateToolPermission(grants, "ai.generate", installationContext).allowed
    ).toBe(true)
    expect(
      evaluateToolPermission(grants, "ai.generate", {
        entitlements: ["another_entitlement"],
      }).allowed
    ).toBe(false)
  })

  test("combines supported constraints with AND semantics", () => {
    const grants: ToolGrantLike[] = [
      {
        permissionKey: "blocks.write.owned",
        effect: "allow",
        constraints: {
          origin: "installation",
          blockTypeKeys: ["goals-paths.arc", "goals-paths.milestone"],
          requiresEntitlement: "in_app_ai",
        },
      },
    ]

    expect(
      evaluateToolPermission(grants, "blocks.write.owned", installationContext)
        .allowed
    ).toBe(true)
    expect(
      evaluateToolPermission(grants, "blocks.write.owned", {
        ...installationContext,
        entitlements: [],
      }).allowed
    ).toBe(false)
  })

  test("fails closed for unknown or malformed constraints", () => {
    const validAllow: ToolGrantLike = {
      permissionKey: "blocks.write.owned",
      effect: "allow",
      constraints: {},
    }
    const invalidRules = [
      { constraints: { workspaceId: "workspace-1" } },
      { constraints: null },
      { constraints: { origin: "workspace" } },
      { constraints: { blockTypeKeys: ["goals-paths.arc", 42] } },
      { constraints: { requiresEntitlement: "" } },
    ]

    for (const invalidRule of invalidRules) {
      const malformedGrant = {
        permissionKey: "blocks.write.owned",
        effect: "allow",
        ...invalidRule,
      } as ToolGrantLike

      expect(
        evaluateToolPermission(
          [validAllow, malformedGrant],
          "blocks.write.owned",
          installationContext
        )
      ).toEqual({
        allowed: false,
        permissionKey: "blocks.write.owned",
        reason: "invalid_rule",
      })
    }
  })

  test("only applies a scoped deny when its constraints match", () => {
    const grants: ToolGrantLike[] = [
      {
        permissionKey: "blocks.read.owned",
        effect: "allow",
        constraints: {},
      },
      {
        permissionKey: "blocks.read.owned",
        effect: "deny",
        constraints: { blockTypeKeys: ["private.note"] },
      },
    ]

    expect(
      evaluateToolPermission(grants, "blocks.read.owned", {
        blockTypeKeys: ["goals-paths.arc"],
      }).allowed
    ).toBe(true)
    expect(
      evaluateToolPermission(grants, "blocks.read.owned", {
        blockTypeKeys: ["private.note"],
      }).allowed
    ).toBe(false)
  })
})

describe("evaluateToolPermissions", () => {
  test("requires every permission to be allowed", () => {
    const grants: ToolGrantLike[] = [
      {
        permissionKey: "blocks.write.owned",
        effect: "allow",
        constraints: {},
      },
      {
        permissionKey: "ai.generate",
        effect: "deny",
        constraints: {},
      },
    ]

    expect(
      evaluateToolPermissions(
        grants,
        ["blocks.write.owned", "ai.generate"],
        installationContext
      )
    ).toEqual({
      allowed: false,
      permissionKey: "ai.generate",
      reason: "explicit_deny",
    })
  })

  test("allows an action when all required permissions are allowed", () => {
    const grants: ToolGrantLike[] = [
      {
        permissionKey: "blocks.write.owned",
        effect: "allow",
        constraints: {},
      },
      {
        permissionKey: "ai.generate",
        effect: "allow",
        constraints: { requiresEntitlement: "in_app_ai" },
      },
    ]

    expect(
      evaluateToolPermissions(
        grants,
        ["blocks.write.owned", "ai.generate"],
        installationContext
      )
    ).toEqual({ allowed: true })
  })
})
