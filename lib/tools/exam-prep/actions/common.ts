import { z } from "zod"

export const workspaceSlugSchema = z.string().trim().min(1).max(100)
