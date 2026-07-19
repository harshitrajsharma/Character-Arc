import { DailyActivity, StudyStreak } from "@/types/progressapp/domain"
import { SubjectWithRelations } from "./types"
import { calculateSubjectProgress } from "./progress"

export interface DashboardStats {
  dailyProgress: {
    hoursStudied: number
    topicsCovered: number
    testsCompleted: number
    targetCompletion: number
  }
  weeklyProgress: {
    averageHoursPerDay: number
    totalTopicsCovered: number
    totalTestsTaken: number
    weeklyGoalCompletion: number
  }
  subjectInsights: {
    needsAttention: Array<{
      id: string
      name: string
      progress: number
      lastActivity?: Date
    }>
    bestPerforming: Array<{
      id: string
      name: string
      progress: number
      testScore: number
    }>
  }
  studyStreak: {
    currentStreak: number
    longestStreak: number
    dailyGoal: number
    dailyProgress: number
  }
}

export function calculateDashboardStats(
  subjects: SubjectWithRelations[],
  activities: DailyActivity[],
  streak: StudyStreak | null
): DashboardStats {
  // Calculate daily progress
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayActivity = activities.find(a => a.date.getTime() === today.getTime())

  const dailyProgress = {
    hoursStudied: todayActivity ? Math.round(todayActivity.studyTime / 60) : 0,
    topicsCovered: todayActivity?.topicsCount || 0,
    testsCompleted: todayActivity?.testsCount || 0,
    targetCompletion: streak?.dailyGoals ? 
      (todayActivity?.studyTime || 0) / ((streak.dailyGoals?.length || 6) * 60) * 100 : 0
  }

  // Calculate weekly progress
  const weekStart = new Date(today)
  weekStart.setDate(weekStart.getDate() - 7)
  const weeklyActivities = activities.filter(a => a.date >= weekStart)

  const weeklyProgress = {
    averageHoursPerDay: weeklyActivities.length > 0 ?
      Math.round(weeklyActivities.reduce((acc, a) => acc + a.studyTime, 0) / 60 / 7 * 10) / 10 : 0,
    totalTopicsCovered: weeklyActivities.reduce((acc, a) => acc + a.topicsCount, 0),
    totalTestsTaken: weeklyActivities.reduce((acc, a) => acc + a.testsCount, 0),
    weeklyGoalCompletion: streak?.dailyGoals ?
      Math.min(100, weeklyActivities.reduce((acc, a) => acc + a.studyTime, 0) / ((streak.dailyGoals?.length || 6) * 60 * 7) * 100) : 0
  }

  // Calculate subject insights
  const subjectProgress = subjects.map(subject => ({
    id: subject.id,
    name: subject.name,
    progress: calculateSubjectProgress(subject).overall,
    lastActivity: subject.updatedAt,
    testScore: subject.tests.length > 0 ?
      subject.tests.reduce((acc, test) => acc + test.score, 0) / subject.tests.length : 0
  }))

  const needsAttention = [...subjectProgress]
    .sort((a, b) => a.progress - b.progress)
    .slice(0, 2)

  const bestPerforming = [...subjectProgress]
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 2)

  return {
    dailyProgress,
    weeklyProgress,
    subjectInsights: {
      needsAttention,
      bestPerforming
    },
    studyStreak: streak ? {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      dailyGoal: streak.dailyGoals?.length || 6,
      dailyProgress: streak.dailyProgress
    } : {
      currentStreak: 0,
      longestStreak: 0,
      dailyGoal: 6,
      dailyProgress: 0
    }
  }
} 
