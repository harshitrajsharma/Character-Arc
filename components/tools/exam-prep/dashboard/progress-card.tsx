import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, PieChart } from "lucide-react"
import { Progress } from "@/types/progressapp/progress"
import { ProgressIndicator } from "./progress-indicator"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { surfaceVariants } from "@/lib/tools/exam-prep/design-system"

interface ProgressCardProps {
  progress: Progress
  isExpanded?: boolean
  onToggleExpand?: () => void
  showToggle?: boolean
  className?: string
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
}

export function ProgressCard({
  progress,
  isExpanded = false,
  onToggleExpand,
  showToggle = true,
  className,
}: ProgressCardProps) {
  return (
    <Card
      className={cn(
        surfaceVariants({ variant: "default", padding: "none" }),
        "relative overflow-hidden bg-card/50 py-4 backdrop-blur-sm",
        "transition-all duration-300 hover:border-primary/20 hover:shadow-md",
        className
      )}
    >
      {/* Main Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 space-y-3 px-4 md:space-y-4"
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="rounded-lg bg-primary/10 p-1 text-primary md:p-1.5">
              <PieChart className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </div>
            <h3 className="bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-sm font-semibold text-transparent md:text-base">
              Your Progress
            </h3>
          </div>
          {showToggle && onToggleExpand && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "relative h-7 w-7 overflow-hidden p-0",
                "hover:bg-primary/10 hover:text-primary",
                "transition-all duration-300"
              )}
              onClick={onToggleExpand}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={isExpanded ? "up" : "down"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </motion.div>
              </AnimatePresence>
            </Button>
          )}
        </motion.div>

        {/* Overall Progress */}
        <motion.div variants={itemVariants}>
          <ProgressIndicator
            label="Overall Completion"
            value={progress.overall}
            category="overall"
            size="md"
          />
        </motion.div>

        {/* Category Progress - 2x2 Grid */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 gap-2 pt-1 md:gap-3"
        >
          {[
            {
              label: "Learning",
              value: progress.learning,
              category: "learning",
            },
            {
              label: "Revision",
              value: progress.revision,
              category: "revision",
            },
            {
              label: "Practice",
              value: progress.practice,
              category: "practice",
            },
            { label: "Test", value: progress.test, category: "test" },
          ].map((item, index) => (
            <motion.div
              key={item.category}
              variants={itemVariants}
              custom={index}
              className="group relative"
            >
              <div className="rounded-lg border border-transparent bg-muted/30 p-2 transition-colors hover:border-primary/10 hover:bg-muted/50 md:p-2.5">
                <ProgressIndicator
                  label={item.label}
                  value={item.value}
                  category={item.category as keyof Progress}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </Card>
  )
}
