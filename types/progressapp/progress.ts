import { progressModeTokens } from "@/lib/tools/exam-prep/design-system";

export type Category = 'overall' | 'learning' | 'revision' | 'practice' | 'test';

export interface Progress {
  overall: number;
  learning: number;
  revision: number;
  practice: number;
  test: number;
}

export interface CategoryConfig {
  label: string;
  color: string;
  bgColor: string;
  progressColor: string;
}

export const CATEGORIES: Record<Category, CategoryConfig> = {
  overall: { 
    label: 'Overall', 
    color: 'text-primary', 
    bgColor: 'bg-primary/10',
    progressColor: 'bg-primary'
  },
  learning: { 
    label: progressModeTokens.learning.label,
    color: progressModeTokens.learning.text,
    bgColor: progressModeTokens.learning.bgSoft,
    progressColor: progressModeTokens.learning.bg
  },
  revision: { 
    label: progressModeTokens.revision.label,
    color: progressModeTokens.revision.text,
    bgColor: progressModeTokens.revision.bgSoft,
    progressColor: progressModeTokens.revision.bg
  },
  practice: { 
    label: progressModeTokens.practice.label,
    color: progressModeTokens.practice.text,
    bgColor: progressModeTokens.practice.bgSoft,
    progressColor: progressModeTokens.practice.bg
  },
  test: { 
    label: progressModeTokens.test.label,
    color: progressModeTokens.test.text,
    bgColor: progressModeTokens.test.bgSoft,
    progressColor: progressModeTokens.test.bg
  }
}; 
