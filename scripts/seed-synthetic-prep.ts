import { prisma } from "../lib/prisma"

async function main() {
  console.log("=== SEEDING SYNTHETIC TEST PREPARATION DATA ===")

  // 1. Fetch Workspace & Owner
  const workspace = await prisma.workspace.findFirst({
    where: { slug: "personal-14e77ece-6df3-4d5f-bbc9-e90015c4250d" },
    include: {
      members: { include: { user: true } },
      toolInstallations: { include: { toolDefinition: true } },
    },
  })

  if (!workspace || workspace.members.length === 0) {
    throw new Error("Workspace or workspace member not found")
  }

  const userId = workspace.members[0].userId
  const workspaceId = workspace.id
  console.log(`Workspace: ${workspace.name} (${workspaceId})`)
  console.log(`User: ${workspace.members[0].user.displayName || "Harshit"} (${userId})`)

  const examPrepInstall = workspace.toolInstallations.find(
    (t) => t.toolDefinition.key === "core.exam-prep"
  )
  const mockTestsInstall = workspace.toolInstallations.find(
    (t) => t.toolDefinition.key === "core.mock-tests"
  )

  if (!examPrepInstall || !mockTestsInstall) {
    throw new Error("Missing tool installation for core.exam-prep or core.mock-tests")
  }

  // 2. Fetch Block Types
  const [examType, subjectType, chapterType, topicType, assessmentType] = await Promise.all([
    prisma.blockType.findUniqueOrThrow({ where: { key: "exam-prep.exam" } }),
    prisma.blockType.findUniqueOrThrow({ where: { key: "exam-prep.subject" } }),
    prisma.blockType.findUniqueOrThrow({ where: { key: "exam-prep.chapter" } }),
    prisma.blockType.findUniqueOrThrow({ where: { key: "exam-prep.topic" } }),
    prisma.blockType.findUniqueOrThrow({ where: { key: "mock-tests.assessment" } }),
  ])

  // 3. Fetch Relation Types
  const [examHasSubjectRel, subjectHasChapterRel, chapterHasTopicRel] = await Promise.all([
    prisma.blockRelationType.findUniqueOrThrow({ where: { key: "exam-prep.exam-has-subject" } }),
    prisma.blockRelationType.findUniqueOrThrow({ where: { key: "exam-prep.subject-has-chapter" } }),
    prisma.blockRelationType.findUniqueOrThrow({ where: { key: "exam-prep.chapter-has-topic" } }),
  ])

  // Helper to slugify safely
  const slugify = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") + `-${Math.random().toString(36).substring(2, 7)}`

  // 4. Create or Update Exam 1: GATE CSIT 2027
  let examCsitBlock = await prisma.block.findFirst({
    where: {
      workspaceId,
      blockTypeId: examType.id,
      OR: [
        { title: { contains: "GATE Computer Science" } },
        { title: { contains: "GATE CS" } },
      ],
    },
    include: { examDetails: true },
  })

  if (examCsitBlock) {
    console.log(`Found existing CSIT exam: ${examCsitBlock.title} (${examCsitBlock.id})`)
    examCsitBlock = await prisma.block.update({
      where: { id: examCsitBlock.id },
      data: {
        title: "GATE CSIT 2027",
        summary: "GATE 2027 Computer Science & Information Technology (Paper CS)",
      },
      include: { examDetails: true },
    })
    await prisma.examBlock.upsert({
      where: { blockId: examCsitBlock.id },
      update: {
        examCode: "GATE-2027-CSIT",
        conductingBody: "GATE 2027 Organising Institute (IIT)",
        targetMarks: 85,
        targetRank: 50,
        totalMarks: 100,
        durationMinutes: 180,
        scheduleStatus: "CONFIRMED",
        expectedStartDate: new Date("2027-02-06T00:00:00Z"),
        expectedEndDate: new Date("2027-02-14T00:00:00Z"),
      },
      create: {
        blockId: examCsitBlock.id,
        workspaceId,
        examCode: "GATE-2027-CSIT",
        conductingBody: "GATE 2027 Organising Institute (IIT)",
        targetMarks: 85,
        targetRank: 50,
        totalMarks: 100,
        durationMinutes: 180,
        scheduleStatus: "CONFIRMED",
        expectedStartDate: new Date("2027-02-06T00:00:00Z"),
        expectedEndDate: new Date("2027-02-14T00:00:00Z"),
      },
    })
  } else {
    examCsitBlock = await prisma.block.create({
      data: {
        workspaceId,
        blockTypeId: examType.id,
        createdById: userId,
        originToolInstallationId: examPrepInstall.id,
        title: "GATE CSIT 2027",
        slug: slugify("gate-csit-2027"),
        summary: "GATE 2027 Computer Science & Information Technology (Paper CS)",
        status: "ACTIVE",
        visibility: "PRIVATE",
        examDetails: {
          create: {
            workspaceId,
            examCode: "GATE-2027-CSIT",
            conductingBody: "GATE 2027 Organising Institute (IIT)",
            targetMarks: 85,
            targetRank: 50,
            totalMarks: 100,
            durationMinutes: 180,
            scheduleStatus: "CONFIRMED",
            expectedStartDate: new Date("2027-02-06T00:00:00Z"),
            expectedEndDate: new Date("2027-02-14T00:00:00Z"),
          },
        },
      },
      include: { examDetails: true },
    })
    console.log(`Created GATE CSIT 2027: ${examCsitBlock.id}`)
  }

  // 5. Create or Update Exam 2: GATE DA 2027
  let examDaBlock = await prisma.block.findFirst({
    where: {
      workspaceId,
      blockTypeId: examType.id,
      title: { contains: "GATE DA" },
    },
    include: { examDetails: true },
  })

  if (examDaBlock) {
    console.log(`Found existing DA exam: ${examDaBlock.title} (${examDaBlock.id})`)
    examDaBlock = await prisma.block.update({
      where: { id: examDaBlock.id },
      data: {
        title: "GATE DA 2027",
        summary: "GATE 2027 Data Science and Artificial Intelligence (Paper DA)",
      },
      include: { examDetails: true },
    })
    await prisma.examBlock.upsert({
      where: { blockId: examDaBlock.id },
      update: {
        examCode: "GATE-2027-DA",
        conductingBody: "GATE 2027 Organising Institute (IIT)",
        targetMarks: 82,
        targetRank: 40,
        totalMarks: 100,
        durationMinutes: 180,
        scheduleStatus: "CONFIRMED",
        expectedStartDate: new Date("2027-02-06T00:00:00Z"),
        expectedEndDate: new Date("2027-02-14T00:00:00Z"),
      },
      create: {
        blockId: examDaBlock.id,
        workspaceId,
        examCode: "GATE-2027-DA",
        conductingBody: "GATE 2027 Organising Institute (IIT)",
        targetMarks: 82,
        targetRank: 40,
        totalMarks: 100,
        durationMinutes: 180,
        scheduleStatus: "CONFIRMED",
        expectedStartDate: new Date("2027-02-06T00:00:00Z"),
        expectedEndDate: new Date("2027-02-14T00:00:00Z"),
      },
    })
  } else {
    examDaBlock = await prisma.block.create({
      data: {
        workspaceId,
        blockTypeId: examType.id,
        createdById: userId,
        originToolInstallationId: examPrepInstall.id,
        title: "GATE DA 2027",
        slug: slugify("gate-da-2027"),
        summary: "GATE 2027 Data Science and Artificial Intelligence (Paper DA)",
        status: "ACTIVE",
        visibility: "PRIVATE",
        examDetails: {
          create: {
            workspaceId,
            examCode: "GATE-2027-DA",
            conductingBody: "GATE 2027 Organising Institute (IIT)",
            targetMarks: 82,
            targetRank: 40,
            totalMarks: 100,
            durationMinutes: 180,
            scheduleStatus: "CONFIRMED",
            expectedStartDate: new Date("2027-02-06T00:00:00Z"),
            expectedEndDate: new Date("2027-02-14T00:00:00Z"),
          },
        },
      },
      include: { examDetails: true },
    })
    console.log(`Created GATE DA 2027: ${examDaBlock.id}`)
  }

  // 6. Define Curriculum Structure: Common Subjects vs Specific Subjects
  interface SubjectDef {
    title: string
    code: string
    discipline: string
    foundationLevel: "BEGINNER" | "MODERATE" | "ADVANCED"
    weightageCSIT?: number
    weightageDA?: number
    chapters: {
      title: string
      isImportant: boolean
      topics: {
        title: string
        isImportant: boolean
        learningStatus: boolean
        practiceCount: number
        revisionCount: number
        proficiency: number
      }[]
    }[]
  }

  // Common Subjects (Shared between GATE CSIT and GATE DA)
  const commonSubjects: SubjectDef[] = [
    {
      title: "Engineering Mathematics",
      code: "EM-MATH",
      discipline: "Mathematics",
      foundationLevel: "MODERATE",
      weightageCSIT: 13,
      weightageDA: 15,
      chapters: [
        {
          title: "Linear Algebra",
          isImportant: true,
          topics: [
            { title: "Matrices, Determinants & Rank", isImportant: true, learningStatus: true, practiceCount: 28, revisionCount: 4, proficiency: 88 },
            { title: "Eigenvalues and Eigenvectors", isImportant: true, learningStatus: true, practiceCount: 32, revisionCount: 5, proficiency: 92 },
            { title: "Systems of Linear Equations", isImportant: true, learningStatus: true, practiceCount: 24, revisionCount: 3, proficiency: 85 },
            { title: "Vector Spaces & Orthogonality", isImportant: false, learningStatus: true, practiceCount: 16, revisionCount: 2, proficiency: 78 },
          ],
        },
        {
          title: "Probability and Statistics",
          isImportant: true,
          topics: [
            { title: "Conditional Probability & Bayes Theorem", isImportant: true, learningStatus: true, practiceCount: 34, revisionCount: 5, proficiency: 90 },
            { title: "Random Variables & Probability Distributions", isImportant: true, learningStatus: true, practiceCount: 30, revisionCount: 4, proficiency: 86 },
            { title: "Mean, Median, Mode & Standard Deviation", isImportant: false, learningStatus: true, practiceCount: 20, revisionCount: 3, proficiency: 94 },
            { title: "Sampling Distributions & Hypothesis Testing", isImportant: true, learningStatus: false, practiceCount: 10, revisionCount: 1, proficiency: 62 },
          ],
        },
        {
          title: "Discrete Mathematics Foundations",
          isImportant: true,
          topics: [
            { title: "Propositional and First-Order Logic", isImportant: true, learningStatus: true, practiceCount: 26, revisionCount: 4, proficiency: 89 },
            { title: "Sets, Relations, Functions & Partial Orders", isImportant: false, learningStatus: true, practiceCount: 22, revisionCount: 3, proficiency: 84 },
            { title: "Graph Theory & Connectivity", isImportant: true, learningStatus: true, practiceCount: 35, revisionCount: 5, proficiency: 91 },
            { title: "Combinatorics, Permutations & Counting", isImportant: false, learningStatus: true, practiceCount: 18, revisionCount: 2, proficiency: 80 },
          ],
        },
      ],
    },
    {
      title: "General Aptitude",
      code: "GA-APT",
      discipline: "Aptitude",
      foundationLevel: "BEGINNER",
      weightageCSIT: 15,
      weightageDA: 15,
      chapters: [
        {
          title: "Quantitative Aptitude",
          isImportant: true,
          topics: [
            { title: "Data Interpretation & Graphs", isImportant: true, learningStatus: true, practiceCount: 22, revisionCount: 3, proficiency: 92 },
            { title: "Numerical Computation & Estimation", isImportant: false, learningStatus: true, practiceCount: 18, revisionCount: 2, proficiency: 88 },
            { title: "Ratios, Percentages & Profit-Loss", isImportant: false, learningStatus: true, practiceCount: 25, revisionCount: 3, proficiency: 95 },
          ],
        },
        {
          title: "Verbal and Analytical Aptitude",
          isImportant: false,
          topics: [
            { title: "Reading Comprehension & Critical Reasoning", isImportant: true, learningStatus: true, practiceCount: 15, revisionCount: 2, proficiency: 84 },
            { title: "Grammar, Sentence Completion & Vocabulary", isImportant: false, learningStatus: true, practiceCount: 12, revisionCount: 2, proficiency: 80 },
          ],
        },
      ],
    },
    {
      title: "Programming and Data Structures",
      code: "CS-PDS",
      discipline: "Computer Science",
      foundationLevel: "MODERATE",
      weightageCSIT: 10,
      weightageDA: 12,
      chapters: [
        {
          title: "Programming Fundamentals & Control Flow",
          isImportant: false,
          topics: [
            { title: "Variables, Scopes & Functions", isImportant: false, learningStatus: true, practiceCount: 20, revisionCount: 3, proficiency: 96 },
            { title: "Recursion & Call Stack Execution", isImportant: true, learningStatus: true, practiceCount: 28, revisionCount: 4, proficiency: 88 },
          ],
        },
        {
          title: "Core Data Structures",
          isImportant: true,
          topics: [
            { title: "Arrays, Multi-dimensional Matrices & Pointers", isImportant: true, learningStatus: true, practiceCount: 30, revisionCount: 4, proficiency: 91 },
            { title: "Stacks, Queues & Monotonic Queues", isImportant: true, learningStatus: true, practiceCount: 26, revisionCount: 4, proficiency: 87 },
            { title: "Linked Lists & Doubly Linked Lists", isImportant: false, learningStatus: true, practiceCount: 22, revisionCount: 3, proficiency: 93 },
            { title: "Binary Trees, Binary Search Trees & AVL", isImportant: true, learningStatus: true, practiceCount: 36, revisionCount: 5, proficiency: 89 },
            { title: "Heaps, Priority Queues & Disjoint Sets", isImportant: true, learningStatus: true, practiceCount: 25, revisionCount: 3, proficiency: 84 },
          ],
        },
      ],
    },
    {
      title: "Algorithms",
      code: "CS-ALGO",
      discipline: "Computer Science",
      foundationLevel: "ADVANCED",
      weightageCSIT: 10,
      weightageDA: 10,
      chapters: [
        {
          title: "Algorithm Design Techniques",
          isImportant: true,
          topics: [
            { title: "Asymptotic Complexity & Recurrence Relations", isImportant: true, learningStatus: true, practiceCount: 30, revisionCount: 5, proficiency: 94 },
            { title: "Divide and Conquer (MergeSort, QuickSort)", isImportant: false, learningStatus: true, practiceCount: 24, revisionCount: 3, proficiency: 90 },
            { title: "Greedy Algorithms (Huffman, Activity Selection)", isImportant: true, learningStatus: true, practiceCount: 28, revisionCount: 4, proficiency: 86 },
            { title: "Dynamic Programming (Knapsack, LCS, LIS)", isImportant: true, learningStatus: true, practiceCount: 42, revisionCount: 6, proficiency: 88 },
          ],
        },
        {
          title: "Graph Algorithms",
          isImportant: true,
          topics: [
            { title: "Breadth-First and Depth-First Search", isImportant: true, learningStatus: true, practiceCount: 32, revisionCount: 4, proficiency: 92 },
            { title: "Minimum Spanning Trees (Kruskal & Prim)", isImportant: true, learningStatus: true, practiceCount: 26, revisionCount: 3, proficiency: 89 },
            { title: "Shortest Paths (Dijkstra, Bellman-Ford)", isImportant: true, learningStatus: true, practiceCount: 30, revisionCount: 4, proficiency: 85 },
          ],
        },
      ],
    },
    {
      title: "Database Management Systems",
      code: "CS-DBMS",
      discipline: "Computer Science",
      foundationLevel: "MODERATE",
      weightageCSIT: 8,
      weightageDA: 10,
      chapters: [
        {
          title: "Relational Data Model and SQL",
          isImportant: true,
          topics: [
            { title: "Relational Algebra & Tuple Relational Calculus", isImportant: true, learningStatus: true, practiceCount: 26, revisionCount: 4, proficiency: 88 },
            { title: "Complex SQL Queries, Subqueries & Aggregations", isImportant: true, learningStatus: true, practiceCount: 35, revisionCount: 5, proficiency: 94 },
            { title: "Database Normalization (1NF, 2NF, 3NF, BCNF)", isImportant: true, learningStatus: true, practiceCount: 32, revisionCount: 5, proficiency: 90 },
          ],
        },
        {
          title: "Transactions and Indexing",
          isImportant: true,
          topics: [
            { title: "ACID Properties & Concurrency Schedules", isImportant: true, learningStatus: true, practiceCount: 28, revisionCount: 4, proficiency: 86 },
            { title: "B and B+ Trees Indexing Principles", isImportant: true, learningStatus: true, practiceCount: 22, revisionCount: 3, proficiency: 82 },
          ],
        },
      ],
    },
  ]

  // CSIT Specific Subjects
  const csitSpecificSubjects: SubjectDef[] = [
    {
      title: "Operating Systems",
      code: "CS-OS",
      discipline: "Computer Science",
      foundationLevel: "MODERATE",
      weightageCSIT: 10,
      chapters: [
        {
          title: "Processes, Threads & Concurrency",
          isImportant: true,
          topics: [
            { title: "Process State Lifecycle & IPC", isImportant: false, learningStatus: true, practiceCount: 20, revisionCount: 3, proficiency: 90 },
            { title: "CPU Scheduling Algorithms", isImportant: true, learningStatus: true, practiceCount: 25, revisionCount: 4, proficiency: 92 },
            { title: "Process Synchronization & Semaphores", isImportant: true, learningStatus: true, practiceCount: 34, revisionCount: 5, proficiency: 87 },
            { title: "Deadlock Detection, Prevention & Avoidance", isImportant: true, learningStatus: true, practiceCount: 28, revisionCount: 4, proficiency: 85 },
          ],
        },
        {
          title: "Memory Management & File Systems",
          isImportant: true,
          topics: [
            { title: "Paging, Multi-level Paging & TLB Hit Ratio", isImportant: true, learningStatus: true, practiceCount: 30, revisionCount: 4, proficiency: 89 },
            { title: "Virtual Memory & Page Replacement Algorithms", isImportant: true, learningStatus: true, practiceCount: 26, revisionCount: 3, proficiency: 84 },
          ],
        },
      ],
    },
    {
      title: "Computer Networks",
      code: "CS-CN",
      discipline: "Computer Science",
      foundationLevel: "MODERATE",
      weightageCSIT: 9,
      chapters: [
        {
          title: "Network & Transport Layers",
          isImportant: true,
          topics: [
            { title: "IPv4 & IPv6 Addressing, Subnetting & CIDR", isImportant: true, learningStatus: true, practiceCount: 32, revisionCount: 5, proficiency: 94 },
            { title: "TCP Congestion Control & Sliding Window", isImportant: true, learningStatus: true, practiceCount: 30, revisionCount: 4, proficiency: 88 },
            { title: "Routing Protocols (Distance Vector & Link State)", isImportant: false, learningStatus: false, practiceCount: 12, revisionCount: 1, proficiency: 64 },
          ],
        },
      ],
    },
    {
      title: "Theory of Computation",
      code: "CS-TOC",
      discipline: "Computer Science",
      foundationLevel: "ADVANCED",
      weightageCSIT: 9,
      chapters: [
        {
          title: "Automata & Formal Languages",
          isImportant: true,
          topics: [
            { title: "DFA, NFA & Regular Language Properties", isImportant: true, learningStatus: true, practiceCount: 36, revisionCount: 5, proficiency: 91 },
            { title: "Context-Free Grammars & Pushdown Automata", isImportant: true, learningStatus: true, practiceCount: 28, revisionCount: 4, proficiency: 85 },
            { title: "Turing Machines & Decidability Classifications", isImportant: true, learningStatus: false, practiceCount: 14, revisionCount: 1, proficiency: 68 },
          ],
        },
      ],
    },
  ]

  // DA Specific Subjects
  const daSpecificSubjects: SubjectDef[] = [
    {
      title: "Machine Learning",
      code: "DA-ML",
      discipline: "Data Science & AI",
      foundationLevel: "ADVANCED",
      weightageDA: 20,
      chapters: [
        {
          title: "Supervised Learning Models",
          isImportant: true,
          topics: [
            { title: "Linear & Logistic Regression with Gradient Descent", isImportant: true, learningStatus: true, practiceCount: 38, revisionCount: 5, proficiency: 93 },
            { title: "Decision Trees, Random Forests & Boosting", isImportant: true, learningStatus: true, practiceCount: 32, revisionCount: 4, proficiency: 89 },
            { title: "Support Vector Machines (Linear & Kernel SVM)", isImportant: true, learningStatus: true, practiceCount: 26, revisionCount: 3, proficiency: 84 },
            { title: "Multi-layer Perceptrons & Backpropagation", isImportant: true, learningStatus: true, practiceCount: 30, revisionCount: 4, proficiency: 86 },
          ],
        },
        {
          title: "Unsupervised Learning & Evaluation",
          isImportant: true,
          topics: [
            { title: "K-Means & Hierarchical Clustering", isImportant: true, learningStatus: true, practiceCount: 24, revisionCount: 3, proficiency: 91 },
            { title: "Principal Component Analysis (PCA)", isImportant: true, learningStatus: true, practiceCount: 28, revisionCount: 4, proficiency: 87 },
            { title: "Model Evaluation, ROC-AUC & Bias-Variance Tradeoff", isImportant: true, learningStatus: true, practiceCount: 34, revisionCount: 5, proficiency: 95 },
          ],
        },
      ],
    },
    {
      title: "Artificial Intelligence",
      code: "DA-AI",
      discipline: "Data Science & AI",
      foundationLevel: "ADVANCED",
      weightageDA: 18,
      chapters: [
        {
          title: "Search Algorithms & Game Playing",
          isImportant: true,
          topics: [
            { title: "Informed Search: A* & Heuristic Admissibility", isImportant: true, learningStatus: true, practiceCount: 30, revisionCount: 4, proficiency: 90 },
            { title: "Adversarial Search: Minimax & Alpha-Beta Pruning", isImportant: true, learningStatus: true, practiceCount: 25, revisionCount: 3, proficiency: 88 },
          ],
        },
        {
          title: "Probabilistic Reasoning & Planning",
          isImportant: true,
          topics: [
            { title: "Bayesian Belief Networks & Inference", isImportant: true, learningStatus: true, practiceCount: 28, revisionCount: 4, proficiency: 85 },
            { title: "Markov Decision Processes & Value Iteration", isImportant: true, learningStatus: false, practiceCount: 15, revisionCount: 2, proficiency: 70 },
          ],
        },
      ],
    },
  ]

  // Function to create or update a subject tree and attach to exams
  async function processSubject(subjectDef: SubjectDef, targetExams: { blockId: string; weightage?: number }[]) {
    // 1. Check or create Subject Block
    let subjectBlock = await prisma.block.findFirst({
      where: {
        workspaceId,
        blockTypeId: subjectType.id,
        title: subjectDef.title,
      },
      include: { subjectDetails: true },
    })

    if (!subjectBlock) {
      subjectBlock = await prisma.block.create({
        data: {
          workspaceId,
          blockTypeId: subjectType.id,
          createdById: userId,
          originToolInstallationId: examPrepInstall!.id,
          title: subjectDef.title,
          slug: slugify(subjectDef.title),
          summary: `${subjectDef.discipline} foundation subject for GATE examination`,
          status: "ACTIVE",
          visibility: "PRIVATE",
          subjectDetails: {
            create: {
              workspaceId,
              canonicalCode: subjectDef.code,
              discipline: subjectDef.discipline,
              foundationLevel: subjectDef.foundationLevel,
            },
          },
        },
        include: { subjectDetails: true },
      })
      console.log(`Created Subject: ${subjectDef.title} (${subjectBlock.id})`)
    } else {
      console.log(`Reusing existing Subject: ${subjectDef.title} (${subjectBlock.id})`)
    }

    // 2. Attach to target exams with ExamSubjectConfig
    for (const target of targetExams) {
      const existingRel = await prisma.blockRelation.findUnique({
        where: {
          workspaceId_relationTypeId_fromBlockId_toBlockId: {
            workspaceId,
            relationTypeId: examHasSubjectRel.id,
            fromBlockId: target.blockId,
            toBlockId: subjectBlock.id,
          },
        },
      })

      if (!existingRel) {
        const newRel = await prisma.blockRelation.create({
          data: {
            workspaceId,
            relationTypeId: examHasSubjectRel.id,
            fromBlockId: target.blockId,
            toBlockId: subjectBlock.id,
            position: 0,
            examSubject: {
              create: {
                workspaceId,
                weightage: target.weightage ? target.weightage : null,
                isRequired: true,
                section: "General / Technical",
              },
            },
          },
        })
        console.log(`  Attached to Exam ${target.blockId} (Rel: ${newRel.id})`)
      } else if (target.weightage) {
        await prisma.examSubjectConfig.upsert({
          where: { relationId: existingRel.id },
          update: { weightage: target.weightage },
          create: {
            relationId: existingRel.id,
            workspaceId,
            weightage: target.weightage,
            isRequired: true,
          },
        })
      }
    }

    // 3. Create Chapters and Topics
    for (let cIdx = 0; cIdx < subjectDef.chapters.length; cIdx++) {
      const chDef = subjectDef.chapters[cIdx]

      // Check if Chapter exists under this Subject
      const existingChapterRel = await prisma.blockRelation.findFirst({
        where: {
          workspaceId,
          relationTypeId: subjectHasChapterRel.id,
          fromBlockId: subjectBlock.id,
          toBlock: { title: chDef.title },
        },
        include: { toBlock: true },
      })

      let chapterBlock = existingChapterRel?.toBlock

      if (!chapterBlock) {
        chapterBlock = await prisma.block.create({
          data: {
            workspaceId,
            blockTypeId: chapterType.id,
            createdById: userId,
            originToolInstallationId: examPrepInstall!.id,
            title: chDef.title,
            slug: slugify(chDef.title),
            status: "ACTIVE",
            visibility: "PRIVATE",
            chapterDetails: {
              create: {
                workspaceId,
                isImportant: chDef.isImportant,
              },
            },
          },
        })

        await prisma.blockRelation.create({
          data: {
            workspaceId,
            relationTypeId: subjectHasChapterRel.id,
            fromBlockId: subjectBlock.id,
            toBlockId: chapterBlock.id,
            position: cIdx,
          },
        })
      }

      // Create Topics under Chapter
      for (let tIdx = 0; tIdx < chDef.topics.length; tIdx++) {
        const topDef = chDef.topics[tIdx]

        const existingTopicRel = await prisma.blockRelation.findFirst({
          where: {
            workspaceId,
            relationTypeId: chapterHasTopicRel.id,
            fromBlockId: chapterBlock.id,
            toBlock: { title: topDef.title },
          },
          include: { toBlock: true },
        })

        let topicBlock = existingTopicRel?.toBlock

        const now = new Date()
        const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000)
        const fiveDaysLater = new Date(Date.now() + 5 * 24 * 3600 * 1000)

        const topicProperties = {
          learningStatus: topDef.learningStatus,
          practiceCount: topDef.practiceCount,
          revisionCount: topDef.revisionCount,
          testCount: Math.max(1, Math.floor(topDef.practiceCount / 10)),
          lastPracticed: oneDayAgo.toISOString(),
          lastRevised: topDef.learningStatus ? oneDayAgo.toISOString() : null,
          nextRevision: topDef.learningStatus ? fiveDaysLater.toISOString() : null,
          learningCompletedAt: topDef.learningStatus ? oneDayAgo.toISOString() : null,
        }

        if (!topicBlock) {
          topicBlock = await prisma.block.create({
            data: {
              workspaceId,
              blockTypeId: topicType.id,
              createdById: userId,
              originToolInstallationId: examPrepInstall!.id,
              title: topDef.title,
              slug: slugify(topDef.title),
              status: "ACTIVE",
              visibility: "PRIVATE",
              properties: topicProperties,
              topicDetails: {
                create: {
                  workspaceId,
                  isImportant: topDef.isImportant,
                },
              },
            },
          })

          await prisma.blockRelation.create({
            data: {
              workspaceId,
              relationTypeId: chapterHasTopicRel.id,
              fromBlockId: chapterBlock.id,
              toBlockId: topicBlock.id,
              position: tIdx,
            },
          })
        } else {
          await prisma.block.update({
            where: { id: topicBlock.id },
            data: { properties: topicProperties },
          })
        }

        // Upsert TopicProgress projection
        await prisma.topicProgress.upsert({
          where: {
            userId_blockId: {
              userId,
              blockId: topicBlock.id,
            },
          },
          update: {
            proficiency: topDef.proficiency,
            confidence: Math.min(98, topDef.proficiency + 5),
            evidenceCount: topDef.practiceCount + topDef.revisionCount,
            lastPracticedAt: oneDayAgo,
          },
          create: {
            workspaceId,
            userId,
            blockId: topicBlock.id,
            proficiency: topDef.proficiency,
            confidence: Math.min(98, topDef.proficiency + 5),
            evidenceCount: topDef.practiceCount + topDef.revisionCount,
            lastPracticedAt: oneDayAgo,
          },
        })
      }
    }

    // Set UserBlockState on Subject
    await prisma.userBlockState.upsert({
      where: {
        userId_blockId: {
          userId,
          blockId: subjectBlock.id,
        },
      },
      update: {
        status: "ACTIVE",
        progressPercent: 74.5,
        lastActivityAt: new Date(),
      },
      create: {
        workspaceId,
        userId,
        blockId: subjectBlock.id,
        status: "ACTIVE",
        progressPercent: 74.5,
        lastActivityAt: new Date(),
      },
    })
  }

  // Execute Subject Setup
  console.log("\n--- Processing Common Subjects (Attached to BOTH GATE CSIT and GATE DA) ---")
  for (const s of commonSubjects) {
    await processSubject(s, [
      { blockId: examCsitBlock.id, weightage: s.weightageCSIT },
      { blockId: examDaBlock.id, weightage: s.weightageDA },
    ])
  }

  console.log("\n--- Processing CSIT Specific Subjects (Attached to GATE CSIT) ---")
  for (const s of csitSpecificSubjects) {
    await processSubject(s, [{ blockId: examCsitBlock.id, weightage: s.weightageCSIT }])
  }

  console.log("\n--- Processing DA Specific Subjects (Attached to GATE DA) ---")
  for (const s of daSpecificSubjects) {
    await processSubject(s, [{ blockId: examDaBlock.id, weightage: s.weightageDA }])
  }

  // 7. Update UserBlockState on Exams
  await Promise.all([
    prisma.userBlockState.upsert({
      where: { userId_blockId: { userId, blockId: examCsitBlock.id } },
      update: { status: "ACTIVE", progressPercent: 71.8, lastActivityAt: new Date() },
      create: { workspaceId, userId, blockId: examCsitBlock.id, status: "ACTIVE", progressPercent: 71.8, lastActivityAt: new Date() },
    }),
    prisma.userBlockState.upsert({
      where: { userId_blockId: { userId, blockId: examDaBlock.id } },
      update: { status: "ACTIVE", progressPercent: 62.4, lastActivityAt: new Date() },
      create: { workspaceId, userId, blockId: examDaBlock.id, status: "ACTIVE", progressPercent: 62.4, lastActivityAt: new Date() },
    }),
  ])

  // 8. Populate Scheduled Tests & Test Records (for rich active experience)
  const mathSubject = await prisma.block.findFirst({
    where: { workspaceId, title: "Engineering Mathematics" },
  })

  if (mathSubject) {
    console.log("\n--- Seeding Scheduled Tests & Test Records ---")
    // Upcoming Scheduled Tests
    const scheduledDate1 = new Date(Date.now() + 3 * 24 * 3600 * 1000)
    const scheduledDate2 = new Date(Date.now() + 7 * 24 * 3600 * 1000)

    await prisma.scheduledTest.createMany({
      data: [
        {
          workspaceId,
          installationId: examPrepInstall.id,
          userId,
          examId: examCsitBlock.id,
          subjectId: mathSubject.id,
          title: "GATE CSIT 2027: Linear Algebra & Calculus Sprint",
          scope: "SUBJECT",
          status: "PLANNED",
          scheduledFor: scheduledDate1,
          durationMinutes: 60,
          totalMarks: 30,
          notes: "Focus on Eigenvalues and Systems of Linear Equations",
        },
        {
          workspaceId,
          installationId: examPrepInstall.id,
          userId,
          examId: examDaBlock.id,
          subjectId: mathSubject.id,
          title: "GATE DA 2027: Probability & Linear Algebra Sectional",
          scope: "SUBJECT",
          status: "PLANNED",
          scheduledFor: scheduledDate2,
          durationMinutes: 90,
          totalMarks: 45,
          notes: "Bayes Theorem, Multivariate Distributions & PCA connections",
        },
      ],
    })

    // Past Completed Test Records with Marks
    const completedAt1 = new Date(Date.now() - 6 * 24 * 3600 * 1000)
    const completedAt2 = new Date(Date.now() - 2 * 24 * 3600 * 1000)

    await prisma.testRecord.createMany({
      data: [
        {
          workspaceId,
          userId,
          examId: examCsitBlock.id,
          subjectId: mathSubject.id,
          title: "GATE CSIT 2027: Engineering Mathematics Benchmark Test",
          scope: "SUBJECT",
          attemptedAt: completedAt1,
          marksObtained: 26.5,
          totalMarks: 30.0,
          summary: "Outstanding performance in Linear Algebra; review Bayes Theorem distributions.",
        },
        {
          workspaceId,
          userId,
          examId: examDaBlock.id,
          subjectId: mathSubject.id,
          title: "GATE DA 2027: Discrete Math & Logic Sprint Quiz",
          scope: "SUBJECT",
          attemptedAt: completedAt2,
          marksObtained: 22.0,
          totalMarks: 25.0,
          summary: "Quick pacing, 88% accuracy. Graph Theory questions completed cleanly.",
        },
      ],
    })
  }

  // 9. Populate Realistic Mock Tests in the Assessment Bank
  console.log("\n--- Seeding Realistic Published Assessments in Mock Tests Tool ---")

  const assessmentSeedData = [
    {
      title: "GATE CSIT 2027 — All India Mock Test 1 (Full Syllabus)",
      examBlockId: examCsitBlock.id,
      instructions: "Comprehensive full syllabus mock covering Mathematics, Digital Logic, Algorithms, DBMS, OS and Computer Networks.",
      durationMinutes: 180,
      totalMarks: 100,
      paperType: "full_length",
      visibility: "public",
      questions: [
        {
          stem: "Let $A$ be an $n \\times n$ real invertible matrix. If $\\lambda$ is an eigenvalue of $A$, which of the following is necessarily an eigenvalue of $A^{-1}$?",
          type: "single_choice",
          marks: 1,
          negativeMarks: 0.33,
          options: [
            { key: "A", content: "$\\lambda^2$", isCorrect: false },
            { key: "B", content: "$\\frac{1}{\\lambda}$", isCorrect: true },
            { key: "C", content: "$-\\lambda$", isCorrect: false },
            { key: "D", content: "$\\sqrt{\\lambda}$", isCorrect: false },
          ],
          explanation: "Since $Av = \\lambda v$, multiplying both sides by $A^{-1}$ gives $v = \\lambda A^{-1}v \\implies A^{-1}v = \\frac{1}{\\lambda}v$. Hence $\\frac{1}{\\lambda}$ is an eigenvalue of $A^{-1}$.",
        },
        {
          stem: "What is the worst-case time complexity of QuickSort when the pivot is always chosen as the median of the array using the Median-of-Medians algorithm?",
          type: "single_choice",
          marks: 2,
          negativeMarks: 0.66,
          options: [
            { key: "A", content: "$O(n \\log n)$", isCorrect: true },
            { key: "B", content: "$O(n^2)$", isCorrect: false },
            { key: "C", content: "$O(n)$", isCorrect: false },
            { key: "D", content: "$O(\\log n)$", isCorrect: false },
          ],
          explanation: "Finding the median takes $O(n)$ time. Partitioning around this median guarantees a balanced split (at worst 30-70), resulting in recurrence $T(n) = T(n/5) + T(7n/10) + O(n)$, which solves to $O(n \\log n)$ worst case.",
        },
        {
          stem: "In an Operating System with demand paging, a process executes 1,000,000 instructions. 20 page faults occur. If memory access time is 100 ns and page fault service time is 10 ms, what is the effective memory access time?",
          type: "single_choice",
          marks: 2,
          negativeMarks: 0.66,
          options: [
            { key: "A", content: "$100$ ns", isCorrect: false },
            { key: "B", content: "$300$ ns", isCorrect: true },
            { key: "C", content: "$1$ $\\mu$s", isCorrect: false },
            { key: "D", content: "$200$ ns", isCorrect: false },
          ],
          explanation: "Fault rate $p = 20 / 10^6 = 2 \\times 10^{-5}$. EAT $= (1 - p)(100\\text{ ns}) + p(10\\text{ ms}) = 100 + (2 \\times 10^{-5} \\times 10^7\\text{ ns}) = 100 + 200 = 300$ ns.",
        },
      ],
    },
    {
      title: "GATE DA 2027 — Data Science & AI Diagnostic Test (Common + ML)",
      examBlockId: examDaBlock.id,
      instructions: "High-yield diagnostic test for GATE DA covering Probability, Linear Algebra, Python/Data Structures, and Machine Learning.",
      durationMinutes: 90,
      totalMarks: 50,
      paperType: "sectional",
      visibility: "public",
      questions: [
        {
          stem: "In Principal Component Analysis (PCA), the principal components correspond to which mathematical property of the covariance matrix $\\Sigma$ of the centered data?",
          type: "single_choice",
          marks: 2,
          negativeMarks: 0.66,
          options: [
            { key: "A", content: "The eigenvectors of $\\Sigma$ sorted in descending order of their corresponding eigenvalues", isCorrect: true },
            { key: "B", content: "The null space vectors of $\\Sigma$", isCorrect: false },
            { key: "C", content: "The row-reduced echelon form pivot columns of $\\Sigma$", isCorrect: false },
            { key: "D", content: "The Cholesky decomposition factors of $\\Sigma$", isCorrect: false },
          ],
          explanation: "PCA maximizes variance by projecting onto the eigenvectors of the covariance matrix. The eigenvalues quantify the variance explained along each corresponding eigenvector axis.",
        },
        {
          stem: "Consider a fair coin flipped 10 times. What is the probability of getting exactly 5 heads given that at least one head appeared?",
          type: "single_choice",
          marks: 1,
          negativeMarks: 0.33,
          options: [
            { key: "A", content: "$\\frac{\\binom{10}{5}}{2^{10} - 1}$", isCorrect: true },
            { key: "B", content: "$\\frac{\\binom{10}{5}}{2^{10}}$", isCorrect: false },
            { key: "C", content: "$\\frac{1}{2}$", isCorrect: false },
            { key: "D", content: "$\\frac{252}{1000}$", isCorrect: false },
          ],
          explanation: "By conditional probability, $P(5H \\mid \\ge 1H) = \\frac{P(5H \\cap \\ge 1H)}{P(\\ge 1H)} = \\frac{\\binom{10}{5} / 2^{10}}{1 - (1/2)^{10}} = \\frac{\\binom{10}{5}}{2^{10} - 1}$.",
        },
        {
          stem: "Which of the following loss functions is convex and typically minimized in Logistic Regression?",
          type: "single_choice",
          marks: 1,
          negativeMarks: 0.33,
          options: [
            { key: "A", content: "Binary Cross-Entropy (Log Loss)", isCorrect: true },
            { key: "B", content: "Mean Squared Error on raw binary labels", isCorrect: false },
            { key: "C", content: "Hinge Loss with zero margin", isCorrect: false },
            { key: "D", content: "0-1 Loss", isCorrect: false },
          ],
          explanation: "Binary Cross-Entropy (Log Loss) $-\\sum [y \\log(\\hat{y}) + (1-y)\\log(1-\\hat{y})]$ is smooth and strictly convex for logistic sigmoid hypotheses, avoiding non-convex local minima.",
        },
      ],
    },
  ]

  for (const aData of assessmentSeedData) {
    const existing = await prisma.assessment.findFirst({
      where: { workspaceId, block: { title: aData.title } },
      include: { questions: true, attempts: true },
    })

    if (existing) {
      if (existing.questions.length > 0 && existing.attempts.length > 0) {
        console.log(`Assessment already exists with questions: ${aData.title}`)
        continue
      }
      // If incomplete from a failed previous run, delete it and recreate cleanly
      await prisma.attemptResponseOption.deleteMany({
        where: { response: { attempt: { assessmentId: existing.blockId } } },
      })
      await prisma.attemptResponse.deleteMany({
        where: { attempt: { assessmentId: existing.blockId } },
      })
      await prisma.attempt.deleteMany({ where: { assessmentId: existing.blockId } })
      await prisma.assessmentQuestion.deleteMany({ where: { assessmentId: existing.blockId } })
      await prisma.assessment.delete({ where: { blockId: existing.blockId } })
      await prisma.block.delete({ where: { id: existing.blockId } })
    }

    const aBlock = await prisma.block.create({
      data: {
        workspaceId,
        blockTypeId: assessmentType.id,
        createdById: userId,
        originToolInstallationId: mockTestsInstall.id,
        title: aData.title,
        slug: slugify(aData.title),
        status: "ACTIVE",
        visibility: "PUBLIC",
        assessmentDetails: {
          create: {
            workspaceId,
            examBlockId: aData.examBlockId,
            status: "PUBLISHED",
            publishedAt: new Date(),
            durationMinutes: aData.durationMinutes,
            totalMarks: aData.totalMarks,
            instructions: aData.instructions,
            blueprint: {
              targetExam: aData.title.includes("CSIT") ? "GATE CSIT 2027" : "GATE DA 2027",
              paperType: aData.paperType,
              subjects: ["Engineering Mathematics", "General Aptitude", aData.title.includes("CSIT") ? "Algorithms" : "Machine Learning"],
              visibility: "public",
              allowCloning: true,
            },
          },
        },
      },
    })

    // Add Questions to Assessment
    for (let qIdx = 0; qIdx < aData.questions.length; qIdx++) {
      const qData = aData.questions[qIdx]
      const question = await prisma.question.create({
        data: {
          workspaceId,
          authoredById: userId,
          kind: "SINGLE_CHOICE",
          difficulty: 3,
          status: "PUBLISHED",
          stem: qData.stem,
          metadata: {
            title: `Question ${qIdx + 1}: ${qData.stem.substring(0, 45)}...`,
          },
          options: {
            create: qData.options.map((opt, oIdx) => ({
              workspaceId,
              key: opt.key,
              content: opt.content,
              position: oIdx,
            })),
          },
          solution: {
            create: {
              workspaceId,
              explanation: qData.explanation,
            },
          },
        },
        include: { options: true, solution: true },
      })

      // Link the correct option in QuestionSolutionOption
      const correctOptSeed = qData.options.find((opt) => opt.isCorrect)
      const matchedOption = question.options.find(
        (opt) => opt.key === correctOptSeed?.key
      )
      if (matchedOption && question.solution) {
        await prisma.questionSolutionOption.create({
          data: {
            workspaceId,
            questionId: question.id,
            questionOptionId: matchedOption.id,
          },
        })
      }

      await prisma.assessmentQuestion.create({
        data: {
          workspaceId,
          assessmentId: aBlock.id,
          questionId: question.id,
          position: qIdx,
          section: "Technical & Core",
          marks: qData.marks,
          negativeMarks: qData.negativeMarks,
        },
      })
    }

    // Create an Evaluated Attempt with high performance scorecard
    const attempt = await prisma.attempt.create({
      data: {
        workspaceId,
        assessmentId: aBlock.id,
        userId,
        status: "EVALUATED",
        score: Math.round(aData.totalMarks * 0.82),
        maxScore: aData.totalMarks,
        correctCount: aData.questions.length - 1,
        incorrectCount: 1,
        unansweredCount: 0,
        timeSpentSeconds: aData.durationMinutes * 48,
        startedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000 - aData.durationMinutes * 48 * 1000),
        submittedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
        evaluatedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
        metadata: {
          totalQuestions: aData.questions.length,
          correct: aData.questions.length - 1,
          incorrect: 1,
          unanswered: 0,
          accuracy: 85.0,
          percentile: 94.2,
        },
      },
    })

    // Create rich AttemptResponse and AttemptResponseOption records
    const createdAssessmentQuestions = await prisma.assessmentQuestion.findMany({
      where: { assessmentId: aBlock.id },
      include: {
        question: {
          include: {
            options: true,
            solution: { include: { correctOptions: true } },
          },
        },
      },
      orderBy: { position: "asc" },
    })

    for (let idx = 0; idx < createdAssessmentQuestions.length; idx++) {
      const aq = createdAssessmentQuestions[idx]
      const isCorrect = idx !== 0 // Question 1 incorrect, rest correct
      const correctOptId = aq.question.solution?.correctOptions[0]?.questionOptionId
      const chosenOpt = isCorrect
        ? aq.question.options.find((o) => o.id === correctOptId)
        : aq.question.options.find((o) => o.id !== correctOptId) ?? aq.question.options[0]

      const response = await prisma.attemptResponse.create({
        data: {
          workspaceId,
          attemptId: attempt.id,
          questionId: aq.question.id,
          isCorrect,
          awardedMarks: isCorrect ? aq.marks : -Number(aq.negativeMarks),
          timeSpentSeconds: 95,
          answeredAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
        },
      })

      if (chosenOpt) {
        await prisma.attemptResponseOption.create({
          data: {
            workspaceId,
            responseId: response.id,
            questionOptionId: chosenOpt.id,
          },
        })
      }
    }

    console.log(`Created Published Assessment: ${aData.title} with Evaluated Attempt (${attempt.id})`)
  }

  console.log("\n✅ SYNTHETIC TEST PREPARATION DATA GENERATION COMPLETE!")
}

main()
  .catch((e) => {
    console.error("FATAL ERROR in seed script:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
