"use client"

import { useState, useTransition } from "react"
import {
  Copy,
  Check,
  Key,
  ShieldCheck,
  Cpu,
  Zap,
  Trash2,
  Plus,
  Terminal,
  Code2,
  Bot,
  Settings,
  Users,
  Wrench,
  Building,
  Layers,
  ArrowUpRight,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createMcpToken, revokeMcpToken } from "@/lib/mcp/token-actions"
import type { ToolManifest } from "@/lib/tools/contracts"
import type { ToolCatalogItem } from "@/lib/tools/catalog"
import { formatMcpToolName } from "@/lib/mcp/contracts"

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

export function UnifiedWorkspaceSettings({
  workspace,
  members,
  initialTokens,
  manifests,
  catalogItems,
  origin,
  defaultTab = "general",
}: {
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
  defaultTab?: string
}) {
  const [tokens, setTokens] = useState<TokenItem[]>(initialTokens)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [keyName, setKeyName] = useState("")
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const mcpEndpointUrl = `${origin}/api/mcp`
  const sseEndpointUrl = `${origin}/api/mcp/sse`

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
      } catch (err: any) {
        toast.error(err.message || "Failed to generate API token.")
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
      } catch (err: any) {
        toast.error(err.message || "Failed to revoke API token.")
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

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Workspace Settings
            </h1>
            <Badge variant="outline" className="capitalize">
              {workspace.kind.toLowerCase()} workspace
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage workspace profile, MCP agent gateways, installed tools, and team access for <strong className="font-semibold text-foreground">{workspace.name}</strong>.
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 gap-6">
          <TabsTrigger
            value="general"
            className="gap-2 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-2 font-medium"
          >
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger
            value="mcp"
            className="gap-2 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-2 font-medium"
          >
            <Cpu className="h-4 w-4 text-emerald-600" />
            MCP Agent Gateway
          </TabsTrigger>
          <TabsTrigger
            value="tools"
            className="gap-2 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-2 font-medium"
          >
            <Wrench className="h-4 w-4" />
            Installed Tools ({catalogItems.filter((i) => i.installationStatus === "active").length})
          </TabsTrigger>
          <TabsTrigger
            value="members"
            className="gap-2 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-2 font-medium"
          >
            <Users className="h-4 w-4" />
            Members ({members.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card className="border shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building className="h-5 w-5 text-primary" />
                Workspace Profile
              </CardTitle>
              <CardDescription className="text-xs">
                Core tenancy details and settings for this workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Workspace Name</span>
                  <p className="text-sm font-semibold text-foreground">{workspace.name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Workspace Slug</span>
                  <p className="text-sm font-mono text-foreground">{workspace.slug}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Created Date</span>
                  <p className="text-sm text-foreground">{new Date(workspace.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Workspace Kind</span>
                  <p className="text-sm capitalize text-foreground">{workspace.kind.toLowerCase()}</p>
                </div>
              </div>

              {workspace.description && (
                <div className="space-y-1 pt-2 border-t">
                  <span className="text-xs font-medium text-muted-foreground">Description</span>
                  <p className="text-sm text-foreground">{workspace.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers className="h-5 w-5 text-indigo-500" />
                Technical Tenancy Metadata
              </CardTitle>
              <CardDescription className="text-xs">
                Database identifiers used by API requests and server actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Workspace ID (UUID)</span>
                <div className="flex items-center gap-2 rounded-md bg-muted p-2 text-xs font-mono text-foreground">
                  <span className="truncate flex-1">{workspace.id}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={() => copyToClipboard(workspace.id, "Workspace ID")}
                  >
                    {copiedField === "Workspace ID" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: MCP Agent Gateway */}
        <TabsContent value="mcp" className="space-y-6">
          {/* Connection Endpoint Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Zap className="h-4 w-4 text-amber-500" />
                    HTTP POST Endpoint (Stateless)
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">Standard JSON-RPC</Badge>
                </div>
                <CardDescription className="text-xs">
                  Recommended for standard MCP client calls and custom agent scripts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 rounded-md bg-muted p-2 text-xs font-mono text-foreground overflow-x-auto">
                  <span className="truncate flex-1">{mcpEndpointUrl}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={() => copyToClipboard(mcpEndpointUrl, "HTTP Endpoint")}
                  >
                    {copiedField === "HTTP Endpoint" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Cpu className="h-4 w-4 text-indigo-500" />
                    SSE Transport Stream (Stateful)
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">EventStream</Badge>
                </div>
                <CardDescription className="text-xs">
                  Recommended for streaming MCP integrations like Cursor and Claude SSE clients.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 rounded-md bg-muted p-2 text-xs font-mono text-foreground overflow-x-auto">
                  <span className="truncate flex-1">{sseEndpointUrl}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={() => copyToClipboard(sseEndpointUrl, "SSE Endpoint")}
                  >
                    {copiedField === "SSE Endpoint" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* API Key Management */}
          <Card className="border shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Key className="h-5 w-5 text-primary" />
                    API Secret Keys
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Keys grant external AI agents permission to execute installed Character Arc tools on behalf of your account.
                  </CardDescription>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger
                    render={
                      <Button size="sm" className="gap-1.5">
                        <Plus className="h-4 w-4" />
                        Generate Key
                      </Button>
                    }
                  />
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Generate MCP API Key</DialogTitle>
                      <DialogDescription>
                        Give your key a name to identify which AI agent or device is using it.
                      </DialogDescription>
                    </DialogHeader>
                    {newlyCreatedKey ? (
                      <div className="space-y-4 py-2">
                        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                          <strong>Important:</strong> Copy this secret key now. You will not be able to see it again!
                        </div>
                        <div className="flex items-center gap-2 rounded-md bg-muted p-2 text-xs font-mono">
                          <span className="truncate flex-1 font-semibold text-emerald-600 dark:text-emerald-400">
                            {newlyCreatedKey}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            onClick={() => copyToClipboard(newlyCreatedKey, "API Secret Key")}
                          >
                            {copiedField === "API Secret Key" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={() => {
                              setNewlyCreatedKey(null)
                              setIsCreateOpen(false)
                            }}
                          >
                            Done
                          </Button>
                        </DialogFooter>
                      </div>
                    ) : (
                      <div className="space-y-4 py-2">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-foreground">Key Identifier Name</label>
                          <Input
                            placeholder="e.g. Claude Desktop, Cursor Workstation"
                            value={keyName}
                            onChange={(e) => setKeyName(e.target.value)}
                          />
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setIsCreateOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleCreateToken} disabled={isPending}>
                            {isPending ? "Generating..." : "Generate Key"}
                          </Button>
                        </DialogFooter>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {tokens.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Key className="mx-auto h-8 w-8 text-muted-foreground/60" />
                  <p className="mt-2 text-sm font-medium text-foreground">No API Keys Generated</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Generate an API key above to connect Claude Desktop, Cursor, or your local agent framework.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key Prefix</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokens.map((token) => (
                      <TableRow key={token.id}>
                        <TableCell className="font-medium text-sm text-foreground">
                          {token.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {token.keyPrefix}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(token.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {token.lastUsedAt
                            ? new Date(token.lastUsedAt).toLocaleDateString()
                            : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleRevokeToken(token.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Setup Snippets & Documentation */}
          <Card className="border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Terminal className="h-5 w-5 text-indigo-500" />
                Client Configuration Snippets
              </CardTitle>
              <CardDescription className="text-xs">
                Copy pre-formatted config files for your favorite AI agent runner.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="claude">
                <TabsList className="mb-4">
                  <TabsTrigger value="claude" className="gap-1.5">
                    <Bot className="h-4 w-4" />
                    Claude Desktop
                  </TabsTrigger>
                  <TabsTrigger value="cursor" className="gap-1.5">
                    <Code2 className="h-4 w-4" />
                    Cursor / VS Code
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="claude">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Add to <code className="font-mono text-foreground">claude_desktop_config.json</code>:
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(claudeConfig, "Claude Desktop Config")}
                      >
                        <Copy className="mr-1 h-3.5 w-3.5" /> Copy JSON
                      </Button>
                    </div>
                    <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs font-mono text-foreground">
                      {claudeConfig}
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="cursor">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Add to Cursor MCP Settings (<code className="font-mono text-foreground">mcp.json</code>):
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(cursorConfig, "Cursor Config")}
                      >
                        <Copy className="mr-1 h-3.5 w-3.5" /> Copy JSON
                      </Button>
                    </div>
                    <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs font-mono text-foreground">
                      {cursorConfig}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Exposed Tools Inspector */}
          <Card className="border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                Exposed MCP Tools & Actions
              </CardTitle>
              <CardDescription className="text-xs">
                Tools installed in this workspace are automatically projected into valid MCP tool schemas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {manifests.map((manifest) => (
                <div key={manifest.tool.key} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between border-b pb-3 mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                        {manifest.tool.name}
                        <Badge variant="outline" className="text-xs font-mono">{manifest.tool.key}</Badge>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{manifest.tool.description}</p>
                    </div>
                    <Badge className="capitalize">{manifest.tool.category}</Badge>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Available Actions ({manifest.actions.length})</span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {manifest.actions.map((action) => (
                        <div key={action.key} className="rounded-md bg-muted/60 p-2.5 text-xs">
                          <div className="font-mono font-medium text-foreground">
                            {formatMcpToolName(manifest.tool.key, action.key)}
                          </div>
                          <p className="text-muted-foreground mt-1 line-clamp-2">{action.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Installed Tools */}
        <TabsContent value="tools" className="space-y-6">
          <Card className="border shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wrench className="h-5 w-5 text-primary" />
                Workspace Tools Catalog
              </CardTitle>
              <CardDescription className="text-xs">
                Installed tools provide specialized database structures, Server Actions, and MCP capabilities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {catalogItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex flex-col justify-between rounded-lg border p-4 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          variant={item.installationStatus === "active" ? "default" : "secondary"}
                          className="capitalize text-xs"
                        >
                          {item.installationStatus === "active" ? "Active" : "Not Installed"}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">{item.category}</Badge>
                      </div>
                      <h4 className="font-semibold text-foreground text-sm">{item.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{item.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-mono">{item.actionNames.length} actions</span>
                      {item.installationStatus === "active" && (
                        <Button size="xs" variant="ghost" render={<Link href={`/workspace/${workspace.slug}/${item.key.replace("core.", "")}`} />}>Launch <ArrowUpRight className="ml-1 h-3 w-3" /></Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Team Members */}
        <TabsContent value="members" className="space-y-6">
          <Card className="border shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                Workspace Members ({members.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Users with permission to view or edit blocks and tools in this workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Profile</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.userId}>
                      <TableCell className="font-medium text-sm text-foreground flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                          {(member.displayName || "User").charAt(0).toUpperCase()}
                        </div>
                        <span>{member.displayName || "Workspace Member"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs font-mono">
                          {member.role.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}


