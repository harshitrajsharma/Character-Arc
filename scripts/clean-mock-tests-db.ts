import { prisma } from "../lib/prisma"

async function main() {
  console.log("Cleaning mock test data from DB...")

  const deletedResponseOptions = await prisma.attemptResponseOption.deleteMany({})
  console.log("Deleted AttemptResponseOption:", deletedResponseOptions.count)

  const deletedResponses = await prisma.attemptResponse.deleteMany({})
  console.log("Deleted AttemptResponse:", deletedResponses.count)

  const deletedAttempts = await prisma.attempt.deleteMany({})
  console.log("Deleted Attempt:", deletedAttempts.count)

  const deletedAssessmentQuestions = await prisma.assessmentQuestion.deleteMany({})
  console.log("Deleted AssessmentQuestion:", deletedAssessmentQuestions.count)

  const deletedQuestionSolutionOptions = await prisma.questionSolutionOption.deleteMany({})
  console.log("Deleted QuestionSolutionOption:", deletedQuestionSolutionOptions.count)

  const deletedQuestionSolutions = await prisma.questionSolution.deleteMany({})
  console.log("Deleted QuestionSolution:", deletedQuestionSolutions.count)

  const deletedQuestionOptions = await prisma.questionOption.deleteMany({})
  console.log("Deleted QuestionOption:", deletedQuestionOptions.count)

  const deletedQuestionTargets = await prisma.questionTarget.deleteMany({})
  console.log("Deleted QuestionTarget:", deletedQuestionTargets.count)

  const deletedQuestions = await prisma.question.deleteMany({})
  console.log("Deleted Question:", deletedQuestions.count)

  const deletedAssessments = await prisma.assessment.deleteMany({})
  console.log("Deleted Assessment:", deletedAssessments.count)

  const mockBlocks = await prisma.block.findMany({
    where: {
      OR: [
        { blockType: { key: { contains: "mock-tests" } } },
        { blockType: { key: { contains: "assessment" } } },
      ]
    },
    select: { id: true, title: true }
  })
  console.log(`Found ${mockBlocks.length} mock test blocks to delete:`, mockBlocks.map(b => b.title))


  const mockBlockIds = mockBlocks.map(b => b.id)

  if (mockBlockIds.length > 0) {
    const deletedRelations = await prisma.blockRelation.deleteMany({
      where: {
        OR: [
          { fromBlockId: { in: mockBlockIds } },
          { toBlockId: { in: mockBlockIds } }
        ]
      }
    })
    console.log("Deleted BlockRelation for mock-tests:", deletedRelations.count)

    const deletedBlockTags = await prisma.blockTag.deleteMany({
      where: { blockId: { in: mockBlockIds } }
    })
    console.log("Deleted BlockTag for mock-tests:", deletedBlockTags.count)

    const deletedBlocks = await prisma.block.deleteMany({
      where: { id: { in: mockBlockIds } }
    })
    console.log("Deleted Block for mock-tests:", deletedBlocks.count)
  }

  console.log("DB clean complete!")
}

main().catch(console.error).finally(() => process.exit(0))
