export * from "./assessment";
export * from "./curriculum";
export * from "./progress";

export interface User { id: string; name: string; email: string; }

export interface DailyActivity {
  id: string;
  date: Date;
  minutesStudied: number;
  studyTime: number;
  topicsCount: number;
  testsCount: number;
}

export interface StudyStreak {
  current: number;
  longest: number;
  currentStreak: number;
  longestStreak: number;
  dailyGoals: { date: Date; met: boolean }[];
  dailyProgress: number;
}

export interface Question { id: string; text: string; }
export interface Answer { id: string; questionId: string; isCorrect: boolean; }export type Test = import('./assessment').BaseTest;
export type Topic = import('./curriculum').BaseTopic;
