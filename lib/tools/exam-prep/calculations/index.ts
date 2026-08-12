// Export all types
export * from "./types"

// Export progress calculations
export {
  calculateTopicProgress,
  isTopicCompleted,
  calculateChapterProgress,
  calculateSubjectProgress,
} from "./progress"

// Export statistics calculations
export {
  calculateTestStatistics,
  calculateFoundationLevel,
  calculateExpectedMarks,
  calculateCompletionStats,
} from "./statistics"

// Helper function to round percentages
export function roundPercentage(value: number): number {
  return Math.round(value * 10) / 10
}

// Helper function to ensure percentage is between 0 and 100
export function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, value))
}

// Helper to format percentage for display
export function formatPercentage(value: number): string {
  return `${roundPercentage(clampPercentage(value))}%`
}
