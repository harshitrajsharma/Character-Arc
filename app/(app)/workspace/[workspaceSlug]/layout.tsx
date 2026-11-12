import type { ReactNode } from "react"

export default function WorkspaceLayout({
  children,
}: {
  children: ReactNode
}) {
  return <div className="flex min-h-screen min-w-0 w-full flex-col">{children}</div>
}
