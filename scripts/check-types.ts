import { prisma } from "../lib/prisma"

async function main() {
  const relations = await prisma.blockRelation.findMany({ take: 5 })
  console.log("Sample Block Relations:", relations)
}

main().finally(() => prisma.$disconnect())
