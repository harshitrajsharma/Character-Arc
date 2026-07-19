"use server"

import type { CalendarActivity, SubjectProgressResponse } from "@/types/progressapp/analytics"

// Since this is ported from a previous project where analytics were fetched from API routes,
// we are mocking these endpoints with Server Actions so the dashboard renders without 404ing.
// We can wire these up to Prisma properly later when the analytics schema is finalized.

export async function getMonthActivities(monthStartStr: string, monthEndStr: string) {
  // Returns mock data mapped to MonthActivity array
  return []
}

export async function getDayActivities(dateStr: string): Promise<CalendarActivity> {
  // Mock CalendarActivity
  return {
    date: dateStr,
    totalCount: 0,
    learning: 0,
    revision: 0,
    practice: 0,
    test: 0,
    details: {
      learning: [],
      revision: [],
      practice: [],
      test: []
    }
  }
}

export async function getSubjectProgress(range: string, dateStr: string): Promise<SubjectProgressResponse> {
  // Return an empty array of SubjectProgressData
  return {
    subjects: [],
    totalStats: { learning: 0, revision: 0, practice: 0, test: 0, total: 0 },
    dateRange: { start: dateStr, end: dateStr, range: "day" }
  }
}
