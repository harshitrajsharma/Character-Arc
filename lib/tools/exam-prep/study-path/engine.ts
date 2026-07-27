import { getRequiredRevisions, getRequiredPractices } from "../progress/rules";
import { normalizeSubjectProgressPolicy } from "../progress/policy";
import type { SubjectWithRelations } from "@/types/progressapp/domain/curriculum";
import {
  StudyPathEngineInput,
  StudyPathOutput,
  StudyPathChapter,
  StudyPathStep,
  StudyPathEngineInputTestRecord,
  StudyPathStepStatus,
} from "./types";

function getValidDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? null : date;
}

function getCompletionDate(value: Date | string | null | undefined): string | null {
  return getValidDate(value)?.toISOString() ?? null;
}

function getTestTargetCompletionDate(
  records: StudyPathEngineInputTestRecord[],
  target: number
): string | null {
  if (target <= 0) return null;
  const validDates = records
    .filter((record) =>
      Number.isFinite(record.marksObtained) &&
      Number.isFinite(record.totalMarks) &&
      record.totalMarks > 0 &&
      record.marksObtained >= 0 &&
      record.marksObtained <= record.totalMarks &&
      getValidDate(record.createdAt) !== null
    )
    .map((record) => getValidDate(record.createdAt)!)
    .sort((left, right) => left.getTime() - right.getTime());

  return validDates.length >= target ? validDates[target - 1].toISOString() : null;
}

function getLatestValidTest(records: StudyPathEngineInputTestRecord[]) {
  const valid = records.filter((r) =>
    Number.isFinite(r.marksObtained) &&
    Number.isFinite(r.totalMarks) &&
    r.totalMarks > 0 &&
    r.marksObtained >= 0 &&
    r.marksObtained <= r.totalMarks &&
    getValidDate(r.createdAt) !== null
  );
  if (valid.length === 0) return null;
  return valid.sort((a, b) => {
    const timeA = getValidDate(a.createdAt)!.getTime();
    const timeB = getValidDate(b.createdAt)!.getTime();
    if (timeA !== timeB) return timeB - timeA; // Newer first
    return a.id.localeCompare(b.id); // Tie breaker ID ascending
  })[0];
}

export function subjectToStudyPathInput(
  subject: SubjectWithRelations,
  now: Date
): StudyPathEngineInput {
  const allTestRecords = [
    ...(subject.testRecords || []),
    ...(subject.chapters || []).flatMap(ch => ch.testRecords || [])
  ];
  
  // avoid duplicate TestRecords by stable record ID
  const deduplicatedRecords = Array.from(
    new Map(allTestRecords.map(r => [r.id, r])).values()
  );

  const subjectTestRecords = deduplicatedRecords.filter(r => !r.chapterId);
  
  const chapters = (subject.chapters || []).map(ch => {
    const chapterRecords = deduplicatedRecords.filter(r => r.chapterId === ch.id);
    
    return {
      id: ch.id,
      name: ch.name,
      position: ch.position,
      important: ch.important,
      testRecords: chapterRecords,
      topics: (ch.topics || []).map(t => ({
        id: t.id,
        name: t.name,
        position: t.position,
        important: t.important,
        learningStatus: t.learningStatus,
        revisionCount: t.revisionCount,
        practiceCount: t.practiceCount,
        nextRevision: t.nextRevision,
        learningCompletedAt: t.learningCompletedAt,
        lastRevised: t.lastRevised,
        lastPracticed: t.lastPracticed,
        targetRevisions: t.targetRevisions,
        targetPractices: t.targetPractices,
      }))
    };
  });

  return {
    chapters,
    subjectTestRecords,
    policy: subject.progressPolicy,
    now,
  };
}

