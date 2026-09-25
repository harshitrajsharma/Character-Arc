"use client"

import * as React from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import {
  BotIcon,
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  GlobeIcon,
  KeyRoundIcon,
  LaptopIcon,
  MoonIcon,
  PlusIcon,
  Settings2Icon,
  SparklesIcon,
  SunIcon,
  Trash2Icon,
  UserIcon,
  UsersIcon,
  WrenchIcon,
  ZapIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createMcpToken, revokeMcpToken } from "@/lib/mcp/token-actions"
import type { ToolCatalogItem } from "@/lib/tools/catalog"
import type { ToolManifest } from "@/lib/tools/contracts"
import { cn } from "@/lib/utils"

export type SettingsSectionKey =
  "profile" | "appearance" | "workspace" | "members" | "mcp" | "tools"

type TokenItem = {
  id: string
  name: string
  keyPrefix: string
  token?: string
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
  user?: { name: string; email: string; avatarUrl?: string; initials: string }
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
  isLoading?: boolean
}

type NavCategory = {
  group: string
  items: {
    key: SettingsSectionKey
    label: string
    icon: React.ComponentType<{ className?: string }>
    badge?: string | number
  }[]
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
  isLoading = false,
}: SettingsDialogProps) {
  const [activeSection, setActiveSection] =
    React.useState<SettingsSectionKey>(defaultSection)
  const [tokens, setTokens] = React.useState<TokenItem[]>(initialTokens)

  const [prevInitialTokens, setPrevInitialTokens] = React.useState(initialTokens)
  if (prevInitialTokens !== initialTokens) {
    setPrevInitialTokens(initialTokens)
    setTokens(initialTokens)
  }

  const [prevDefaultSection, setPrevDefaultSection] = React.useState(defaultSection)
  if (prevDefaultSection !== defaultSection) {
    setPrevDefaultSection(defaultSection)
    setActiveSection(defaultSection)
  }
  const [isCreateKeyOpen, setIsCreateKeyOpen] = React.useState(false)
  const [keyName, setKeyName] = React.useState("")
  const [newlyCreatedKey, setNewlyCreatedKey] = React.useState<string | null>(null)
  const [latestKey, setLatestKey] = React.useState<string | null>(null)
  const [copiedField, setCopiedField] = React.useState<string | null>(null)
  const [tokenToRevoke, setTokenToRevoke] = React.useState<TokenItem | null>(
    null
  )
  const [isPending, startTransition] = React.useTransition()
  const { theme, setTheme } = useTheme()

  const primaryToken = tokens[0]?.token || tokens[0]?.keyPrefix || latestKey || null
  const baseMcpEndpointUrl = `${origin}/api/mcp`
  const baseSseEndpointUrl = `${origin}/api/mcp/sse`
  const mcpEndpointUrl = primaryToken
    ? `${baseMcpEndpointUrl}?apiKey=${primaryToken}`
    : baseMcpEndpointUrl
  const sseEndpointUrl = primaryToken
    ? `${baseSseEndpointUrl}?apiKey=${primaryToken}`
    : baseSseEndpointUrl
  const installedTools = catalogItems.filter(
    (item) => item.installationStatus === "active"
  )

  const navCategories: NavCategory[] = [
    {
      group: "General",
      items: [
        { key: "profile", label: "Account", icon: UserIcon },
        { key: "appearance", label: "Appearance", icon: SparklesIcon },
      ],
    },
    {
      group: "Workspace",
      items: [
        { key: "workspace", label: "Details", icon: Settings2Icon },
        {
          key: "members",
          label: "People",
          icon: UsersIcon,
          badge: members.length,
        },
      ],
    },
    {
      group: "Integrations",
      items: [
        {
          key: "mcp",
          label: "AI & Agents",
          icon: BotIcon,
          badge: tokens.length ? `${tokens.length}` : undefined,
        },
        {
          key: "tools",
          label: "Installed Tools",
          icon: WrenchIcon,
          badge: installedTools.length,
        },
      ],
    },
  ]

  

  function copyToClipboard(value: string, label: string) {
    navigator.clipboard.writeText(value)
    setCopiedField(label)
    toast.success(`${label} copied to clipboard`)
    window.setTimeout(() => setCopiedField(null), 1600)
  }

  function handleCreateToken() {
    const name = keyName.trim()
    if (!name) {
      toast.error("Name this key so you can recognize it later.")
      return
    }

    startTransition(async () => {
      try {
        const token = await createMcpToken({ workspaceId: workspace.id, name })
        setTokens((current) => [
          {
            id: token.id,
            name: token.name,
            keyPrefix: token.keyPrefix,
            token: token.rawSecret,
            createdAt: token.createdAt,
            lastUsedAt: null,
          },
          ...current,
        ])
        setLatestKey(token.rawSecret)
        setKeyName("")
        setIsCreateKeyOpen(false)
        toast.success(`Agent key "${token.name}" created and ready to use.`)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not create the key."
        )
      }
    })
  }

  function handleRevokeToken() {
    if (!tokenToRevoke) return
    startTransition(async () => {
      try {
        await revokeMcpToken({
          workspaceId: workspace.id,
          tokenId: tokenToRevoke.id,
        })
        setTokens((current) =>
          current.filter((token) => token.id !== tokenToRevoke.id)
        )
        setTokenToRevoke(null)
        toast.success("Agent key revoked.")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not revoke the key."
        )
      }
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton
          className="flex h-[min(700px,calc(100dvh-2rem))] w-[calc(100vw-2rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-4xl bg-popover/60 p-0 shadow-2xl ring-1 ring-foreground/5 backdrop-blur-2xl sm:max-w-4xl dark:ring-foreground/10"
        >
          {/* Header */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-muted/20 px-6">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
                <Settings2Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="flex items-center gap-2">
                <DialogTitle className="font-heading text-base font-semibold text-foreground">
                  Settings
                </DialogTitle>
                <span className="text-muted-foreground/40">/</span>
                <span className="max-w-[200px] truncate text-xs font-medium text-muted-foreground">
                  {workspace.name}
                </span>
              </div>
            </div>
          </div>

          {/* Body Layout: Sidebar + Main Content */}
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            {/* Sidebar Navigation */}
            <aside className="flex w-full shrink-0 justify-between overflow-x-auto border-b border-border/60 bg-muted/15 p-3 md:w-56 md:flex-col md:border-r md:border-b-0 md:p-3.5">
              <div className="flex w-full gap-4 md:flex-col">
                {navCategories.map((cat) => (
                  <div key={cat.group} className="w-full space-y-1">
                    <p className="hidden px-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase md:block">
                      {cat.group}
                    </p>
                    <div className="flex gap-1 md:flex-col">
                      {cat.items.map((item) => {
                        const Icon = item.icon
                        const isActive = activeSection === item.key
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setActiveSection(item.key)}
                            className={cn(
                              "flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium whitespace-nowrap transition-all outline-none",
                              isActive
                                ? "bg-background font-semibold text-foreground shadow-xs ring-1 ring-border/60"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon className="size-4 shrink-0" />
                              <span>{item.label}</span>
                            </div>
                            {item.badge !== undefined && (
                              <Badge
                                variant={isActive ? "default" : "secondary"}
                                className="h-4.5 rounded-full px-1.5 text-[10px]"
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden border-t border-border/40 px-2 pt-3 text-[11px] text-muted-foreground md:block">
                <span className="rounded-md border border-border/50 bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  Esc
                </span>{" "}
                to close
              </div>
            </aside>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto p-6 md:p-8">
              {activeSection === "profile" && (
                <div className="max-w-2xl space-y-6">
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-foreground">
                      Account & Identity
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Your identity across Character Arc workspaces.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-muted/20 p-5">
                    <Avatar
                      size="lg"
                      className="size-14 border border-border/60"
                    >
                      {user?.avatarUrl && (
                        <AvatarImage src={user.avatarUrl} alt="" />
                      )}
                      <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">
                        {user?.initials || "CA"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">
                        {user?.name || "Character Arc User"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {user?.email || "No email"}
                      </p>
                      <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">
                        Verified Profile
                      </span>
                    </div>
                  </div>

                  <div className="divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/60 bg-muted/20 text-sm">
                    <div className="flex items-center justify-between p-4">
                      <span className="font-medium text-foreground">
                        Display Name
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {user?.name || "Not set"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <span className="font-medium text-foreground">
                        Email Address
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {user?.email || "Not set"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <span className="font-medium text-foreground">
                        Workspace Role
                      </span>
                      <span className="rounded-full border border-border/50 bg-muted px-2.5 py-1 text-xs font-medium capitalize">
                        {workspace.kind.toLowerCase()} member
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "appearance" && (
                <div className="max-w-2xl space-y-6">
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-foreground">
                      Appearance
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Choose how Character Arc looks on this device.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setTheme("light")}
                      className={cn(
                        "flex flex-col items-center gap-2.5 rounded-2xl border p-4 text-center transition-all",
                        theme === "light"
                          ? "border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20"
                          : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                        <SunIcon className="size-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          Light
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Clean & crisp
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme("dark")}
                      className={cn(
                        "flex flex-col items-center gap-2.5 rounded-2xl border p-4 text-center transition-all",
                        theme === "dark"
                          ? "border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20"
                          : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                        <MoonIcon className="size-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          Dark
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Easy on eyes
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme("system")}
                      className={cn(
                        "flex flex-col items-center gap-2.5 rounded-2xl border p-4 text-center transition-all",
                        theme === "system"
                          ? "border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20"
                          : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                        <LaptopIcon className="size-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          System
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Match OS theme
                        </p>
                      </div>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground">
                    Character Arc saves your appearance setting locally on this
                    browser.
                  </div>
                </div>
              )}

              {activeSection === "workspace" && (
                <div className="max-w-2xl space-y-6">
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-foreground">
                      Workspace Details
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Information identifying this shared workspace.
                    </p>
                  </div>

                  <div className="divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/60 bg-muted/20 text-sm">
                    <div className="flex items-center justify-between p-4">
                      <span className="font-medium text-foreground">Name</span>
                      <span className="font-semibold text-foreground">
                        {workspace.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <span className="font-medium text-foreground">Slug</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {workspace.slug}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <span className="font-medium text-foreground">
                        Plan Type
                      </span>
                      <span className="rounded-full border border-border/50 bg-muted px-2.5 py-1 text-xs font-medium capitalize">
                        {workspace.kind.toLowerCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <span className="font-medium text-foreground">
                        Created On
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(workspace.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">
                        Workspace ID
                      </p>
                      <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                        {workspace.id}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1.5 rounded-full"
                      onClick={() =>
                        copyToClipboard(workspace.id, "Workspace ID")
                      }
                    >
                      {copiedField === "Workspace ID" ? (
                        <CheckIcon className="size-3.5 text-emerald-500" />
                      ) : (
                        <CopyIcon className="size-3.5" />
                      )}
                      <span>Copy</span>
                    </Button>
                  </div>
                </div>
              )}

              {activeSection === "members" && (
                <div className="max-w-2xl space-y-6">
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-foreground">
                      People & Access
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Everyone who can collaborate in this workspace.
                    </p>
                  </div>

                  <div className="divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/60 bg-muted/20 text-sm">
                    {members.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between gap-3 p-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="size-9">
                            {member.avatarUrl && (
                              <AvatarImage src={member.avatarUrl} alt="" />
                            )}
                            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                              {(member.displayName || "U")
                                .charAt(0)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {member.displayName || "Workspace Member"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Joined{" "}
                              {new Date(member.joinedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="rounded-full font-mono text-xs capitalize"
                        >
                          {member.role.toLowerCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === "mcp" && (
                <div className="max-w-2xl space-y-6">
                  {/* Header */}
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <h2 className="font-heading text-lg font-semibold text-foreground">
                        AI Agents & MCP Gateway
                      </h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Connect Claude, Cursor, ChatGPT, and custom assistants directly to your workspace tools and memory.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0 gap-1.5 rounded-full shadow-2xs"
                      onClick={() => {
                        setNewlyCreatedKey(null)
                        setIsCreateKeyOpen(true)
                      }}
                    >
                      <PlusIcon className="size-3.5" />
                      <span>New Key</span>
                    </Button>
                  </div>

                  {/* Top Endpoints Card */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Ready-to-Use Endpoints
                      </p>
                      {primaryToken && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          Includes Active Key
                        </span>
                      )}
                    </div>

                    <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-muted/20 text-sm">
                      {/* HTTP Stateless */}
                      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              <ZapIcon className="size-3.5" />
                            </span>
                            <span className="font-semibold text-foreground">
                              HTTP (Stateless / JSON-RPC)
                            </span>
                            <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px] font-medium">
                              Recommended
                            </Badge>
                          </div>
                          <p className="truncate font-mono text-xs text-muted-foreground">
                            {mcpEndpointUrl}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 shrink-0 gap-1.5 rounded-full px-3 text-xs"
                          onClick={() =>
                            copyToClipboard(mcpEndpointUrl, "HTTP Endpoint")
                          }
                        >
                          {copiedField === "HTTP Endpoint" ? (
                            <CheckIcon className="size-3.5 text-emerald-500" />
                          ) : (
                            <CopyIcon className="size-3.5" />
                          )}
                          <span>Copy URL</span>
                        </Button>
                      </div>

                      {/* SSE Stream */}
                      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                              <GlobeIcon className="size-3.5" />
                            </span>
                            <span className="font-semibold text-foreground">
                              SSE Stream (Stateful)
                            </span>
                          </div>
                          <p className="truncate font-mono text-xs text-muted-foreground">
                            {sseEndpointUrl}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 shrink-0 gap-1.5 rounded-full px-3 text-xs"
                          onClick={() =>
                            copyToClipboard(sseEndpointUrl, "SSE Endpoint")
                          }
                        >
                          {copiedField === "SSE Endpoint" ? (
                            <CheckIcon className="size-3.5 text-emerald-500" />
                          ) : (
                            <CopyIcon className="size-3.5" />
                          )}
                          <span>Copy URL</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Active Keys List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Active Agent Keys ({tokens.length})
                      </p>
                    </div>

                    <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-muted/20 text-sm">
                      {isLoading && tokens.length === 0 ? (
                        <div className="space-y-3 p-4">
                          <div className="h-16 animate-pulse rounded-xl bg-muted/40" />
                          <div className="h-16 animate-pulse rounded-xl bg-muted/40" />
                        </div>
                      ) : tokens.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center">
                          <span className="flex size-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                            <KeyRoundIcon className="size-5" />
                          </span>
                          <p className="mt-3 text-sm font-medium text-foreground">
                            No agent keys generated yet
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Generate a key to connect your AI assistant to this workspace.
                          </p>
                          <Button
                            size="sm"
                            className="mt-4 gap-1.5 rounded-full"
                            onClick={() => setIsCreateKeyOpen(true)}
                          >
                            <PlusIcon className="size-3.5" />
                            <span>Generate First Key</span>
                          </Button>
                        </div>
                      ) : (
                        tokens.map((token) => {
                          const tokenSecret = token.token || token.keyPrefix
                          const tokenHttpUrl = `${origin}/api/mcp?apiKey=${tokenSecret}`
                          const tokenSseUrl = `${origin}/api/mcp/sse?apiKey=${tokenSecret}`

                          return (
                            <div
                              key={token.id}
                              className="flex flex-col gap-3 p-4 sm:p-5"
                            >
                              {/* Header Row: Name, Created Date, Revoke */}
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <KeyRoundIcon className="size-3.5" />
                                  </span>
                                  <p className="truncate text-sm font-semibold text-foreground">
                                    {token.name}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] text-muted-foreground">
                                    Created {new Date(token.createdAt).toLocaleDateString()}
                                  </span>
                                  <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => setTokenToRevoke(token)}
                                    aria-label={`Revoke ${token.name}`}
                                  >
                                    <Trash2Icon className="size-4" />
                                  </Button>
                                </div>
                              </div>

                              {/* Full Unmasked Key Box */}
                              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/80 p-2.5 font-mono text-xs">
                                <span className="flex-1 select-all truncate font-medium text-foreground">
                                  {tokenSecret}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 shrink-0 gap-1 rounded-full px-2.5 text-[11px]"
                                  onClick={() =>
                                    copyToClipboard(
                                      tokenSecret,
                                      `API Key (${token.name})`
                                    )
                                  }
                                >
                                  {copiedField === `API Key (${token.name})` ? (
                                    <CheckIcon className="size-3 text-emerald-500" />
                                  ) : (
                                    <CopyIcon className="size-3" />
                                  )}
                                  <span>Copy Key</span>
                                </Button>
                              </div>

                              {/* Direct Endpoint 1-Click Copy Buttons */}
                              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 gap-1.5 rounded-full px-3 text-[11px] font-medium"
                                  onClick={() =>
                                    copyToClipboard(
                                      tokenHttpUrl,
                                      `HTTP Endpoint (${token.name})`
                                    )
                                  }
                                >
                                  {copiedField === `HTTP Endpoint (${token.name})` ? (
                                    <CheckIcon className="size-3 text-emerald-500" />
                                  ) : (
                                    <ZapIcon className="size-3 text-amber-500" />
                                  )}
                                  <span>Copy HTTP URL</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 gap-1.5 rounded-full px-3 text-[11px] font-medium"
                                  onClick={() =>
                                    copyToClipboard(
                                      tokenSseUrl,
                                      `SSE Endpoint (${token.name})`
                                    )
                                  }
                                >
                                  {copiedField === `SSE Endpoint (${token.name})` ? (
                                    <CheckIcon className="size-3 text-emerald-500" />
                                  ) : (
                                    <GlobeIcon className="size-3 text-cyan-500" />
                                  )}
                                  <span>Copy SSE URL</span>
                                </Button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "tools" && (
                <div className="max-w-2xl space-y-6">
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-foreground">
                      Installed Tools
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Tool capabilities active in this workspace.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {catalogItems.map((item) => (
                      <div
                        key={item.key}
                        className="flex flex-col justify-between rounded-2xl border border-border/60 bg-muted/20 p-4"
                      >
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <Badge
                              variant={
                                item.installationStatus === "active"
                                  ? "default"
                                  : "secondary"
                              }
                              className="rounded-full text-[10px] capitalize"
                            >
                              {item.installationStatus === "active"
                                ? "Active"
                                : "Available"}
                            </Badge>
                            <span className="font-mono text-[10px] text-muted-foreground capitalize">
                              {item.category}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">
                            {item.name}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-xs">
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {item.actionNames.length} actions
                          </span>
                          {item.installationStatus === "active" ? (
                            <Link
                              href={`/workspace/${encodeURIComponent(workspace.slug)}/${item.key.replace("core.", "")}`}
                              onClick={() => onOpenChange(false)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            >
                              Open Tool <ChevronRightIcon className="size-3" />
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </main>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate API Key Modal */}
      <Dialog open={isCreateKeyOpen} onOpenChange={setIsCreateKeyOpen}>
        <DialogContent className="rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Agent Key</DialogTitle>
            <DialogDescription>
              Name this key to identify which AI tool or assistant is connecting.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleCreateToken()
            }}
            className="space-y-4 py-2"
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="agent-key-input">Key Label</FieldLabel>
                <Input
                  id="agent-key-input"
                  placeholder="e.g. Cursor Workstation, Claude Desktop, LibreChat"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="h-10 rounded-xl"
                  autoFocus
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateKeyOpen(false)}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-full"
              >
                {isPending ? "Generating..." : "Generate Key"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation */}
      <AlertDialog
        open={Boolean(tokenToRevoke)}
        onOpenChange={(next) => !next && setTokenToRevoke(null)}
      >
        <AlertDialogContent className="rounded-3xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Agent Key?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{tokenToRevoke?.name}&quot; will be disconnected from
              Character Arc immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} className="rounded-full">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleRevokeToken}
              disabled={isPending}
              className="rounded-full"
            >
              {isPending ? "Revoking..." : "Revoke Key"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
