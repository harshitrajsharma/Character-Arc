import "dotenv/config"
import { prisma } from "../lib/prisma"
import { z } from "zod"

const examPropertiesSchema = z
  .object({
    examCode: z.string().nullable().optional(),
    conductingBody: z.string().nullable().optional(),
    durationMinutes: z.number().int().nullable().optional(),
    totalMarks: z.number().nullable().optional(),
    targetMarks: z.number().nullable().optional(),
    examDate: z.string().nullable().optional(),
    officialUrl: z.string().nullable().optional(),
  })
  .passthrough()

const examRowsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    title: z.string(),
    summary: z.string().nullable(),
    body: z.string().nullable(),
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
    visibility: z.enum(["PRIVATE", "WORKSPACE", "PUBLIC"]),
    allowAgentAccess: z.boolean(),
    properties: examPropertiesSchema,
    schemaVersion: z.number().int(),
    revision: z.union([z.string(), z.number()]),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
)

async function main() {
  const blockType = await prisma.blockType.findUnique({
    where: { key: "exam-prep.exam" },
  })
  if (!blockType) {
    console.log("No block type found")
    return
  }

  const examsData = await prisma.block.findMany({
    where: {
      blockTypeId: blockType.id,
      status: "ACTIVE",
      archivedAt: null,
    },
    select: {
      id: true,
      title: true,
      summary: true,
      body: true,
      status: true,
      visibility: true,
      allowAgentAccess: true,
      properties: true,
      schemaVersion: true,
      revision: true,
      createdAt: true,
      updatedAt: true,
    },
    take: 5,
  })

  console.log("Exams found:", examsData.length)
  const examRows = examRowsSchema.safeParse(examsData)
  if (!examRows.success) {
    console.error("Parse error:", examRows.error)
  } else {
    console.log("Parse success!")
  }
}

main().catch(console.error)
