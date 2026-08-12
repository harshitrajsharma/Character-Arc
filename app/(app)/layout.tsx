import { Navbar } from "@/components/navigation/navbar"
import { requireVerifiedClaims } from "@/lib/auth/session"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { MobileSidebarTrigger } from "@/components/sidebar/mobile-sidebar-trigger"
import { getAppShellData } from "@/lib/workspaces/workspace-access"

function claimString(value: unknown) {
  return typeof value === "string" ? value : undefined
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const claims = await requireVerifiedClaims()
  const metadata =
    claims.user_metadata && typeof claims.user_metadata === "object"
      ? claims.user_metadata
      : {}
  const email = claimString(claims.email) ?? "Account"
  const name = claimString(metadata.full_name) ?? email
  const avatarUrl = claimString(metadata.avatar_url)
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const memberships = await getAppShellData()

  return (
    <SidebarProvider defaultOpen={false}>
      <Navbar user={{ name, email, avatarUrl, initials }} memberships={memberships} />
      <AppSidebar
        memberships={memberships}
        collapsible="icon"
        variant="sidebar"
        className="top-15! h-[calc(100svh-60px)]! z-40!"
      />
      <MobileSidebarTrigger />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
