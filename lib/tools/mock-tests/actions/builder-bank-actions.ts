"use server"

import { z } from "zod"
import { getMockTestsActionContext } from "@/lib/tools/definitions/mock-tests/action-context"
import { getQuestionBankPage } from "@/lib/tools/mock-tests/question-bank-page"
import { workspaceSlugSchema } from "./common"

const schema = z.object({
  workspaceSlug: workspaceSlugSchema,
  q: z.string().max(500).default(""),
  type: z
    .enum(["ALL", "SINGLE_CHOICE", "MULTIPLE_CHOICE", "NUMERIC", "TRUE_FALSE"])
    .default("ALL"),
  difficulty: z.enum(["ALL", "UNSET", "1", "2", "3", "4", "5"]).default("ALL"),
  page: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).default(1),
})

export async function getBuilderQuestionBankAction(
  input: z.input<typeof schema>
) {
  const parsed = schema.parse(input)
  const context = await getMockTestsActionContext(parsed.workspaceSlug)
  return getQuestionBankPage(
    context.workspaceId,
    {
      q: parsed.q,
      type: parsed.type,
      difficulty: parsed.difficulty,
      page: String(parsed.page),
      size: "20",
    },
    {
      includeStats: false,
      allowedKinds: [
        "SINGLE_CHOICE",
        "MULTIPLE_CHOICE",
        "NUMERIC",
        "TRUE_FALSE",
      ],
    }
  )
}
