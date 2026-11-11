"use client"

import { CopyIcon, KeyRoundIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { maskMcpTokenPrefix } from "@/lib/mcp/token-metadata"

export type McpTokenMetadata = {
  id: string
  name: string
  keyPrefix: string
  createdAt: string
  lastUsedAt: string | null
}

export function McpSettingsPanel({
  endpoint,
  canManageKeys,
  tokens,
  latestKey,
  pending,
  loading,
  unavailable,
  onReload,
  onCreate,
  onRevoke,
  onCopy,
  onDismissKey,
}: {
  endpoint: string
  canManageKeys: boolean
  tokens: McpTokenMetadata[]
  latestKey: string | null
  pending: boolean
  loading: boolean
  unavailable: boolean
  onReload?: () => void
  onCreate: () => void
  onRevoke: (token: McpTokenMetadata) => void
  onCopy: (value: string, label: string) => void
  onDismissKey: () => void
}) {
  const configuration = JSON.stringify(
    {
      mcpServers: {
        "character-arc": {
          url: endpoint,
          headers: { Authorization: "Bearer <YOUR_AGENT_KEY>" },
        },
      },
    },
    null,
    2
  )
  return (
    <div className="flex max-w-2xl min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-lg font-semibold">AI agents</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect an assistant to the enabled tools in this workspace.
          </p>
        </div>
        <Button
          className="min-h-11"
          disabled={!canManageKeys || pending || loading || unavailable}
          onClick={onCreate}
        >
          <PlusIcon data-icon="inline-start" />
          Create key
        </Button>
      </div>
      {!canManageKeys && !loading ? (
        <p className="text-sm text-muted-foreground">
          Only the workspace owner can create or revoke agent keys.
        </p>
      ) : null}
      {latestKey ? (
        <Alert>
          <KeyRoundIcon />
          <AlertTitle>Save your new key now</AlertTitle>
          <AlertDescription className="flex min-w-0 flex-col gap-3">
            <p>
              This secret is shown once. Store it in your assistant’s credential
              settings; it cannot be retrieved after closing settings.
            </p>
            <Field>
              <FieldLabel htmlFor="new-agent-secret">New agent key</FieldLabel>
              <Input
                id="new-agent-secret"
                value={latestKey}
                readOnly
                className="min-h-11 font-mono"
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => onCopy(latestKey, "Agent key")}
              >
                <CopyIcon data-icon="inline-start" />
                Copy key
              </Button>
              <Button
                variant="ghost"
                className="min-h-11"
                onClick={onDismissKey}
              >
                I saved my key
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
      <section
        className="flex min-w-0 flex-col gap-4"
        aria-labelledby="mcp-connection-heading"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h3 id="mcp-connection-heading" className="text-sm font-semibold">
            Connection
          </h3>
          <Badge variant="secondary">Streamable HTTP</Badge>
        </div>
        <Field>
          <FieldLabel htmlFor="agent-endpoint">Server URL</FieldLabel>
          <div className="flex min-w-0 gap-2">
            <Input
              id="agent-endpoint"
              readOnly
              value={endpoint}
              className="min-h-11 min-w-0 font-mono"
            />
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => onCopy(endpoint, "Server URL")}
            >
              <CopyIcon data-icon="inline-start" />
              Copy
            </Button>
          </div>
        </Field>
        <p className="text-sm text-muted-foreground">
          Add the key separately as an Authorization Bearer header. Keep keys
          out of URLs and shared configuration files.
        </p>
        <details className="min-w-0 rounded-lg border border-border p-4">
          <summary className="min-h-11 cursor-pointer text-sm font-medium">
            Example client configuration
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs leading-5 wrap-anywhere whitespace-pre-wrap">
            {configuration}
          </pre>
          <Button
            variant="outline"
            className="mt-3 min-h-11"
            onClick={() => onCopy(configuration, "Client configuration")}
          >
            <CopyIcon data-icon="inline-start" />
            Copy template
          </Button>
        </details>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Use a client that supports custom authorization headers. OAuth-only
          connections and legacy SSE are not supported in this release.
        </p>
      </section>
      <section
        className="flex min-w-0 flex-col gap-3"
        aria-labelledby="mcp-keys-heading"
      >
        <h3 id="mcp-keys-heading" className="text-sm font-semibold">
          Active keys · {tokens.length}
        </h3>
        <p className="text-sm text-muted-foreground">
          Keys act with their creator’s current workspace access. Enabled tools,
          grants and each item’s agent-access setting still apply.
        </p>
        {unavailable ? (
          <Alert>
            <AlertTitle>Could not load agent keys</AlertTitle>
            <AlertDescription>
              Try again before creating or managing keys.
            </AlertDescription>
            {onReload ? (
              <Button
                className="mt-3 min-h-11"
                variant="outline"
                disabled={loading}
                onClick={onReload}
              >
                Retry
              </Button>
            ) : null}
          </Alert>
        ) : loading && !tokens.length ? (
          <Skeleton className="h-24 w-full" />
        ) : tokens.length ? (
          <ul className="min-w-0 divide-y divide-border rounded-lg border border-border">
            {tokens.map((token) => (
              <li key={token.id} className="flex min-w-0 items-start gap-3 p-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="truncate text-sm font-medium">{token.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {maskMcpTokenPrefix(token.keyPrefix)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created{" "}
                    {new Date(token.createdAt).toLocaleDateString("en-GB", {
                      timeZone: "Asia/Kolkata",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {token.lastUsedAt
                      ? ` · Last used ${new Date(token.lastUsedAt).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" })}`
                      : " · Not used yet"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  disabled={!canManageKeys || pending}
                  aria-label={`Revoke ${token.name}`}
                  onClick={() => onRevoke(token)}
                >
                  <Trash2Icon />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty variant="compact">
            <EmptyHeader>
              <EmptyTitle>No agent keys</EmptyTitle>
              <EmptyDescription>
                Create a key when you’re ready to connect an assistant.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>
    </div>
  )
}
