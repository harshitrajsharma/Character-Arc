import { redirect } from "next/navigation"

/** Compatibility for saved links; Workspace is the single authenticated home. */
export default function LegacyDashboard() {
  redirect("/workspace")
}
