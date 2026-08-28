"use client"

import * as React from "react"
import { useTransition } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import {
  SettingsIcon,
  UserIcon,
  SunIcon,
  MoonIcon,
  LaptopIcon,
  BuildingIcon,
  CpuIcon,
  ZapIcon,
  WrenchIcon,
  UsersIcon,
  CopyIcon,
  CheckIcon,
  PlusIcon,
  Trash2Icon,
  ArrowUpRightIcon,
  XIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  KeyIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createMcpToken, revokeMcpToken } from "@/lib/mcp/token-actions"
import type { ToolManifest } from "@/lib/tools/contracts"
import type { ToolCatalogItem } from "@/lib/tools/catalog"
import { cn } from "@/lib/utils"

export type SettingsSectionKey =
  | "profile"
  | "appearance"
  | "workspace"
  | "mcp"
  | "tools"
  | "members"

type TokenItem = {
  id: string
  name: string
  keyPrefix: string
  createdAt: string
  lastUsedAt: string | null
}

type WorkspaceMemberItem = {
  userId: string
  role: string
  joinedAt: string
  displayName: string | null
  avatarUrl: string | null
}

export type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultSection?: SettingsSectionKey
  user?: {
    name: string
    email: string
    avatarUrl?: string
    initials: string
  }
  workspace: {
    id: string
    name: string
    slug: string
    description: string | null
    kind: string
    createdAt: string
  }
  members: WorkspaceMemberItem[]
  initialTokens: TokenItem[]
  manifests: ToolManifest[]
  catalogItems: ToolCatalogItem[]
  origin: string
}

type NavItem = {
  key: SettingsSectionKey
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  badge?: string
  count?: number
}

type NavCategory = {
  group: string
  items: NavItem[]
}

