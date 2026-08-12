import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import Image from "next/image"
import { format } from "date-fns"

interface TVAWarningProps {
  selectedDate: Date
  onReset: () => void
}

export function TVAWarning({ selectedDate, onReset }: TVAWarningProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-8 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative h-24 w-24"
      >
        <Image src="/tva.webp" alt="TVA Logo" fill className="object-contain" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="max-w-md space-y-4"
      >
        <div className="space-y-4">
          <h4 className="animate-pulse text-xl font-bold text-orange-500">
            TIMELINE BREACH DETECTED
          </h4>
          <div className="space-y-2 rounded-lg border border-orange-200 bg-orange-100/10 p-4 dark:border-orange-800 dark:bg-orange-900/10">
            <p className="text-base font-medium">
              You are attempting to access a nexus event beyond your current
              timeline.
            </p>
            <p className="text-sm text-muted-foreground">
              For all time. Always. Return to your designated timeline to avoid
              pruning.
            </p>
            <div className="mt-2 font-mono text-xs text-orange-600 dark:text-orange-400">
              Variance detected: {format(selectedDate, "yyyy-MM-dd HH:mm:ss")}
            </div>
          </div>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="destructive"
            className="mt-4 w-full bg-orange-600 hover:bg-orange-700"
            onClick={onReset}
          >
            Reset Sacred Timeline
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
