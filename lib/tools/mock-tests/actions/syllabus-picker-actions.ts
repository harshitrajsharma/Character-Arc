"use server"

import { z } from "zod"
import { getMockTestsActionContext } from "@/lib/tools/definitions/mock-tests/action-context"
import { getSyllabusPickerPage } from "../syllabus-picker-page"
import { SYLLABUS_SEARCH_LIMIT } from "../syllabus-picker"
import { workspaceSlugSchema } from "./common"

const schema = z.object({
  workspaceSlug: workspaceSlugSchema,
  q: z.string().trim().max(SYLLABUS_SEARCH_LIMIT).default(""),
  type: z.enum(["ALL", "exam-prep.chapter", "exam-prep.topic"]).default("ALL"),
  cursor: z
    .object({ updatedAt: z.string().datetime(), blockId: z.string().uuid() })
    .nullable()
    .default(null),
})

export async function getSyllabusPickerPageAction(
  input: z.input<typeof schema>
) {
  const parsed = schema.parse(input)
  const context = await getMockTestsActionContext(parsed.workspaceSlug)
  return getSyllabusPickerPage(context.workspaceId, parsed)
}