export function generateStudyPath(input: StudyPathEngineInput): StudyPathOutput {
  const policy = normalizeSubjectProgressPolicy(input.policy);
  let orderCounter = 0;

  const sortedChapters = [...input.chapters].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return a.id.localeCompare(b.id);
  });

  let firstIncompleteLearnFound = false;
  let previousLearnStepId: string | null = null;

  const chapters: StudyPathChapter[] = [];
  const subjectSteps: StudyPathStep[] = [];
  const allSteps: StudyPathStep[] = [];

  for (const chapter of sortedChapters) {
    const sortedTopics = [...chapter.topics].sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return a.id.localeCompare(b.id);
    });

    const chapterSteps: StudyPathStep[] = [];

    for (const topic of sortedTopics) {
      // 1. Learn Step
      let learnStatus: StudyPathStepStatus;
      if (topic.learningStatus) {
        learnStatus = "completed";
      } else {
        if (firstIncompleteLearnFound) {
          learnStatus = "locked";
        } else {
          learnStatus = "ready";
          firstIncompleteLearnFound = true; // Lock subsequent learn steps
        }
      }

      const learnStepId = `learn::${chapter.id}::${topic.id}`;
      const learnStep: StudyPathStep = {
        id: learnStepId,
        kind: "learn",
        status: learnStatus,
        stage: "learning",
        title: `Learn ${topic.name}`,
        reason: learnStatus === "completed" ? "Topic learned" : (learnStatus === "locked" ? "Prerequisites incomplete" : "Curriculum requirement"),
        evidence: topic.learningStatus ? "Completed" : "Not learned",
        chapterId: chapter.id,
        chapterName: chapter.name,
        topicId: topic.id,
        topicName: topic.name,
        isHighYield: topic.important,
        order: ++orderCounter,
        dependencyIds: previousLearnStepId ? [previousLearnStepId] : [],
        urgencyScore: learnStatus === "ready" ? 80 + (topic.important ? 5 : 0) : 0,
        completedAt: learnStatus === "completed" ? getCompletionDate(topic.learningCompletedAt) : null,
      };

      chapterSteps.push(learnStep);
      allSteps.push(learnStep);
      previousLearnStepId = learnStep.id;

      // 2. Revise Step
      const reqRev = getRequiredRevisions(
        {
          important: topic.important,
          targetRevisions: topic.targetRevisions ?? undefined,
        },
        policy
      );

      let revStatus: StudyPathStepStatus;
      const validNextRev = getValidDate(topic.nextRevision);
      if (!topic.learningStatus) {
        revStatus = "locked";
      } else if (topic.revisionCount > reqRev) {
        revStatus = "overachieved";
      } else if (topic.revisionCount === reqRev) {
        revStatus = "completed";
      } else if (validNextRev && validNextRev.getTime() <= input.now.getTime()) {
        revStatus = "due";
      } else {
        revStatus = "ready";
      }

      const reviseStep: StudyPathStep = {
        id: `revise::${chapter.id}::${topic.id}`,
        kind: "revise",
        status: revStatus,
        stage: "revision",
        title: `Revise ${topic.name}`,
        reason: revStatus === "completed" || revStatus === "overachieved"
          ? (reqRev === 0 ? "Excluded from requirements" : "Met revision targets")
          : (revStatus === "locked" ? "Prerequisites incomplete" : (revStatus === "due" ? "Overdue for revision" : "Revision gap")),
        evidence: reqRev === 0 ? "Not required" : `${topic.revisionCount}/${reqRev} revisions`,
        chapterId: chapter.id,
        chapterName: chapter.name,
        topicId: topic.id,
        topicName: topic.name,
        isHighYield: topic.important,
        order: ++orderCounter,
        dependencyIds: !topic.learningStatus ? [learnStep.id] : [],
        urgencyScore:
          (revStatus === "due" ? 100 : revStatus === "ready" ? 70 : 0) +
          ((revStatus === "ready" || revStatus === "due") && topic.important ? 5 : 0),
        completedAt:
          revStatus === "completed" || revStatus === "overachieved"
            ? getCompletionDate(topic.lastRevised)
            : null,
      };

      chapterSteps.push(reviseStep);
      allSteps.push(reviseStep);

      // 3. Practice Step
      const reqPrac = getRequiredPractices(
        {
          important: topic.important,
          targetPractices: topic.targetPractices ?? undefined,
        },
        policy
      );

      let pracStatus: StudyPathStepStatus;
      if (!topic.learningStatus) {
        pracStatus = "locked";
      } else if (topic.practiceCount > reqPrac) {
        pracStatus = "overachieved";
      } else if (topic.practiceCount === reqPrac) {
        pracStatus = "completed";
      } else {
        pracStatus = "ready";
      }

      const practiceStep: StudyPathStep = {
        id: `practice::${chapter.id}::${topic.id}`,
        kind: "practice",
        status: pracStatus,
        stage: "practice",
        title: `Practice ${topic.name}`,
        reason: pracStatus === "completed" || pracStatus === "overachieved"
          ? (reqPrac === 0 ? "Excluded from requirements" : "Met practice targets")
          : (pracStatus === "locked" ? "Prerequisites incomplete" : "Practice gap"),
        evidence: reqPrac === 0 ? "Not required" : `${topic.practiceCount}/${reqPrac} practice`,
        chapterId: chapter.id,
        chapterName: chapter.name,
        topicId: topic.id,
        topicName: topic.name,
        isHighYield: topic.important,
        order: ++orderCounter,
        dependencyIds: !topic.learningStatus ? [learnStep.id] : [],
        urgencyScore: pracStatus === "ready" ? 70 + (topic.important ? 5 : 0) : 0,
        completedAt:
          pracStatus === "completed" || pracStatus === "overachieved"
            ? getCompletionDate(topic.lastPracticed)
            : null,
      };

      chapterSteps.push(practiceStep);
      allSteps.push(practiceStep);
    }

    // 4. Chapter Test Step
    const target = policy.chapterTestTarget;
    const validTests = chapter.testRecords.filter(
      (r) =>
        Number.isFinite(r.marksObtained) &&
        Number.isFinite(r.totalMarks) &&
        r.totalMarks > 0 &&
        r.marksObtained >= 0 &&
        r.marksObtained <= r.totalMarks &&
        getValidDate(r.createdAt) !== null
    );

    const incompleteChapterSteps = chapterSteps.filter(s => 
      (s.kind === "learn" && s.status !== "completed" && s.status !== "overachieved") ||
      (s.kind === "revise" && s.status !== "completed" && s.status !== "overachieved") ||
      (s.kind === "practice" && s.status !== "completed" && s.status !== "overachieved")
    );

    let testStatus: StudyPathStepStatus;
    if (target === 0) {
      testStatus = "completed";
    } else if (incompleteChapterSteps.length > 0) {
      testStatus = "locked";
    } else if (validTests.length > target) {
      testStatus = "overachieved";
    } else if (validTests.length === target) {
      testStatus = "completed";
    } else {
      testStatus = "ready";
    }

    const chapterTestStep: StudyPathStep = {
      id: `chapter-test::${chapter.id}`,
      kind: "chapter-test",
      status: testStatus,
      stage: "test",
      title: `Take ${chapter.name} Test`,
      reason: testStatus === "completed" || testStatus === "overachieved"
        ? (target === 0 ? "Excluded from requirements" : "Met test requirements")
        : (testStatus === "locked" ? "Prerequisites incomplete" : "Missing chapter test"),
      evidence: target === 0 ? "Not required" : `${validTests.length}/${target} chapter test${target === 1 ? "" : "s"}`,
      chapterId: chapter.id,
      chapterName: chapter.name,
      isHighYield: chapter.important,
      order: ++orderCounter,
      dependencyIds: testStatus === "locked" ? incompleteChapterSteps.map(s => s.id) : [],
      urgencyScore: testStatus === "ready" ? 60 + (chapter.important ? 5 : 0) : 0,
      completedAt:
        testStatus === "completed" || testStatus === "overachieved"
          ? getTestTargetCompletionDate(validTests, target)
          : null,
    };

    chapterSteps.push(chapterTestStep);
    allSteps.push(chapterTestStep);

    // 5. Chapter Remediation
    const latestValidTest = getLatestValidTest(chapter.testRecords);
    if (latestValidTest) {
      const score = latestValidTest.marksObtained / latestValidTest.totalMarks;
      if (score < 0.5) {
        const remediationStep: StudyPathStep = {
          id: `remediation::${chapter.id}::${latestValidTest.id}`,
          kind: "remediation",
          status: "ready",
          stage: "test",
          title: `Remediate ${chapter.name} Test`,
          reason: "Weak test outcome",
          evidence: `Scored ${Math.round(score * 100)}%`,
          chapterId: chapter.id,
          chapterName: chapter.name,
          isHighYield: chapter.important,
          order: ++orderCounter,
          dependencyIds: [],
          urgencyScore: 90 + (chapter.important ? 5 : 0),
        };
        chapterSteps.push(remediationStep);
        allSteps.push(remediationStep);
      }
    }

    chapters.push({
      id: chapter.id,
      name: chapter.name,
      position: chapter.position,
      isHighYield: chapter.important,
      steps: chapterSteps,
    });
  }

  // 6. Subject Test
  const incompleteSubjectDependencies = allSteps.filter(
    (s) => (s.kind === "learn" || s.kind === "revise" || s.kind === "practice" || s.kind === "chapter-test") &&
           s.status !== "completed" && s.status !== "overachieved"
  );

  const subjTarget = policy.subjectTestTarget;
  const validSubjTests = input.subjectTestRecords.filter(
    (r) =>
      Number.isFinite(r.marksObtained) &&
      Number.isFinite(r.totalMarks) &&
      r.totalMarks > 0 &&
      r.marksObtained >= 0 &&
      r.marksObtained <= r.totalMarks &&
      getValidDate(r.createdAt) !== null
  );

  let subjTestStatus: StudyPathStepStatus;
  if (subjTarget === 0) {
    subjTestStatus = "completed";
  } else if (incompleteSubjectDependencies.length > 0) {
    subjTestStatus = "locked";
  } else if (validSubjTests.length > subjTarget) {
    subjTestStatus = "overachieved";
  } else if (validSubjTests.length === subjTarget) {
    subjTestStatus = "completed";
  } else {
    subjTestStatus = "ready";
  }

  const subjectTestStep: StudyPathStep = {
    id: `subject-test`,
    kind: "subject-test",
    status: subjTestStatus,
    stage: "test",
    title: `Take Subject Test`,
    reason: subjTestStatus === "completed" || subjTestStatus === "overachieved"
      ? (subjTarget === 0 ? "Excluded from requirements" : "Met test requirements")
      : (subjTestStatus === "locked" ? "Prerequisites incomplete" : "Missing subject test"),
    evidence: subjTarget === 0 ? "Not required" : `${validSubjTests.length}/${subjTarget} subject test${subjTarget === 1 ? "" : "s"}`,
    isHighYield: false,
    order: ++orderCounter,
    dependencyIds: subjTestStatus === "locked" ? incompleteSubjectDependencies.map(s => s.id) : [],
    urgencyScore: subjTestStatus === "ready" ? 50 : 0,
    completedAt:
      subjTestStatus === "completed" || subjTestStatus === "overachieved"
        ? getTestTargetCompletionDate(validSubjTests, subjTarget)
        : null,
  };

  subjectSteps.push(subjectTestStep);
  allSteps.push(subjectTestStep);

  // 7. Subject Remediation
  const latestValidSubjTest = getLatestValidTest(input.subjectTestRecords);
  if (latestValidSubjTest) {
    const score = latestValidSubjTest.marksObtained / latestValidSubjTest.totalMarks;
    if (score < 0.5) {
      const subjRemediationStep: StudyPathStep = {
        id: `subject-remediation::${latestValidSubjTest.id}`,
        kind: "remediation",
        status: "ready",
        stage: "test",
        title: `Remediate Subject Test`,
        reason: "Weak test outcome",
        evidence: `Scored ${Math.round(score * 100)}%`,
        isHighYield: false,
        order: ++orderCounter,
        dependencyIds: [],
        urgencyScore: 90,
      };
      subjectSteps.push(subjRemediationStep);
      allSteps.push(subjRemediationStep);
    }
  }

  const actionableSteps = allSteps.filter((s) => s.status === "ready" || s.status === "due");

  const nextSteps = [...actionableSteps]
    .sort((a, b) => {
      if (a.urgencyScore !== b.urgencyScore) {
        return b.urgencyScore - a.urgencyScore; // Descending urgency
      }
      if (a.order !== b.order) {
        return a.order - b.order; // Ascending canonical curriculum order
      }
      return a.id.localeCompare(b.id); // Stable ID
    })
    .slice(0, 3);

  const isCompleted = allSteps.every(
    (s) => s.status === "completed" || s.status === "overachieved"
  );

  return {
    chapters,
    subjectSteps,
    allSteps,
    actionableSteps,
    nextSteps,
    isCompleted,
  };
}
