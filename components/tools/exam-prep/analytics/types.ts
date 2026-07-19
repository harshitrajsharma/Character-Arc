import { ReactNode } from 'react';

export interface ActivityDetail {
  subject: string;
  topic: string;
  completedAt: string;
}

export interface DailyActivityDetails {
  learning: ActivityDetail[];
  revision: ActivityDetail[];
  practice: ActivityDetail[];
  test: ActivityDetail[];
}

export interface CalendarActivity {
  date: string;
  learning: number;
  revision: number;
  practice: number;
  test: number;
  totalCount: number;
  goalProgress: number;
  details: DailyActivityDetails;
}

export interface ActivityConfig {
  icon: ReactNode;
  label: string;
  color: string;
  bgColor: string;
  bgColorFaded: string;
  description: string;
} 
