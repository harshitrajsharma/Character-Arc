import { Navbar } from "@/components/navigation/navbar"
import { requireVerifiedClaims } from "@/lib/auth/session"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"

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

  return (
    <SidebarProvider defaultOpen={false}>
      <Navbar user={{ name, email, avatarUrl, initials }} />
      <AppSidebar collapsible="icon" variant="floating" className="top-15! h-[calc(100svh-60px)]!" />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}