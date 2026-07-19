import { BookOpen, RefreshCw, PenTool, GraduationCap } from "lucide-react";
import { LucideIcon } from "lucide-react";
import type { ProgressMode } from "@/types/progressapp/domain";

export type ActivityType = ProgressMode;

export const ACTIVITIES: Record<ActivityType, { 
  icon: LucideIcon;
  label: string;
  color: string;
  bgColor: string;
  bgColorFaded: string;
  lightBg: string;
  darkBg: string;
  lightBorder: string;
  darkBorder: string;
  description: string;
}> = {
  learning: {
    icon: BookOpen,
    label: "Learning",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500",
    bgColorFaded: "bg-emerald-100 dark:bg-emerald-900/30",
    lightBg: "bg-emerald-50/50",
    darkBg: "dark:bg-emerald-950/50",
    lightBorder: "border-emerald-200",
    darkBorder: "dark:border-emerald-800",
    description: "First-time study of a topic"
  },
  revision: {
    icon: RefreshCw,
    label: "Revision",
    color: "text-blue-500",
    bgColor: "bg-blue-500",
    bgColorFaded: "bg-blue-100 dark:bg-blue-900/30",
    lightBg: "bg-blue-50/50",
    darkBg: "dark:bg-blue-950/50",
    lightBorder: "border-blue-200",
    darkBorder: "dark:border-blue-800",
    description: "Reinforcing previously learned material"
  },
  practice: {
    icon: PenTool,
    label: "Practice",
    color: "text-amber-500",
    bgColor: "bg-amber-500",
    bgColorFaded: "bg-amber-100 dark:bg-amber-900/30",
    lightBg: "bg-amber-50/50",
    darkBg: "dark:bg-amber-950/50",
    lightBorder: "border-amber-200",
    darkBorder: "dark:border-amber-800",
    description: "Applying knowledge to problems"
  },
  test: {
    icon: GraduationCap,
    label: "Test",
    color: "text-purple-500",
    bgColor: "bg-purple-500",
    bgColorFaded: "bg-purple-100 dark:bg-purple-900/30",
    lightBg: "bg-purple-50/50",
    darkBg: "dark:bg-purple-950/50",
    lightBorder: "border-purple-200",
    darkBorder: "dark:border-purple-800",
    description: "Testing knowledge and skills"
  }
}; 
