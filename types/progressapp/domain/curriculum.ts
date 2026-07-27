import type { BaseTest, MockTest } from "./assessment";
import type { FoundationLevel } from "./progress";
import type { SubjectProgressPolicy } from "@/lib/tools/exam-prep/progress/policy";


export interface ScheduledTest {
  id: string;
  title: string;
  date?: string;
  scope?: "chapter" | "multi-chapter" | "subject";
  targetChapterIds?: string[];
}

export interface BaseTopic {
  id: string;
  name: string;
  important: boolean;
  learningStatus: boolean;
  revisionCount: number;
  practiceCount: number;
  testCount: number;
  position: number;
  learningCompletedAt?: Date | null;
  lastRevised: Date | null;
  lastPracticed?: Date | null;
  nextRevision: Date | null;
  chapterId: string;
  createdAt: Date;
  updatedAt: Date;
  targetRevisions?: number;
  targetPractices?: number;
}

export interface TopicWithRelations extends BaseTopic {
  chapter: ChapterWithRelations;
}

export interface BaseChapter {
  id: string;
  name: string;
  important: boolean;
  overallProgress: number;
  learningProgress: number;
  revisionProgress: number;
  practiceProgress: number;
  testProgress: number;
  position: number;
  subjectId: string;
  createdAt: Date;
  updatedAt: Date;
  topicCount?: number;
  scheduledTests?: ScheduledTest[];
}

export interface ChapterWithRelations extends BaseChapter {
  topics: BaseTopic[];
  testRecords?: import("./assessment").BaseTestRecord[];
  subject: Subject;
}

export interface Subject {
  id: string;
  name: string;
  weightage: number;
  expectedMarks: number | null;
  foundationLevel: FoundationLevel;
  overallProgress: number;
  learningProgress: number;
  revisionProgress: number;
  practiceProgress: number;
  testProgress: number;
  position: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  chapterCount?: number;
  topicCount?: number;
  scheduledTests?: ScheduledTest[];
  progressPolicy?: SubjectProgressPolicy;
}

export interface SubjectWithRelations extends Subject {
  chapters: ChapterWithRelations[];
  tests: BaseTest[];
  mockTests: MockTest[];
  testRecords?: import("./assessment").BaseTestRecord[];
}

export interface TopicResponse {
  success: boolean;
  topic: BaseTopic;
}

export interface TopicUpdateData {
  name?: string;
  important?: boolean;
  position?: number;
  learningStatus?: boolean;
  revisionCount?: number;
  practiceCount?: number;
  learningCompletedAt?: Date;
  lastRevised?: Date;
  lastPracticed?: Date;
  nextRevision?: Date;
}
