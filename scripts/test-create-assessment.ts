import { prisma } from "../lib/prisma"
import { createAssessmentAction } from "../lib/tools/mock-tests/actions/assessment-actions"

async function main() {
  console.log("Testing createAssessmentAction directly...")
  try {
    const res = await createAssessmentAction({
      workspaceSlug: "personal-14e77ece-6df3-4d5f-bbc9-e90015c4250d",
      title: "Direct Test Mock",
      durationMinutes: 180,
      totalMarks: 120,
      instructions: null,
      blueprint: {
        sections: [],
        calculatorAllowed: true,
        taxonomy: {
          paperType: "full_length",
          subjectScope: "multi_subject",
          subjects: ["Physics", "Chemistry"],
          examTag: "JEE Advanced"
        }
      },
      passingBenchmark: 33,
      distinctionBenchmark: 70,
      idempotencyKey: "test-idempotency-key-" + Date.now()
    })
    console.log("Result:", res)
  } catch (err: any) {
    console.error("Action Error:", err)
  }
}

main().catch(console.error).finally(() => process.exit(0))
