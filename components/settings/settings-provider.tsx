"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import {
  SettingsDialog,
  type SettingsSectionKey,
} from "@/components/settings/settings-dialog"
import { getSettingsModalData } from "@/lib/workspaces/settings-actions"
import type { ToolManifest } from "@/lib/tools/contracts"
import type { ToolCatalogItem } from "@/lib/tools/catalog"

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

export type SettingsData = {
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
  user: {
    name: string
    email: string
    avatarUrl?: string
    initials: string
  }
}

type SettingsContextType = {
  isOpen: boolean
  openSettings: (section?: SettingsSectionKey, workspaceSlug?: string) => void
  closeSettings: () => void
  toggleSettings: (workspaceSlug?: string) => void
}

const SettingsContext = React.createContext<SettingsContextType | null>(null)

export function useSettings() {
  const context = React.useContext(SettingsContext)
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}

export function SettingsProvider({
  children,
  initialData,
}: {
  children: React.ReactNode
  initialData?: SettingsData
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [activeSection, setActiveSection] = React.useState<SettingsSectionKey>("profile")
  const [data, setData] = React.useState<SettingsData | undefined>(initialData)
  const [, setIsLoading] = React.useState(false)
  const params = useParams()
  const currentWorkspaceSlug = typeof params?.workspaceSlug === "string" ? params.workspaceSlug : undefined

  const loadData = React.useCallback(async (slug?: string) => {
    try {
      setIsLoading(true)
      const res = await getSettingsModalData(slug || currentWorkspaceSlug)
      setData(res)
    } catch (err) {
      console.error("Failed to load settings modal data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [currentWorkspaceSlug])

  const openSettings = React.useCallback(
    (section: SettingsSectionKey = "profile", workspaceSlug?: string) => {
      setActiveSection(section)
      setIsOpen(true)
      if (!data || workspaceSlug) {
        loadData(workspaceSlug)
      }
    },
    [data, loadData]
  )

  const closeSettings = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggleSettings = React.useCallback(
    (workspaceSlug?: string) => {
      if (isOpen) {
        closeSettings()
      } else {
        openSettings("profile", workspaceSlug)
      }
    },
    [isOpen, closeSettings, openSettings]
  )

  // Keyboard shortcut: ⌘, (Cmd+comma) to toggle settings dialog
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === ",") {
        event.preventDefault()
        toggleSettings()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleSettings])

  return (
    <SettingsContext.Provider
      value={{
        isOpen,
        openSettings,
        closeSettings,
        toggleSettings,
      }}
    >
      {children}

      {data && (
        <SettingsDialog
          open={isOpen}
          onOpenChange={setIsOpen}
          defaultSection={activeSection}
          user={data.user}
          workspace={data.workspace}
          members={data.members}
          initialTokens={data.initialTokens}
          manifests={data.manifests}
          catalogItems={data.catalogItems}
          origin={data.origin}
        />
      )}
    </SettingsContext.Provider>
  )
}
