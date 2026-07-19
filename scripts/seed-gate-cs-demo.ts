/**
 * GATE Computer Science 2027 Demo Data Seeder
 * 
 * Run command:
 * bun run scripts/seed-gate-cs-demo.ts --workspace-slug <slug> --actor-id <user-id> --confirm
 */
import { prisma } from "../lib/prisma";
import { executeToolActionForPrincipal } from "../lib/tools/execute-tool-action";
import {
  getGateCsDemoIdempotencyKey,
  parseGateCsDemoSeedArguments,
} from "./seed-gate-cs-demo.helpers";

async function main() {
  const { workspaceSlug, actorId, confirm } = parseGateCsDemoSeedArguments(
    process.argv.slice(2)
  );

  if (!workspaceSlug || !actorId) {
    throw new Error(
      "Usage: bun run scripts/seed-gate-cs-demo.ts --workspace-slug <slug> --actor-id <user-id> --confirm"
    );
  }

  const dbUrl = process.env.DATABASE_URL || "unknown";
  const dbHost = dbUrl.match(/@([^/:]+)/)?.[1] || "unknown-host";
  const dbName = dbUrl.match(/\/([^?]+)/)?.[1] || "unknown-db";

  console.log(`Database Host: ${dbHost}`);
  console.log(`Database Name: ${dbName}`);
  console.log(`Target Workspace Slug: ${workspaceSlug}`);

  if (!confirm) {
    throw new Error("Refusing to continue without --confirm.");
  }

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  });

  if (!workspace) {
    throw new Error(`Workspace with slug ${workspaceSlug} not found.`);
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: actorId,
      },
    },
  });

  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    throw new Error(
      `Actor ${actorId} is not an OWNER or ADMIN of workspace ${workspace.slug}.`
    );
  }

  const toolDefinition = await prisma.toolDefinition.findUnique({
    where: { key: "core.exam-prep" },
  });

  if (!toolDefinition) {
    console.error("Tool definition 'core.exam-prep' not found.");
    process.exit(1);
  }

  const installation = await prisma.toolInstallation.findFirst({
    where: {
      workspaceId: workspace.id,
      toolDefinitionId: toolDefinition.id,
      status: "ACTIVE",
    },
  });

  if (!installation) {
    throw new Error(
      "Active 'core.exam-prep' tool installation not found in this workspace."
    );
  }

  const examTitle = "GATE Computer Science 2027 - Demo";
  const existingExam = await prisma.block.findFirst({
    where: {
      workspaceId: workspace.id,
      blockType: { key: "exam-prep.exam" },
      title: examTitle,
    },
  });

  if (existingExam) {
    console.log(`Demo exam already exists! ID: ${existingExam.id}`);
    console.log(`URL: /workspace/${workspace.slug}/exam-prep/${existingExam.id}`);
    return;
  }

  const principal = {
    actorId,
    workspaceId: workspace.id,
    invocationSource: "web" as const,
  };

  const executeAction = async (actionKey: string, input: unknown, idKey: string) => {
    return executeToolActionForPrincipal(
      {
        workspaceId: workspace.id,
        installationId: installation.id,
        toolKey: "core.exam-prep",
        actionKey,
        idempotencyKey: getGateCsDemoIdempotencyKey(actionKey, idKey),
        input,
      },
      principal
    );
  };

  const examResult = await executeAction("exam.create", {
    title: examTitle,
    summary: "A realistic sample preparation workspace for exploring Character Arc.",
    examDate: "2027-02-01",
    targetMarks: 85,
  }, "main-exam");

  const examId = examResult.rootBlockId || examResult.createdBlockIds[0];
  if (!examId) {
    throw new Error("Failed to create Exam. No rootBlockId returned.");
  }

  const subjectsData = [
    {
      title: "Engineering Mathematics",
      weightage: 15,
      foundationLevel: "Moderate",
      chapters: [
        { title: "Discrete Mathematics Foundations", important: true, topics: [{ title: "Propositional Logic", important: true, progress: { learned: true, rev: 3, prac: 3 } }, { title: "Sets and Relations", important: false, progress: { learned: true, rev: 2, prac: 2 } }, { title: "Graph Theory", important: true, progress: { learned: true, rev: 3, prac: 4 } }] },
        { title: "Linear Algebra", important: false, topics: [{ title: "Matrices and Determinants", important: false, progress: { learned: true, rev: 2, prac: 2 } }, { title: "Eigenvalues and Eigenvectors", important: true, progress: { learned: true, rev: 4, prac: 4 } }, { title: "Systems of Linear Equations", important: false, progress: { learned: true, rev: 1, prac: 1 } }] },
        { title: "Probability", important: false, topics: [{ title: "Conditional Probability", important: false, progress: { learned: true, rev: 2, prac: 2 } }, { title: "Random Variables", important: true, progress: { learned: true, rev: 2, prac: 2 } }, { title: "Distributions", important: false, progress: { learned: true, rev: 1, prac: 1 } }] },
      ]
    },
    {
      title: "Data Structures and Algorithms",
      weightage: 20,
      foundationLevel: "Advanced",
      chapters: [
        { title: "Data Structures", important: true, topics: [{ title: "Arrays and Linked Lists", important: false, progress: { learned: true, rev: 3, prac: 3 } }, { title: "Stacks and Queues", important: false, progress: { learned: true, rev: 3, prac: 3 } }, { title: "Trees and Binary Search Trees", important: true, progress: { learned: true, rev: 5, prac: 5 } }, { title: "Heaps", important: false, progress: { learned: true, rev: 3, prac: 3 } }, { title: "Hashing", important: true, progress: { learned: true, rev: 5, prac: 5 } }] },
        { title: "Algorithms", important: true, topics: [{ title: "Sorting and Searching", important: false, progress: { learned: true, rev: 3, prac: 3 } }, { title: "Divide and Conquer", important: false, progress: { learned: true, rev: 3, prac: 3 } }, { title: "Greedy Algorithms", important: true, progress: { learned: true, rev: 5, prac: 5 } }, { title: "Dynamic Programming", important: true, progress: { learned: true, rev: 4, prac: 4 } }, { title: "Graph Algorithms", important: false, progress: { learned: true, rev: 2, prac: 2 } }] },
      ]
    },
    {
      title: "Operating Systems",
      weightage: 10,
      foundationLevel: "Beginner",
      chapters: [
        { title: "Processes and Threads", important: true, topics: [{ title: "Process Concept", important: false, progress: { learned: true, rev: 1, prac: 1 } }, { title: "CPU Scheduling", important: true, progress: { learned: true, rev: 2, prac: 2 } }, { title: "Synchronization", important: true, progress: { learned: false, rev: 0, prac: 0 } }, { title: "Deadlocks", important: false, progress: { learned: false, rev: 0, prac: 0 } }] },
        { title: "Memory Management", important: false, topics: [{ title: "Main Memory", important: false, progress: { learned: false, rev: 0, prac: 0 } }, { title: "Virtual Memory", important: true, progress: { learned: false, rev: 0, prac: 0 } }, { title: "Paging", important: true, progress: { learned: false, rev: 0, prac: 0 } }] },
        { title: "File Systems", important: false, topics: [{ title: "File Concept", important: false, progress: { learned: false, rev: 0, prac: 0 } }, { title: "Directory Structure", important: false, progress: { learned: false, rev: 0, prac: 0 } }, { title: "Disk Scheduling", important: false, progress: { learned: false, rev: 0, prac: 0 } }] },
      ]
    },
    {
      title: "DBMS",
      weightage: 10,
      foundationLevel: "Beginner",
      chapters: [
        { title: "Relational Model and SQL", important: true, topics: [{ title: "Relational Algebra", important: true, progress: { learned: true, rev: 2, prac: 2 } }, { title: "SQL Queries", important: true, progress: { learned: true, rev: 1, prac: 3 } }, { title: "Integrity Constraints", important: false, progress: { learned: false, rev: 0, prac: 0 } }] },
        { title: "Transactions and Concurrency", important: false, topics: [{ title: "ACID Properties", important: false, progress: { learned: false, rev: 0, prac: 0 } }, { title: "Serializability", important: true, progress: { learned: false, rev: 0, prac: 0 } }, { title: "Concurrency Control", important: true, progress: { learned: false, rev: 0, prac: 0 } }] },
      ]
    },
    {
      title: "Computer Networks",
      weightage: 10,
      foundationLevel: "Beginner",
      chapters: [
        { title: "Network Layer", important: false, topics: [{ title: "IPv4 and IPv6", important: false, progress: { learned: true, rev: 1, prac: 0 } }, { title: "Routing Algorithms", important: true, progress: { learned: false, rev: 0, prac: 0 } }, { title: "Subnetting", important: true, progress: { learned: false, rev: 0, prac: 0 } }] },
        { title: "Transport Layer", important: true, topics: [{ title: "UDP", important: false, progress: { learned: false, rev: 0, prac: 0 } }, { title: "TCP Connection Management", important: false, progress: { learned: false, rev: 0, prac: 0 } }, { title: "TCP Congestion Control", important: true, progress: { learned: false, rev: 0, prac: 0 } }] },
        { title: "Application Layer", important: false, topics: [{ title: "DNS", important: false, progress: { learned: false, rev: 0, prac: 0 } }, { title: "HTTP", important: false, progress: { learned: false, rev: 0, prac: 0 } }, { title: "Email Protocols", important: false, progress: { learned: false, rev: 0, prac: 0 } }] },
      ]
    },
    {
      title: "Theory of Computation",
      weightage: 10,
      foundationLevel: "Beginner",
      chapters: [
        { title: "Automata", important: false, topics: [{ title: "Finite Automata", important: true, progress: { learned: false, rev: 0, prac: 0 } }, { title: "Regular Expressions", important: true, progress: { learned: false, rev: 0, prac: 0 } }, { title: "Context-Free Grammars", important: false, progress: { learned: false, rev: 0, prac: 0 } }] },
        { title: "Computability and Complexity", important: false, topics: [{ title: "Turing Machines", important: false, progress: { learned: false, rev: 0, prac: 0 } }, { title: "Decidability", important: true, progress: { learned: false, rev: 0, prac: 0 } }, { title: "Complexity Classes P and NP", important: false, progress: { learned: false, rev: 0, prac: 0 } }] },
      ]
    }
  ];

  const stats = {
    subjects: 0,
    chapters: 0,
    topics: 0,
    completedTopics: 0,
    startedTopics: 0,
    untouchedTopics: 0,
  };

  for (const subjectData of subjectsData) {
    const subjectResult = await executeAction("subject.create", {
      examId,
      title: subjectData.title,
      weightage: subjectData.weightage,
      foundationLevel: subjectData.foundationLevel,
    }, `subj-${subjectData.title}`);

    const subjectId = subjectResult.rootBlockId || subjectResult.createdBlockIds[0];
    stats.subjects++;

    await executeAction("subject.update-settings", {
      subjectId,
      revisionTarget: 3,
      practiceTarget: 3,
      highYieldRevisionTarget: 5,
      highYieldPracticeTarget: 5,
      chapterTestTarget: 1,
      subjectTestTarget: 1,
    }, `subj-settings-${subjectData.title}`);

    for (const chapterData of subjectData.chapters) {
      const chapterResult = await executeAction("chapter.create", {
        subjectId,
        title: chapterData.title,
        important: chapterData.important,
      }, `chap-${subjectData.title}-${chapterData.title}`);

      const chapterId = chapterResult.rootBlockId || chapterResult.createdBlockIds[0];
      stats.chapters++;

      for (const topic of chapterData.topics) {
        const topicResult = await executeAction("topic.create", {
          chapterId,
          title: topic.title,
          important: topic.important,
        }, `topic-${chapterData.title}-${topic.title}`);

        const topicId = topicResult.rootBlockId || topicResult.createdBlockIds[0];
        stats.topics++;

        if (topic.progress.learned) {
          await executeAction("topic.set-learning", {
            topicId,
            learned: true,
          }, `topic-learn-${topic.title}`);
          stats.startedTopics++;

          if (topic.progress.rev > 0) {
            await executeAction("topic.set-progress", {
              topicId,
              stage: "revision",
              count: topic.progress.rev,
            }, `topic-rev-${topic.title}`);
          }
          if (topic.progress.prac > 0) {
            await executeAction("topic.set-progress", {
              topicId,
              stage: "practice",
              count: topic.progress.prac,
            }, `topic-prac-${topic.title}`);
          }
          
          const maxRev = topic.important ? 5 : 3;
          const maxPrac = topic.important ? 5 : 3;
          if (topic.progress.rev >= maxRev && topic.progress.prac >= maxPrac) {
            stats.completedTopics++;
            stats.startedTopics--; 
          }
        } else {
          stats.untouchedTopics++;
        }
      }
    }
  }

  console.log(`\nDemo Data Seeded Successfully!`);
  console.log(`Exam ID: ${examId}`);
  console.log(`Canonical URL: /workspace/${workspace.slug}/exam-prep/${examId}`);
  console.log(`\nStatistics:`);
  console.log(`Subjects: ${stats.subjects}`);
  console.log(`Chapters: ${stats.chapters}`);
  console.log(`Topics Total: ${stats.topics}`);
  console.log(`Topics Completed: ${stats.completedTopics}`);
  console.log(`Topics Started: ${stats.startedTopics}`);
  console.log(`Topics Untouched: ${stats.untouchedTopics}`);
}

main()
  .catch((error: unknown) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
