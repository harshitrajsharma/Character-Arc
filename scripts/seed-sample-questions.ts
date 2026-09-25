import { prisma } from "../lib/prisma"

async function main() {
  const workspaceSlug = "personal-14e77ece-6df3-4d5f-bbc9-e90015c4250d"
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: { createdBy: true }
  })

  if (!workspace) throw new Error("Workspace not found")
  const authorId = workspace.createdById

  console.log("Seeding sample bank questions for workspace:", workspace.name, workspace.id)

  // Question 1: JEE Advanced Physics MCQ
  const q1 = await prisma.question.create({
    data: {
      workspaceId: workspace.id,
      authoredById: authorId,
      kind: "SINGLE_CHOICE",
      status: "PUBLISHED",
      stem: "<p>A point particle of mass <em>m</em> moves in a central potential field <em>V(r) = k r<sup>2</sup> / 2</em>. What is the frequency of small radial oscillations about the circular orbit?</p>",
      difficulty: 3,
      options: {
        create: [
          { workspaceId: workspace.id, key: "A", content: "<p>2 &omega;<sub>0</sub></p>", position: 0 },
          { workspaceId: workspace.id, key: "B", content: "<p>&omega;<sub>0</sub></p>", position: 1 },
          { workspaceId: workspace.id, key: "C", content: "<p>&radic;2 &omega;<sub>0</sub></p>", position: 2 },
          { workspaceId: workspace.id, key: "D", content: "<p>&omega;<sub>0</sub> / 2</p>", position: 3 }
        ]
      },
      solution: {
        create: {
          workspaceId: workspace.id,
          explanation: "<p>For an isotropic harmonic oscillator potential V(r) = 1/2 k r^2, the radial oscillation frequency is exactly twice the orbital frequency: 2 &omega;<sub>0</sub>.</p>",
          correctOptions: {
            create: [] // will link to option A below
          }
        }
      }
    },
    include: {
      options: true,
      solution: true
    }
  })

  const optA = q1.options.find(o => o.key === "A")!
  await prisma.questionSolutionOption.create({
    data: {
      workspaceId: workspace.id,
      questionId: q1.id,
      questionOptionId: optA.id
    }
  })

  // Question 2: JEE Advanced Chemistry MCQ
  const q2 = await prisma.question.create({
    data: {
      workspaceId: workspace.id,
      authoredById: authorId,
      kind: "SINGLE_CHOICE",
      status: "PUBLISHED",
      stem: "<p>Which of the following coordination complexes exhibits optical isomerism?</p>",
      difficulty: 4,
      options: {
        create: [
          { workspaceId: workspace.id, key: "A", content: "<p>[Co(en)<sub>3</sub>]<sup>3+</sup></p>", position: 0 },
          { workspaceId: workspace.id, key: "B", content: "<p>trans-[Co(NH<sub>3</sub>)<sub>4</sub>Cl<sub>2</sub>]<sup>+</sup></p>", position: 1 },
          { workspaceId: workspace.id, key: "C", content: "<p>[Pt(NH<sub>3</sub>)<sub>2</sub>Cl<sub>2</sub>]</p>", position: 2 },
          { workspaceId: workspace.id, key: "D", content: "<p>[Ni(CO)<sub>4</sub>]</p>", position: 3 }
        ]
      },
      solution: {
        create: {
          workspaceId: workspace.id,
          explanation: "<p>[Co(en)<sub>3</sub>]<sup>3+</sup> has D3 symmetry with no plane or center of inversion, existing as non-superimposable &Delta; and &Lambda; enantiomers.</p>",
          correctOptions: {
            create: []
          }
        }
      }
    },
    include: {
      options: true,
      solution: true
    }
  })

  const optA2 = q2.options.find(o => o.key === "A")!
  await prisma.questionSolutionOption.create({
    data: {
      workspaceId: workspace.id,
      questionId: q2.id,
      questionOptionId: optA2.id
    }
  })

  console.log("Successfully seeded 2 questions into the bank:", q1.id, q2.id)
}

main().catch(console.error).finally(() => process.exit(0))
