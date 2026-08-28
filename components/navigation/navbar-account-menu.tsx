"use client"

import { useTransition } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { useSettings } from "@/components/settings/settings-provider"
import { HomeIcon, LogOutIcon, MoonIcon, SettingsIcon, SunIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { signOut } from "@/lib/auth/actions"
import { cn } from "@/lib/utils"
import {
  getNavbarDestinations,
  type NavbarDestinationKey,
  type NavbarUser,
} from "./navbar-data"

type NavbarAccountMenuProps = {
  user: NavbarUser
  onSelect: (destination: NavbarDestinationKey) => void
  workspaceSlug?: string
}

export function NavbarAccountMenu({
  user,
  onSelect,
  workspaceSlug,
}: NavbarAccountMenuProps) {
  const [isSigningOut, startSignOut] = useTransition()
  const { theme, setTheme } = useTheme()
  const { openSettings } = useSettings()
  const isDark = theme === "dark"
  const destinations = getNavbarDestinations(workspaceSlug)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Open account menu for ${user.name}`}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-9 rounded-full border border-border/80 p-0 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
      >
        <Avatar className="size-8">
          {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name} /> : null}
          <AvatarFallback className="text-xs font-semibold">{user.initials || "CA"}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="font-heading text-sm font-semibold leading-none text-foreground">
                {user.name}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {destinations.map((item) => {
            const Icon = item.icon

            return (
              <DropdownMenuItem
                key={item.key}
                render={<Link href={item.href} />}
                className="sm:hidden"
                onClick={() => onSelect(item.key)}
              >
                <Icon aria-hidden="true" />
                {item.label}
              </DropdownMenuItem>
            )
          })}
          <DropdownMenuItem
            render={<Link href="/dashboard" />}
            className="hidden sm:flex"
          >
            <HomeIcon aria-hidden="true" />
            Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openSettings("workspace", workspaceSlug)}
          >
            <SettingsIcon className="size-4" aria-hidden="true" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setTheme(isDark ? "light" : "dark")}>
            {isDark ? (
              <SunIcon aria-hidden="true" />
            ) : (
              <MoonIcon aria-hidden="true" />
            )}
            {isDark ? "Light mode" : "Dark mode"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            disabled={isSigningOut}
            onClick={() =>
              startSignOut(async () => {
                await signOut()
              })
            }
          >
            {isSigningOut ? (
              <Spinner aria-hidden="true" />
            ) : (
              <LogOutIcon aria-hidden="true" />
            )}
            {isSigningOut ? "Signing out..." : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
