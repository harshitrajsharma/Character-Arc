// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import { Prisma, type PrismaClient } from "@/generated/prisma/client"
import type { User } from "@supabase/supabase-js"
import { provisionUserIdentity } from "@/lib/auth/provision-user"
import { listFirstPartyToolManifests } from "@/lib/tools/registry"
import { ensureToolDefaultGrants } from "@/lib/tools/installation-grants"
import { evaluateToolPermissions } from "@/lib/tools/permissions"

const user = {
  id: "user",
  app_metadata: {},
  aud: "authenticated",
  created_at: "2026-11-10T00:00:00.000Z",
  user_metadata: {
    full_name: "Test learner",
    avatar_url: "https://example.test/avatar",
  },
} as User
const manifests = listFirstPartyToolManifests()
const definitions = manifests.map((manifest, index) => ({
  id: `definition-${index}`,
  key: manifest.tool.key,
  releases: [{ id: `release-${index}`, version: manifest.release.version }],
}))
function setup(
  options: {
    profileMissing?: boolean
    existing?: boolean
    race?: boolean
    grantFailure?: boolean
    registryUnavailable?: boolean
  } = {}
) {
  let workspace = options.existing
    ? { id: "existing", slug: "personal-user" }
    : null
  let inTransaction = false
  let workspaceReads = 0
  let definitionReads = 0
  let transactions = 0
  let profilesCreated = 0
  let profile = options.profileMissing
    ? null
    : {
        id: "user",
        displayName: "Test learner",
        avatarUrl: "https://example.test/avatar",
      }
  const installations: Array<{ id: string; data: Record<string, unknown> }> = []
  const grants: Array<{
    installationId: string
    permissionKey: string
    effect: string
    constraints: unknown
  }> = []
  const memberships: Array<{
    create: Record<string, unknown>
    update?: Record<string, unknown>
  }> = []
  const tx = {
    workspace: {
      create: async () => {
        expect(inTransaction).toBe(true)
        if (options.race) {
          workspace = { id: "concurrent-winner", slug: "personal-user" }
          throw new Prisma.PrismaClientKnownRequestError("Already created", {
            code: "P2002",
            clientVersion: "test",
          })
        }
        workspace = { id: "new-workspace", slug: "personal-user" }
        return workspace
      },
    },
    workspaceMember: {
      create: async (args: { data: Record<string, unknown> }) => {
        expect(inTransaction).toBe(true)
        memberships.push({ create: args.data })
        return args.data
      },
    },
    toolDefinition: {
      findMany: async (args: Prisma.ToolDefinitionFindManyArgs) => {
        expect(inTransaction).toBe(true)
        expect(args.where?.enabled).toBe(true)
        definitionReads++
        return options.registryUnavailable ? [] : definitions
      },
    },
    toolInstallation: {
      create: async (args: { data: Record<string, unknown> }) => {
        expect(inTransaction).toBe(true)
        const installation = {
          id: `installation-${installations.length}`,
          data: args.data,
        }
        installations.push(installation)
        return installation
      },
    },
    toolGrant: {
      upsert: async (args: {
        create: (typeof grants)[number]
        update: Record<string, unknown>
      }) => {
        expect(inTransaction).toBe(true)
        expect(args.update).toEqual({})
        if (options.grantFailure)
          throw new Error("Synthetic permission failure")
        grants.push(args.create)
        return args.create
      },
    },
  }
  const db = {
    profile: {
      findUnique: async () => profile,
      create: async (args: { data: NonNullable<typeof profile> }) => {
        profilesCreated++
        profile = args.data
        return profile
      },
    },
    workspace: {
      findFirst: async () => {
        workspaceReads++
        return workspace
      },
    },
    workspaceMember: {
      upsert: async (args: {
        create: Record<string, unknown>
        update: Record<string, unknown>
      }) => {
        memberships.push(args)
        return args.create
      },
    },
    // An accidental old-path upsert would fail the test rather than repairing consent silently.
    toolInstallation: {
      upsert: async () => {
        throw new Error("Unexpected installation mutation")
      },
    },
    toolDefinition: {
      findMany: async () => {
        throw new Error("Unexpected registry read on existing workspace")
      },
    },
    $transaction: async (
      operation: (client: typeof tx) => Promise<unknown>
    ) => {
      transactions++
      inTransaction = true
      try {
        return await operation(tx)
      } finally {
        inTransaction = false
      }
    },
  } as unknown as PrismaClient
  return {
    db,
    installations,
    grants,
    memberships,
    counts: () => ({ workspaceReads, definitionReads, transactions }),
    profilesCreated: () => profilesCreated,
  }
}