export function SettingsDialog({
  open,
  onOpenChange,
  defaultSection = "profile",
  user,
  workspace,
  members,
  initialTokens,
  catalogItems,
  origin,
}: SettingsDialogProps) {
  const [activeSection, setActiveSection] = React.useState<SettingsSectionKey>(defaultSection)
  const [mobileSubSection, setMobileSubSection] = React.useState<SettingsSectionKey | null>(null)
  const [tokens, setTokens] = React.useState<TokenItem[]>(initialTokens)
  const [isCreateKeyOpen, setIsCreateKeyOpen] = React.useState(false)
  const [keyName, setKeyName] = React.useState("")
  const [newlyCreatedKey, setNewlyCreatedKey] = React.useState<string | null>(null)
  const [copiedField, setCopiedField] = React.useState<string | null>(null)
  const [activeSnippetTab, setActiveSnippetTab] = React.useState<"claude" | "cursor">("claude")
  const [isPending, startTransition] = useTransition()
  const { theme, setTheme } = useTheme()

  const mcpEndpointUrl = `${origin}/api/mcp`
  const sseEndpointUrl = `${origin}/api/mcp/sse`

  const [lastSyncedKey, setLastSyncedKey] = React.useState<string | null>(null)
  const nextSyncKey = `${open}:${defaultSection}`
  if (lastSyncedKey !== nextSyncKey) {
    setLastSyncedKey(nextSyncKey)
    if (open && defaultSection) {
      setActiveSection(defaultSection)
      setMobileSubSection(null)
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text)
    setCopiedField(label)
    toast.success(`Copied ${label} to clipboard`)
    setTimeout(() => setCopiedField(null), 2000)
  }

  function handleCreateToken() {
    if (!keyName.trim()) {
      toast.error("Please enter a name for the API Key.")
      return
    }

    startTransition(async () => {
      try {
        const res = await createMcpToken({
          workspaceId: workspace.id,
          name: keyName,
        })
        setTokens((prev) => [
          {
            id: res.id,
            name: res.name,
            keyPrefix: res.keyPrefix,
            createdAt: res.createdAt,
            lastUsedAt: null,
          },
          ...prev,
        ])
        setNewlyCreatedKey(res.rawSecret)
        setKeyName("")
        toast.success("API Token generated successfully.")
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Failed to generate API token."
        )
      }
    })
  }

  function handleRevokeToken(tokenId: string) {
    if (!confirm("Are you sure you want to revoke this API token? External agents using it will be disconnected.")) {
      return
    }

    startTransition(async () => {
      try {
        await revokeMcpToken({ workspaceId: workspace.id, tokenId })
        setTokens((prev) => prev.filter((t) => t.id !== tokenId))
        toast.success("API token revoked.")
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Failed to revoke API token."
        )
      }
    })
  }

  const claudeConfig = JSON.stringify(
    {
      mcpServers: {
        "character-arc": {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-fetch", mcpEndpointUrl],
          env: {
            AUTHORIZATION: "Bearer <YOUR_MCP_API_KEY>",
            X_WORKSPACE_ID: workspace.id,
          },
        },
      },
    },
    null,
    2
  )

  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        "character-arc": {
          url: sseEndpointUrl,
          headers: {
            Authorization: "Bearer <YOUR_MCP_API_KEY>",
            "x-workspace-id": workspace.id,
          },
        },
      },
    },
    null,
    2
  )

  const navCategories: NavCategory[] = [
    {
      group: "Preferences",
      items: [
        {
          key: "profile" as SettingsSectionKey,
          label: "Profile & Identity",
          icon: UserIcon,
          color: "text-blue-500",
        },
        {
          key: "appearance" as SettingsSectionKey,
          label: "Appearance",
          icon: SunIcon,
          color: "text-amber-500",
        },
      ],
    },
    {
      group: "Workspace",
      items: [
        {
          key: "workspace" as SettingsSectionKey,
          label: "Workspace Profile",
          icon: BuildingIcon,
          color: "text-indigo-500",
        },
        {
          key: "members" as SettingsSectionKey,
          label: "Members & Access",
          icon: UsersIcon,
          color: "text-purple-500",
          count: members.length,
        },
      ],
    },
    {
      group: "AI & Gateways",
      items: [
        {
          key: "mcp" as SettingsSectionKey,
          label: "MCP & AI Gateways",
          icon: CpuIcon,
          color: "text-emerald-500",
          badge: tokens.length ? `${tokens.length} keys` : undefined,
        },
        {
          key: "tools" as SettingsSectionKey,
          label: "Installed Tools",
          icon: WrenchIcon,
          color: "text-cyan-500",
          count: catalogItems.filter((i) => i.installationStatus === "active").length,
        },
      ],
    },
  ]

  // Renderers for Each Section in Apple Grouped Inset Style
  function renderSectionContent(section: SettingsSectionKey) {
    switch (section) {
      case "profile":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Profile & Identity</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Your personal identity across Character Arc workspaces.</p>
            </div>

            <div className="rounded-2xl border border-border/40 bg-muted/20 p-5 space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="size-16 border-2 border-border/60 shadow-xs">
                  {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
                  <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                    {user?.initials || "CA"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-foreground truncate">{user?.name || "Account User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email || "No email"}</p>
                  <span className="inline-flex mt-1.5 items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                    Verified Account
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Account Attributes</p>
              <div className="rounded-2xl border border-border/40 bg-muted/20 divide-y divide-border/30 overflow-hidden text-sm">
                <div className="flex items-center justify-between p-4">
                  <span className="font-medium text-foreground">Display Name</span>
                  <span className="text-muted-foreground font-mono text-xs">{user?.name || "Not set"}</span>
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="font-medium text-foreground">Email Address</span>
                  <span className="text-muted-foreground font-mono text-xs">{user?.email || "Not set"}</span>
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="font-medium text-foreground">Workspace Membership</span>
                  <span className="text-xs font-medium capitalize bg-muted px-2 py-0.5 rounded-md">
                    {workspace.name} ({workspace.kind.toLowerCase()})
                  </span>
                </div>
              </div>
            </div>
          </div>
        )

      case "appearance":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Appearance</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Customize how Character Arc looks and feels on your device.</p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Color Theme</p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all",
                    theme === "light"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                      : "border-border/50 bg-muted/20 hover:bg-muted/40 text-muted-foreground"
                  )}
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                    <SunIcon className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Light</p>
                    <p className="text-[10px] text-muted-foreground">Clean & crisp</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all",
                    theme === "dark"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                      : "border-border/50 bg-muted/20 hover:bg-muted/40 text-muted-foreground"
                  )}
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                    <MoonIcon className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Dark</p>
                    <p className="text-[10px] text-muted-foreground">Easy on eyes</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all",
                    theme === "system"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                      : "border-border/50 bg-muted/20 hover:bg-muted/40 text-muted-foreground"
                  )}
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                    <LaptopIcon className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">System</p>
                    <p className="text-[10px] text-muted-foreground">Auto-match OS</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Atmospheric Experience</p>
              <div className="rounded-2xl border border-border/40 bg-muted/20 divide-y divide-border/30 overflow-hidden text-sm">
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-foreground">Day Phase Pulse</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Atmospheric lighting and day progress tracker in navbar.</p>
                  </div>
                  <Badge variant="outline" className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Active
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )

      case "workspace":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Workspace Profile</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Manage tenancy configuration and database identifiers.</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">General Info</p>
              <div className="rounded-2xl border border-border/40 bg-muted/20 divide-y divide-border/30 overflow-hidden text-sm">
                <div className="flex items-center justify-between p-4">
                  <span className="font-medium text-foreground">Workspace Name</span>
                  <span className="font-semibold text-foreground">{workspace.name}</span>
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="font-medium text-foreground">Workspace Slug</span>
                  <span className="font-mono text-xs text-muted-foreground">{workspace.slug}</span>
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="font-medium text-foreground">Workspace Type</span>
                  <span className="capitalize text-xs font-medium bg-muted px-2 py-0.5 rounded-md">
                    {workspace.kind.toLowerCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="font-medium text-foreground">Created On</span>
                  <span className="text-xs text-muted-foreground">{new Date(workspace.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Tenancy Identifier</p>
              <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm text-foreground">Workspace UUID</span>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{workspace.id}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 rounded-full"
                    onClick={() => copyToClipboard(workspace.id, "Workspace ID")}
                  >
                    {copiedField === "Workspace ID" ? <CheckIcon className="size-3.5 text-emerald-600" /> : <CopyIcon className="size-3.5" />}
                    <span>Copy</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )

      case "mcp":
        return (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">MCP & AI Gateways</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Connect external AI models (Claude, Cursor, local agents) to Character Arc.
                </p>
              </div>
              <Dialog open={isCreateKeyOpen} onOpenChange={setIsCreateKeyOpen}>
                <DialogTrigger
                  render={
                    <Button size="sm" className="gap-1.5 rounded-full">
                      <PlusIcon className="size-4" />
                      Generate Key
                    </Button>
                  }
                />
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Generate MCP API Key</DialogTitle>
                    <DialogDescription>
                      Name your key to identify which AI agent or workstation is using it.
                    </DialogDescription>
                  </DialogHeader>

                  {newlyCreatedKey ? (
                    <div className="space-y-4 py-2">
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                        <strong>Important:</strong> Copy this secret key now. You will not be able to view it again!
                      </div>
                      <div className="flex items-center gap-2 rounded-xl bg-muted p-2.5 text-xs font-mono">
                        <span className="truncate flex-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          {newlyCreatedKey}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 shrink-0"
                          onClick={() => copyToClipboard(newlyCreatedKey, "API Secret Key")}
                        >
                          {copiedField === "API Secret Key" ? (
                            <CheckIcon className="size-3.5 text-emerald-600" />
                          ) : (
                            <CopyIcon className="size-3.5" />
                          )}
                        </Button>
                      </div>
                      <DialogFooter>
                        <Button
                          className="w-full rounded-full"
                          onClick={() => {
                            setNewlyCreatedKey(null)
                            setIsCreateKeyOpen(false)
                          }}
                        >
                          Done
                        </Button>
                      </DialogFooter>
                    </div>
                  ) : (
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-foreground">Key Name</label>
                        <Input
                          placeholder="e.g. Claude Desktop, Cursor Workstation"
                          value={keyName}
                          onChange={(e) => setKeyName(e.target.value)}
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsCreateKeyOpen(false)}
                          className="rounded-full"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateToken}
                          disabled={isPending}
                          className="rounded-full"
                        >
                          {isPending ? "Generating..." : "Generate Key"}
                        </Button>
                      </DialogFooter>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            {/* Endpoints Group */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Connection Endpoints</p>
              <div className="rounded-2xl border border-border/40 bg-muted/20 divide-y divide-border/30 overflow-hidden text-sm">
                <div className="flex items-center justify-between p-4 gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <ZapIcon className="size-4 text-amber-500" />
                      <span className="font-medium text-foreground">HTTP POST (Stateless)</span>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground truncate mt-0.5">{mcpEndpointUrl}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 rounded-full shrink-0"
                    onClick={() => copyToClipboard(mcpEndpointUrl, "HTTP Endpoint")}
                  >
                    {copiedField === "HTTP Endpoint" ? <CheckIcon className="size-3.5 text-emerald-600" /> : <CopyIcon className="size-3.5" />}
                    <span>Copy</span>
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <CpuIcon className="size-4 text-indigo-500" />
                      <span className="font-medium text-foreground">SSE Stream (Stateful)</span>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground truncate mt-0.5">{sseEndpointUrl}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 rounded-full shrink-0"
                    onClick={() => copyToClipboard(sseEndpointUrl, "SSE Endpoint")}
                  >
                    {copiedField === "SSE Endpoint" ? <CheckIcon className="size-3.5 text-emerald-600" /> : <CopyIcon className="size-3.5" />}
                    <span>Copy</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Active API Keys List */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Active API Keys</p>
              <div className="rounded-2xl border border-border/40 bg-muted/20 divide-y divide-border/30 overflow-hidden text-sm">
                {tokens.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-xs">
                    <KeyIcon className="size-6 mx-auto mb-2 opacity-50" />
                    No API keys generated yet. Click &quot;Generate Key&quot; above to create one.
                  </div>
                ) : (
                  tokens.map((token) => (
                    <div key={token.id} className="flex items-center justify-between p-4 gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-sm truncate">{token.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{token.keyPrefix}••••••</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-muted-foreground hidden sm:inline">
                          Created {new Date(token.createdAt).toLocaleDateString()}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-full"
                          onClick={() => handleRevokeToken(token.id)}
                          disabled={isPending}
                          aria-label={`Revoke key ${token.name}`}
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Agent Snippets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client Config Snippets</p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveSnippetTab("claude")}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                      activeSnippetTab === "claude" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    Claude Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSnippetTab("cursor")}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                      activeSnippetTab === "cursor" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    Cursor / VSCode
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-border/40 bg-muted/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {activeSnippetTab === "claude" ? "claude_desktop_config.json" : "mcp.json"}
                  </span>
                  <Button
                    size="xs"
                    variant="outline"
                    className="gap-1 rounded-full text-xs"
                    onClick={() =>
                      copyToClipboard(
                        activeSnippetTab === "claude" ? claudeConfig : cursorConfig,
                        activeSnippetTab === "claude" ? "Claude Config" : "Cursor Config"
                      )
                    }
                  >
                    <CopyIcon className="size-3" />
                    Copy JSON
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-xl bg-background/80 p-3 text-xs font-mono text-foreground border border-border/40">
                  {activeSnippetTab === "claude" ? claudeConfig : cursorConfig}
                </pre>
              </div>
            </div>
          </div>
        )

      case "tools":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Installed Tools</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Manage domain capabilities and tool structures in this workspace.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {catalogItems.map((item) => (
                <div
                  key={item.key}
                  className="flex flex-col justify-between rounded-2xl border border-border/40 bg-muted/20 p-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        variant={item.installationStatus === "active" ? "default" : "secondary"}
                        className="capitalize text-[11px] rounded-full"
                      >
                        {item.installationStatus === "active" ? "Active" : "Available"}
                      </Badge>
                      <span className="text-[10px] font-mono text-muted-foreground capitalize">{item.category}</span>
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">{item.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-mono text-[11px]">{item.actionNames.length} actions</span>
                    {item.installationStatus === "active" ? (
                      <Link
                        href={`/workspace/${encodeURIComponent(workspace.slug)}/${item.key.replace("core.", "")}`}
                        onClick={() => onOpenChange(false)}
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        Open <ArrowUpRightIcon className="size-3" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case "members":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Members & Access</h2>
              <p className="text-xs text-muted-foreground mt-0.5">People with access to view or collaborate in this workspace.</p>
            </div>

            <div className="rounded-2xl border border-border/40 bg-muted/20 divide-y divide-border/30 overflow-hidden text-sm">
              {members.map((member) => (
                <div key={member.userId} className="flex items-center justify-between p-4 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar size="sm" className="size-8">
                      {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
                      <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                        {(member.displayName || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{member.displayName || "Workspace Member"}</p>
                      <p className="text-[11px] text-muted-foreground">Joined {new Date(member.joinedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize text-xs font-mono rounded-full">
                    {member.role.toLowerCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 p-0 sm:max-w-4xl h-[620px] max-h-[90vh] overflow-hidden rounded-3xl border border-border/60 bg-background/95 backdrop-blur-2xl shadow-2xl flex flex-col"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Character Arc Settings</DialogTitle>
          <DialogDescription>Manage your workspace, profile, appearance, and MCP AI gateways.</DialogDescription>
        </DialogHeader>

        {/* Header Bar */}
        <div className="flex h-13 shrink-0 items-center justify-between border-b border-border/40 px-5 bg-background/50">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-foreground/5 text-foreground">
              <SettingsIcon className="size-4" />
            </span>
            <span className="font-semibold text-sm text-foreground">Settings</span>
            <Badge variant="outline" className="text-[11px] font-normal hidden sm:inline-block rounded-full">
              {workspace.name}
            </Badge>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close settings"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* Desktop Two-Pane Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Navigation Sidebar */}
          <aside className="w-56 shrink-0 border-r border-border/40 bg-muted/15 p-3 overflow-y-auto hidden md:flex flex-col justify-between">
            <div className="space-y-4">
              {navCategories.map((cat) => (
                <div key={cat.group} className="space-y-1">
                  <p className="px-2.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                    {cat.group}
                  </p>
                  <nav className="space-y-0.5">
                    {cat.items.map((item) => {
                      const Icon = item.icon
                      const isActive = activeSection === item.key

                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setActiveSection(item.key)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-all text-left outline-none",
                            isActive
                              ? "bg-foreground/10 text-foreground font-semibold shadow-2xs dark:bg-foreground/15"
                              : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className={cn("size-4 shrink-0", item.color)} />
                            <span className="truncate">{item.label}</span>
                          </div>
                          {item.badge ? (
                            <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[9px] font-semibold text-primary">
                              {item.badge}
                            </span>
                          ) : item.count !== undefined ? (
                            <span className="text-[10px] font-mono text-muted-foreground">{item.count}</span>
                          ) : null}
                        </button>
                      )
                    })}
                  </nav>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border/30 px-2 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Press <kbd className="font-mono text-[10px] bg-muted px-1 py-0.5 rounded">Esc</kbd> to close</span>
            </div>
          </aside>

          {/* Right Main Content Pane (Desktop) */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8 hidden md:block">
            {renderSectionContent(activeSection)}
          </main>

          {/* Mobile Drill-Down Layout (< 768px) */}
          <div className="flex-1 overflow-y-auto p-4 md:hidden">
            {mobileSubSection ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setMobileSubSection(null)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline mb-2"
                >
                  <ChevronLeftIcon className="size-4" />
                  All Settings
                </button>
                {renderSectionContent(mobileSubSection)}
              </div>
            ) : (
              <div className="space-y-5">
                {navCategories.map((cat) => (
                  <div key={cat.group} className="space-y-1.5">
                    <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {cat.group}
                    </p>
                    <div className="rounded-2xl border border-border/40 bg-muted/20 divide-y divide-border/30 overflow-hidden">
                      {cat.items.map((item) => {
                        const Icon = item.icon

                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setMobileSubSection(item.key)}
                            className="flex w-full items-center justify-between p-3.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
                          >
                            <div className="flex items-center gap-3">
                              <Icon className={cn("size-4.5", item.color)} />
                              <span>{item.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.badge ? (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                  {item.badge}
                                </span>
                              ) : null}
                              <ChevronRightIcon className="size-4 text-muted-foreground" />
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
