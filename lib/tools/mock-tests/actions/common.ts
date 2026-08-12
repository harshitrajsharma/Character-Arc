import { z } from "zod"

export const workspaceSlugSchema = z.string().min(1).max(120)

/** Marks must be at most two decimal places and within the column's range. */
export const decimal82Schema = z
  .number()
  .min(0)
  .max(999_999.99)
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
    "Use at most two decimal places"
  )

export const idempotencyKeySchema = z
  .string()
  .min(1)
  .max(128)
  .optional()
