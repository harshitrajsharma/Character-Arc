import { notFound } from "next/navigation"

import { ToolCatalogDetail } from "@/components/tools/tool-catalog-detail"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { getToolCatalog } from "@/lib/tools/catalog"

type ToolDetailPageProps = {
  params: Promise<{ toolSlug: string }>
}

export default async function ToolDetailPage({ params }: ToolDetailPageProps) {
  const { toolSlug } = await params
  const catalog = await getToolCatalog()
  const catalogRoute = workspaceRoutes.tools.detail(toolSlug)
  const item = catalog.items.find((candidate) => candidate.homeRoute === catalogRoute)

  if (!item) notFound()

  return (
    <ToolCatalogDetail
      item={item}
      workspace={catalog.workspace}
      issue={catalog.issue}
    />
  )
}
