import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { BaseTopic } from "@/types/progressapp/domain"
import { createTopicAction } from "@/lib/tools/exam-prep/actions/syllabus-actions"

type AddTopicInputProps = {
  examId: string
  chapterId: string
  onAddTopic: (topic: Pick<BaseTopic, "id" | "name">) => void
  onClose: () => void
}

export function AddTopicInput({
  examId,
  chapterId,
  onAddTopic,
  onClose,
}: AddTopicInputProps) {
  const [topicName, setTopicName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [recentTopics, setRecentTopics] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Keep focus after state updates
  useEffect(() => {
    if (!isSubmitting && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isSubmitting, topicName])

  const handleSubmit = async () => {
    const trimmedName = topicName.trim()
    if (!trimmedName) return

    // Don't allow duplicates in recent topics
    if (recentTopics.includes(trimmedName)) {
      toast.warning("This topic has already been added.")
      return
    }

    try {
      setIsSubmitting(true)
      setTopicName("")
      setRecentTopics((prev) => [...prev, trimmedName])

      const formData = new FormData()
      formData.set("examId", examId)
      formData.set("chapterId", chapterId)
      formData.set("title", trimmedName)
      const result = await createTopicAction({ status: "idle" }, formData)

      if (result.status === "error") throw new Error(result.message)

      // optimistically supply a local id until page revalidates
      onAddTopic({ id: createIdempotencyKey(), name: trimmedName })
      toast.success(`"${trimmedName}" added successfully`)
    } catch (error) {
      console.error(error)
      setRecentTopics((prev) => prev.filter((t) => t !== trimmedName))
      setTopicName(trimmedName)
      toast.error("Failed to add topic. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!isSubmitting && topicName.trim()) {
        handleSubmit()
      }
    } else if (e.key === "Escape") {
      if (topicName) {
        // First Escape clears the input
        setTopicName("")
      } else {
        // Second Escape closes the input
        onClose()
      }
    }
  }

  return (
    <div className="mb-4 w-full space-y-2">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          placeholder="Start typing topic name and press Enter to add quickly"
          className={cn(
            "flex-1 transition-colors",
            isSubmitting && "opacity-70"
          )}
          value={topicName}
          onChange={(e) => setTopicName(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoFocus
          disabled={isSubmitting}
        />
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || !topicName.trim()}
            className="min-w-[60px]"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Add"
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Done
          </Button>
        </div>
      </div>

      {recentTopics.length > 0 && (
        <div className="animate-in text-sm text-muted-foreground fade-in">
          Recently added: {recentTopics.slice(-3).join(", ")}
        </div>
      )}
    </div>
  )
}
