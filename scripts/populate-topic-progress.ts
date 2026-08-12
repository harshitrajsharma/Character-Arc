import { prisma } from "../lib/prisma"
import type { Prisma } from "../generated/prisma/client"

async function main() {
  const workspaceId = "89e6a327-2b79-4c65-809b-42fdd8e610f7"
  const now = new Date()

  // Get all topic blocks in workspace
  const topics = await prisma.block.findMany({
    where: {
      workspaceId,
      blockType: { key: "exam-prep.topic" },
    },
    select: { id: true, title: true },
  })

  const owner = await prisma.workspaceMember.findFirst({
    where: { workspaceId, role: "OWNER" },
    select: { userId: true },
  })

  if (!owner) {
    throw new Error("The target workspace must have an owner.")
  }

  console.log(`Found ${topics.length} topics in workspace.`)

  const progressData = [
    { title: "Propositional Logic", learned: true, rev: 3, prac: 3 },
    { title: "Sets and Relations", learned: true, rev: 2, prac: 2 },
    { title: "Graph Theory", learned: true, rev: 3, prac: 4 },
    { title: "Matrices and Determinants", learned: true, rev: 2, prac: 2 },
    { title: "Eigenvalues and Eigenvectors", learned: true, rev: 4, prac: 4 },
    { title: "Systems of Linear Equations", learned: true, rev: 1, prac: 1 },
    { title: "Conditional Probability", learned: true, rev: 2, prac: 2 },
    { title: "Random Variables", learned: true, rev: 2, prac: 2 },
    { title: "Distributions", learned: true, rev: 1, prac: 1 },
    { title: "Arrays and Linked Lists", learned: true, rev: 3, prac: 3 },
    { title: "Stacks and Queues", learned: true, rev: 3, prac: 3 },
    { title: "Trees and BSTs", learned: true, rev: 5, prac: 5 },
    { title: "Trees and Binary Search Trees", learned: true, rev: 5, prac: 5 },
    { title: "Hashing", learned: true, rev: 5, prac: 5 },
    { title: "Sorting and Searching", learned: true, rev: 3, prac: 3 },
    { title: "Greedy Algorithms", learned: true, rev: 5, prac: 5 },
    { title: "Dynamic Programming", learned: true, rev: 4, prac: 4 },
    { title: "Process Concept", learned: true, rev: 1, prac: 1 },
    { title: "CPU Scheduling", learned: true, rev: 2, prac: 2 },
    { title: "Relational Algebra", learned: true, rev: 2, prac: 2 },
    { title: "SQL Queries", learned: true, rev: 1, prac: 3 },
  ]

  const progressMap = new Map(progressData.map((p) => [p.title, p]))

  const createEntries: Prisma.TopicProgressCreateManyInput[] = []
  for (const topic of topics) {
    const config = progressMap.get(topic.title) ?? {
      learned: true,
      rev: 1,
      prac: 1,
    }
    if (config.learned) {
      createEntries.push({
        workspaceId,
        userId: owner.userId,
        blockId: topic.id,
        proficiency: 100,
        confidence: Math.min(100, (config.rev + config.prac) * 10),
        evidenceCount: config.rev + config.prac,
        lastPracticedAt: now,
        updatedAt: now,
      })
    }
  }

  if (createEntries.length > 0) {
    await prisma.topicProgress.createMany({
      data: createEntries,
      skipDuplicates: true,
    })
    console.log(
      `Successfully created ${createEntries.length} TopicProgress entries!`
    )
  }
}

main().finally(() => prisma.$disconnect())
