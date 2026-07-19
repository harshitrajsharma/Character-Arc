import React, { useMemo, useState, useEffect } from 'react';
import { intervalToDuration } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { 
  Calendar, 
  Timer, 
  Target, 
  Trophy, 
  AlertTriangle 
} from "lucide-react";

type CountdownStage = 
  | 'unset' 
  | 'distant' 
  | 'preparing' 
  | 'critical' 
  | 'imminent';

interface ExamCountdownProps {
  examDate?: Date | null;
  onConfigureExam?: () => void;
}

export function ExamCountdownDisplay({ 
  examDate, 
  onConfigureExam 
}: ExamCountdownProps) {
  const [isClient, setIsClient] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  // Ensure component only mounts on client
  useEffect(() => {
    setIsClient(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const countdownContext = useMemo(() => {
    // No exam date configured
    if (!examDate || !isClient) {
      return {
        stage: 'unset' as CountdownStage,
        icon: Calendar,
        color: 'text-blue-500',
        primaryText: 'Set Exam Date',
        secondaryText: 'Start your preparation journey',
        urgency: 0
      };
    }

    const {  hours, minutes, seconds } = intervalToDuration({ 
      start: currentTime, 
      end: examDate 
    });

    const totalDaysRemaining = Math.max(0, Math.floor(
      (examDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24)
    ));

    // Stage Determination Logic
    const determineStage = (): CountdownStage => {
      // Check if it's exam day by comparing year, month, and day
      const isExamDay = examDate.getFullYear() === currentTime.getFullYear() &&
                       examDate.getMonth() === currentTime.getMonth() &&
                       examDate.getDate() === currentTime.getDate();

      if (isExamDay) return 'imminent';
      if (totalDaysRemaining <= 3) return 'critical';
      if (totalDaysRemaining <= 14) return 'preparing';
      return 'distant';
    };

    const stage = determineStage();

    // Formatter to ensure two-digit display
    const formatTime = (time?: number) => 
      time !== undefined ? time.toString().padStart(2, '0') : '00';

    // Contextual Rendering Strategy
    const stageConfigurations = {
      'unset': {
        icon: Calendar,
        color: 'text-blue-500',
        primaryText: 'Set Exam Date',
        secondaryText: 'Begin your preparation',
        urgency: 0
      },
      'distant': {
        icon: Target,
        color: 'text-green-500',
        primaryText: `${totalDaysRemaining} Days`,
        secondaryText: 'Consistent study plan 📚',
        urgency: 1
      },
      'preparing': {
        icon: Timer,
        color: 'text-orange-500',
        primaryText: `${totalDaysRemaining} Days`,
        secondaryText: 'Focused preparation time 🎯',
        urgency: 2
      },
      'critical': {
        icon: AlertTriangle,
        color: 'text-red-500',
        primaryText: `${formatTime(hours)}:${formatTime(minutes)}:${formatTime(seconds)}`,
        secondaryText: `${totalDaysRemaining} Days Remaining`,
        urgency: 3
      },
      'imminent': {
        icon: Trophy,
        color: 'text-yellow-500',
        primaryText: 'Exam Today',
        secondaryText: 'All the best for the exam 🍀',
        urgency: 4
      }
    };

    return {
      stage,
      ...stageConfigurations[stage]
    };
  }, [examDate, currentTime, isClient]);

  const handleInteraction = () => {
    if (countdownContext.stage === 'unset' && onConfigureExam) {
      onConfigureExam();
    }
  };

  // Prevent rendering on server
  if (!isClient) {
    return (
      <div className="w-full rounded-xl shadow-sm bg-white dark:bg-neutral-900">
        <div className="flex items-center space-x-4">
          <div className="p-1.5 md:p-2 rounded-full bg-accent/10">
            <Calendar className="w-6 h-6 md:w-8 md:h-8 stroke-[1.5] text-blue-500" />
          </div>
          <div className="flex-1 overflow-hidden">
            <h3 className="text-base md:text-lg font-bold tracking-tight text-blue-500">
              Set Exam Date
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground opacity-80">
              Start your preparation journey
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={cn(
        "w-full p-2.5 sm:p-3 rounded-xl shadow-sm",
        "flex items-center space-x-2",
        "cursor-pointer select-none",
        "transition-all duration-300 ease-in-out",
        "hover:shadow-md active:scale-[0.98]",
        "bg-white dark:bg-neutral-900",
        countdownContext.color
      )}
      onClick={handleInteraction}
    >

      <div className="flex-1 overflow-hidden">
        <div className="flex justify-between items-baseline">
          <h3 
            className={cn(
              "text-xl lg:text-2xl text-center w-full font-bold tracking-tight truncate", 
              countdownContext.color,
              countdownContext.stage === 'critical' ? "tabular-nums" : ""
            )}
          >
            {countdownContext.primaryText}
          </h3>
        </div>
        <p className="text-xs md:text-sm text-center text-muted-foreground opacity-80 truncate">
          {countdownContext.secondaryText}
        </p>
      </div>
    </motion.div>
  );
}