describe("personal workspace provisioning lifecycle", () => {
  test("existing workspaces never reinstall removed/missing tools or alter grants", async () => {
    const state = setup({ existing: true })
    await provisionUserIdentity(state.db, user)
    await provisionUserIdentity(state.db, user)
    expect(state.counts()).toEqual({
      workspaceReads: 2,
      definitionReads: 0,
      transactions: 0,
    })
    expect(state.installations).toEqual([])
    expect(state.grants).toEqual([])
    expect(
      state.memberships.every(
        (member) => JSON.stringify(member.update) === "{}"
      )
    ).toBe(true)
  })
  test("new workspace ownership, tool setup and usable grants share one transaction", async () => {
    const state = setup({ profileMissing: true })
    await provisionUserIdentity(state.db, user)
    expect(state.counts().transactions).toBe(1)
    expect(state.profilesCreated()).toBe(1)
    expect(state.installations.length).toBe(3)
    for (const [index, manifest] of manifests.entries()) {
      const installation = state.installations.find(
        (item) => item.data.toolDefinitionId === `definition-${index}`
      )!
      expect(installation.data).toMatchObject({
        workspaceId: "new-workspace",
        installedById: user.id,
        status: "ACTIVE",
        toolReleaseId: `release-${index}`,
      })
      const grants = state.grants.filter(
        (grant) => grant.installationId === installation.id
      )
      expect(grants.length).toBe(manifest.defaultGrants.length)
      const action = manifest.actions[0]
      expect(
        evaluateToolPermissions(
          grants as Parameters<typeof evaluateToolPermissions>[0],
          action.requiredPermissions,
          {
            installationId: installation.id,
            originInstallationId: installation.id,
            blockTypeKeys: [
              ...action.output.createsBlockTypeKeys,
              ...action.output.writesBlockTypeKeys,
            ],
          }
        ).allowed
      ).toBe(true)
    }
    await provisionUserIdentity(state.db, user)
    expect(state.installations.length).toBe(3)
    expect(state.counts().transactions).toBe(1)
  })
  test("permission failures propagate out of workspace creation rather than leaving silent grantless success", async () => {
    const state = setup({ grantFailure: true })
    await expect(provisionUserIdentity(state.db, user)).rejects.toThrow(
      "Synthetic permission failure"
    )
    expect(state.memberships.length).toBe(1) // Only the transactional member creation was attempted.
  })
  test("a concurrent workspace winner is reused without applying defaults again", async () => {
    const state = setup({ race: true })
    await provisionUserIdentity(state.db, user)
    expect(state.counts().workspaceReads).toBe(2)
    expect(state.installations).toEqual([])
    expect(state.grants).toEqual([])
    expect(state.memberships[0].create.workspaceId).toBe("concurrent-winner")
  })
  test("an intentionally unavailable registry does not invent an installation", async () => {
    const state = setup({ registryUnavailable: true })
    await provisionUserIdentity(state.db, user)
    expect(state.installations).toEqual([])
    expect(state.grants).toEqual([])
  })
})

describe("shared installation grant defaults", () => {
  test("re-enable preserves a customized deny while seeding missing permissions", async () => {
    const existing = {
      effect: "DENY",
      constraints: { blockTypeKeys: ["restricted"] },
    }
    const stored = new Map<string, unknown>([["blocks.read.owned", existing]])
    const db = {
      toolGrant: {
        upsert: async (args: {
          create: { permissionKey: string }
          update: Record<string, unknown>
        }) => {
          expect(args.update).toEqual({})
          if (!stored.has(args.create.permissionKey))
            stored.set(args.create.permissionKey, args.create)
          return stored.get(args.create.permissionKey)
        },
      },
    } as unknown as Pick<Prisma.TransactionClient, "toolGrant">
    await ensureToolDefaultGrants(db, "workspace", "installation", [
      { permissionKey: "blocks.read.owned", effect: "allow", constraints: {} },
      { permissionKey: "blocks.write.owned", effect: "allow", constraints: {} },
    ])
    expect(stored.get("blocks.read.owned")).toBe(existing)
    expect(stored.get("blocks.write.owned")).toMatchObject({
      effect: "ALLOW",
      workspaceId: "workspace",
      installationId: "installation",
    })
  })
})
