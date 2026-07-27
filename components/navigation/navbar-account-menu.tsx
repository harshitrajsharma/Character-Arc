"use client"

import { useTransition } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { HomeIcon, LogOutIcon, MoonIcon, SunIcon } from "lucide-react"

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
  NAVBAR_DESTINATIONS,
  type NavbarDestinationKey,
  type NavbarUser,
} from "./navbar-data"

type NavbarAccountMenuProps = {
  user: NavbarUser
  onSelect: (destination: NavbarDestinationKey) => void
}

export function NavbarAccountMenu({ user, onSelect }: NavbarAccountMenuProps) {
  const [isSigningOut, startSignOut] = useTransition()
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Open account menu for ${user.name}`}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "rounded-full"
        )}
      >
        <Avatar size="sm">
          {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
          <AvatarFallback>{user.initials || "CA"}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="min-w-0">
            <span className="block truncate font-medium text-foreground">
              {user.name}
            </span>
            <span className="mt-0.5 block truncate font-normal">
              {user.email}
            </span>
          </DropdownMenuLabel>
          {NAVBAR_DESTINATIONS.map((item) => {
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
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
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
