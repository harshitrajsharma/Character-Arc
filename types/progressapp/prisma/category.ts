import { LucideIcon } from "lucide-react"
import type { ProgressMode } from "@/types/progressapp/domain"

export type { ProgressMode as ChapterCategory } from "@/types/progressapp/domain"
type ChapterCategory = ProgressMode

export interface CategoryStyles {
  color: string
  activeColor?: string
  hoverColor?: string
  outlineColor?: string
  defaultColor?: string
}

export interface CategoryConfig extends CategoryStyles {
  id: ChapterCategory
  label: string
  icon: LucideIcon
  borderColor?: string
}

export interface CategoryVariant {
  default: string
  icon: string
}
