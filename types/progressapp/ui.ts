import { LucideIcon } from "lucide-react";

export interface CardProps {
  className?: string;
  variant?: 'default' | 'outline';
}

export interface StatCardProps extends CardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: LucideIcon;
  iconColor?: string;
  bgColor?: string;
  tooltipText?: string;
  valueColor?: string;
  transitionDuration?: number;
} 
