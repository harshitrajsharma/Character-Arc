"use client"

import * as React from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"

import { authInputClassName } from "@/components/auth/auth-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [isVisible, setIsVisible] = React.useState(false)
  const label = isVisible ? "Hide password" : "Show password"

  return (
    <div className="relative">
      <Input
        type={isVisible ? "text" : "password"}
        className={cn(authInputClassName, "pr-12", className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        className="absolute top-1/2 right-0 -translate-y-1/2 size-11 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground sm:right-1 sm:size-9"
        aria-label={label}
        title={label}
        onClick={() => setIsVisible((visible) => !visible)}
      >
        {isVisible ? <EyeOffIcon /> : <EyeIcon />}
      </Button>
    </div>
  )
}
