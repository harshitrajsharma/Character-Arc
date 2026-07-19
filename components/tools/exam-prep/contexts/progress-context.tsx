'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { 
  calculateChapterProgress, 
  calculateSubjectProgress, 
  calculateTopicProgress,
  isTopicCompletedForCategory,
  calculateProgressStats,
  calculateFoundationLevel
} from '@/lib/tools/exam-prep/calculations/progress';
import type { Topic } from '@/types/progressapp/domain';
import { 
  ChapterWithRelations,
  SubjectWithRelations,
  TopicProgress,
  ChapterProgress,
  SubjectProgress,
  ProgressStats
} from '@/types/progressapp/domain';

// Define the shape of our context
interface ProgressContextType {
  // Progress calculation functions
  calculateTopicProgress: (topic: Topic) => TopicProgress;
  calculateChapterProgress: (chapter: ChapterWithRelations) => ChapterProgress;
  calculateSubjectProgress: (subject: SubjectWithRelations) => SubjectProgress;
  isTopicCompletedForCategory: (topic: Topic, category: 'learning' | 'revision' | 'practice' | 'test') => boolean;
  calculateProgressStats: (topics: Topic[], category: 'learning' | 'revision' | 'practice' | 'test') => ProgressStats;
  calculateFoundationLevel: (progress: {
    learning: number;
    revision: number;
    practice: number;
    test: number;
  }) => string;
  
  // Helper functions for analytics view
  getActivityDays: (activity: {
    learning: number;
    revision: number;
    practice: number;
    test: number;
    total: number;
  }) => {
    learning: number;
    revision: number;
    practice: number;
    test: number;
    max: number;
    maxType: 'learning' | 'revision' | 'practice' | 'test';
  };
  
  formatProgressPercentage: (value: number) => string;
}

// Create the context with default values
const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

// Provider component
export function ProgressProvider({ children }: { children: ReactNode }) {
  const value = useMemo<ProgressContextType>(() => ({
    calculateTopicProgress,
    calculateChapterProgress,
    calculateSubjectProgress,
    isTopicCompletedForCategory,
    calculateProgressStats,
    calculateFoundationLevel,
    getActivityDays: (activity) => {
      const learningDays = Math.ceil(activity.learning / 3);
      const revisionDays = Math.ceil(activity.revision / 3);
      const practiceDays = Math.ceil(activity.practice / 3);
      const testDays = Math.ceil(activity.test / 3);

      const maxDays = Math.max(learningDays, revisionDays, practiceDays, testDays);
      let maxType: 'learning' | 'revision' | 'practice' | 'test' = 'learning';

      if (maxDays === learningDays) maxType = 'learning';
      else if (maxDays === revisionDays) maxType = 'revision';
      else if (maxDays === practiceDays) maxType = 'practice';
      else if (maxDays === testDays) maxType = 'test';

      return {
        learning: learningDays,
        revision: revisionDays,
        practice: practiceDays,
        test: testDays,
        max: maxDays,
        maxType
      };
    },
    formatProgressPercentage: (value) => Math.round(value) + '%'
  }), []);

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}

// Custom hook to use the progress context
export function useProgress() {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
} 
