export type ArcDraft = {
  title: string
  objective: string
  currentReality: string
  why: string
  targetDate: string
  constraints: string
}

export type ArcFieldErrors = Partial<Record<keyof ArcDraft, string[]>>

export type UpdateArcDraft = <Key extends keyof ArcDraft>(
  key: Key,
  value: ArcDraft[Key]
) => void

export const EMPTY_ARC_DRAFT: ArcDraft = {
  title: "",
  objective: "",
  currentReality: "",
  why: "",
  targetDate: "",
  constraints: "",
}
