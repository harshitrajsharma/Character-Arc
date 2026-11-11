"use client"
import {
  SettingsDialogContent,
  SettingsHeader,
  SettingsNavigation,
  SettingsBody,
  SettingsPanel,
} from "@/components/settings/settings-layout"
import { McpSettingsPanel } from "@/components/settings/mcp-settings-panel"

import * as React from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import {
  BotIcon,
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  LaptopIcon,
  MoonIcon,
  Settings2Icon,
  SparklesIcon,
  SunIcon,
  UserIcon,
  UsersIcon,
  WrenchIcon,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
    canManageMcpKeys?: boolean
  }
  members: WorkspaceMemberItem[]
  initialTokens: TokenItem[]
  mcpTokensUnavailable?: boolean
  onReload?: () => void
  manifests: ToolManifest[]
  catalogItems: ToolCatalogItem[]
  origin: string
  isLoading?: boolean
  settingsUnavailable?: boolean
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
  mcpTokensUnavailable = false,
  onReload,
  catalogItems,
  origin,
  isLoading = false,
  settingsUnavailable = false,
}: SettingsDialogProps) {
  const [activeSection, setActiveSection] =
    React.useState<SettingsSectionKey>(defaultSection)
  const [tokens, setTokens] = React.useState<TokenItem[]>(initialTokens)

  const [prevInitialTokens, setPrevInitialTokens] =
    React.useState(initialTokens)
  if (prevInitialTokens !== initialTokens) {
    setPrevInitialTokens(initialTokens)
    setTokens(initialTokens)
  }

  const [prevDefaultSection, setPrevDefaultSection] =
    React.useState(defaultSection)
  if (prevDefaultSection !== defaultSection) {
    setPrevDefaultSection(defaultSection)
    setActiveSection(defaultSection)
  }
  const [isCreateKeyOpen, setIsCreateKeyOpen] = React.useState(false)
  const [keyName, setKeyName] = React.useState("")
  const [latestKey, setLatestKey] = React.useState<string | null>(null)
  const [copiedField, setCopiedField] = React.useState<string | null>(null)
  const [tokenToRevoke, setTokenToRevoke] = React.useState<TokenItem | null>(
    null
  )
  const [isPending, startTransition] = React.useTransition()
  const { theme, setTheme } = useTheme()

  const mcpEndpointUrl = `${origin}/api/mcp`
  const canManageKeys = workspace.canManageMcpKeys === true
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

  async function copyToClipboard(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(label)
      toast.success(`${label} copied to clipboard`)
      window.setTimeout(() => setCopiedField(null), 1600)
    } catch {
      toast.error(
        "Clipboard is unavailable. Select and copy the field manually."
      )
    }
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
        setLatestKey(null)
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
        <SettingsDialogContent showCloseButton>
          <SettingsHeader
            title="Settings"
            context={workspace.name}
            icon={Settings2Icon}
          />
          {/* Body Layout: Sidebar + Main Content */}
          <SettingsBody>
            {/* Sidebar Navigation */}
            <SettingsNavigation
              groups={navCategories}
              active={activeSection}
              onChange={setActiveSection}
            />

            {/* Content Area */}
            <SettingsPanel>
              {settingsUnavailable && activeSection !== "mcp" ? (
                <Alert className="mb-5">
                  <AlertTitle>Could not load settings</AlertTitle>
                  <AlertDescription>
                    Your saved settings are unavailable right now. Try loading
                    them again.
                    <Button
                      variant="outline"
                      className="mt-3 min-h-11 self-start"
                      disabled={isLoading}
                      onClick={onReload}
                    >
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}
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
                      <span
                        className="text-xs text-muted-foreground"
                        suppressHydrationWarning
                      >
                        {new Date(workspace.createdAt).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" }
                        )}
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
                            <p
                              className="text-[11px] text-muted-foreground"
                              suppressHydrationWarning
                            >
                              Joined{" "}
                              {new Date(member.joinedAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )}
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
                <McpSettingsPanel
                  endpoint={mcpEndpointUrl}
                  canManageKeys={canManageKeys}
                  tokens={tokens}
                  latestKey={latestKey}
                  pending={isPending}
                  loading={isLoading}
                  unavailable={mcpTokensUnavailable}
                  onReload={onReload}
                  onCreate={() => setIsCreateKeyOpen(true)}
                  onRevoke={setTokenToRevoke}
                  onCopy={copyToClipboard}
                  onDismissKey={() => setLatestKey(null)}
                />
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
            </SettingsPanel>
          </SettingsBody>
        </SettingsDialogContent>
      </Dialog>

      {/* Generate API Key Modal */}
      <Dialog open={isCreateKeyOpen} onOpenChange={setIsCreateKeyOpen}>
        <DialogContent className="rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Agent Key</DialogTitle>
            <DialogDescription>
              Name this key to identify which AI tool or assistant is
              connecting.
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
                  maxLength={80}
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
                disabled={isPending || !canManageKeys}
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
