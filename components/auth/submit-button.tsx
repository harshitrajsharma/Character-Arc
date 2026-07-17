"use client"

import { useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

type SubmitButtonProps = React.ComponentProps<typeof Button> & {
  pendingLabel: string
}

export function SubmitButton({
  children,
  disabled,
  pendingLabel,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending ? (
        <>
          <Spinner data-icon="inline-start" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
