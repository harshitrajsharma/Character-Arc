import { BaseTest, TestStats } from "@/types/progressapp/prisma/test"

export function calculateTestStats(
  tests: BaseTest[],
  weightage: number
): TestStats {
  if (!tests.length) {
    return {
      totalTests: 0,
      highestScore: 0,
      lowestScore: 0,
      averageScore: 0,
      expectedMarks: 0,
      weightage,
      averagePerformance: 0,
    }
  }

  const scores = tests.map((test) => test.score)
  const totalTests = tests.length
  const highestScore = Math.max(...scores)
  const lowestScore = Math.min(...scores)
  const averageScore =
    scores.reduce((acc, score) => acc + score, 0) / totalTests
  const averagePerformance = averageScore / 100
  const expectedMarks = Math.round(weightage * averagePerformance)

  return {
    totalTests,
    highestScore,
    lowestScore,
    averageScore,
    expectedMarks,
    weightage,
    averagePerformance,
  }
}
