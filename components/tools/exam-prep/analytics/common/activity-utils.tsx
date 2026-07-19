import type { ActivityConfig as ActivityConfigType } from '../types';
import { ACTIVITIES } from '../activity-config';
import {
  getPredominantActivityType,
  normalizeSubjectProgressResponse,
  type SubjectProgressRange,
} from '@/lib/tools/exam-prep/analytics/subject-progress';
import { getSubjectProgress } from '@/lib/tools/exam-prep/actions/analytics';

export { getPredominantActivityType };

// Activity Type icons and colors
export const ActivityConfig: Record<string, ActivityConfigType> = Object.fromEntries(
  Object.entries(ACTIVITIES).map(([type, config]) => {
    const Icon = config.icon;

    return [
      type,
      {
        icon: <Icon className="h-4 w-4" />,
        label: config.label,
        color: config.color,
        bgColor: config.bgColor,
        bgColorFaded: config.bgColorFaded,
        description: config.description,
      },
    ];
  })
) as Record<string, ActivityConfigType>;

// Fetch subject progress data with improved validation
export async function fetchSubjectProgress(range: SubjectProgressRange, date: string) {
  try {
    const data = await getSubjectProgress(range, date);
    return normalizeSubjectProgressResponse(data);
  } catch (error) {
    console.error("Error fetching subject progress:", error);
    throw error;
  }
}
