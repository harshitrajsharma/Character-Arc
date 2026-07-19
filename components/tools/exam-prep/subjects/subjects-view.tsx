"use client"

import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

import { AlertCircle, CheckCircle2, Clock, Plus, BookIcon, LayoutGridIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { SegmentedSelector, type SegmentedSelectorOption } from "@/components/ui/segmented-selector"
import type { SubjectWithRelations } from "@/types/progressapp/domain"
import { SubjectCard, type SubjectCategory } from "./subject-card"
import { CreateSubjectDialog } from "./create-subject-dialog"



interface SubjectsViewProps {
  workspaceSlug: string
  examId: string
  subjects: SubjectWithRelations[]
}

type SubjectFilter = SubjectCategory | "all"

const subjectFilterOptions: readonly SegmentedSelectorOption<SubjectFilter>[] = [
  {
    label: "All",
    value: "all",
    icon: LayoutGridIcon,
    activeClassName: "aria-pressed:!bg-brand-violet-soft aria-pressed:!text-brand-violet-ink",
  },
  {
    label: "In Progress",
    value: "in-progress",
    icon: Clock,
    activeClassName: "aria-pressed:!bg-brand-cyan-soft aria-pressed:!text-brand-cyan-ink",
  },
  {
    label: "Not Started",
    value: "not-started",
    icon: AlertCircle,
    activeClassName: "aria-pressed:!bg-destructive/10 aria-pressed:!text-destructive",
  },
  {
    label: "Completed",
    value: "completed",
    icon: CheckCircle2,
    activeClassName: "aria-pressed:!bg-brand-neon-soft aria-pressed:!text-brand-neon-ink",
  },
]

export function SubjectsView({ workspaceSlug, examId, subjects }: SubjectsViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<SubjectFilter>("all")

  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjects
    const query = searchQuery.toLowerCase()
    return subjects.filter((s) => s.name.toLowerCase().includes(query))
  }, [subjects, searchQuery])

  const categorized = useMemo(() => {
    return filteredSubjects.reduce(
      (acc, subject) => {
        // Mock progress calculation for now - map from your actual progress calculation
        const overallProgress = subject.overallProgress ?? 0
        if (overallProgress === 0) acc.notStarted.push(subject)
        else if (overallProgress >= 100) acc.completed.push(subject)
        else acc.inProgress.push(subject)
        return acc
      },
      {
        notStarted: [] as SubjectWithRelations[],
        inProgress: [] as SubjectWithRelations[],
        completed: [] as SubjectWithRelations[],
      }
    )
  }, [filteredSubjects])

  const renderSection = (
    category: SubjectCategory,
    sectionSubjects: SubjectWithRelations[],
    icon: React.ReactNode,
    title: string,
    titleColor: string
  ) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        {icon}
        <h3 className={`text-lg font-semibold ${titleColor}`}>{title}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectionSubjects.map((subject) => (
          <motion.div
            key={subject.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <SubjectCard workspaceSlug={workspaceSlug} subject={subject} category={category} examId={examId} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  )

  return (
    <div className="flex min-h-screen flex-1 flex-col space-y-6 md:p-4">
      {/* Navigation and Controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SegmentedSelector
          value={activeTab}
          options={subjectFilterOptions}
          onValueChange={setActiveTab}
          ariaLabel="Filter subjects by progress"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64"
            />
            <CreateSubjectDialog workspaceSlug={workspaceSlug} examId={examId}>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 size-4" />
                Add Subject
              </Button>
            </CreateSubjectDialog>
        </div>
      </div>

      {/* Subjects Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6 pb-4 sm:pb-0"
        >
          {activeTab === "all" ? (
            <>
              {categorized.inProgress.length > 0 &&
                renderSection(
                  "in-progress",
                  categorized.inProgress,
                  <Clock className="size-5 text-blue-500" />,
                  "In Progress",
                  "text-blue-500"
                )}
              {categorized.notStarted.length > 0 &&
                renderSection(
                  "not-started",
                  categorized.notStarted,
                  <AlertCircle className="size-5 text-red-500" />,
                  "Not Started",
                  "text-red-500"
                )}
              {categorized.completed.length > 0 &&
                renderSection(
                  "completed",
                  categorized.completed,
                  <CheckCircle2 className="size-5 text-green-500" />,
                  "Completed",
                  "text-green-500"
                )}
              {filteredSubjects.length === 0 && (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon" className="bg-brand-violet-soft text-brand-violet-ink">
                      <BookIcon aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>{subjects.length === 0 ? "Start your first subject" : "No matching subjects"}</EmptyTitle>
                    <EmptyDescription>
                      {subjects.length === 0
                        ? "Break down your exam into subjects to track progress effectively."
                        : "Try a different search or clear the current query."}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    {subjects.length === 0 ? (
                      <CreateSubjectDialog workspaceSlug={workspaceSlug} examId={examId}>
                        <Button>
                          <Plus className="mr-2 size-4" aria-hidden="true" />
                          Create a subject
                        </Button>
                      </CreateSubjectDialog>
                    ) : (
                      <Button variant="outline" onClick={() => setSearchQuery("")}>
                        Clear search
                      </Button>
                    )}
                  </EmptyContent>
                </Empty>
              )}
            </>
          ) : (
            (() => {
              const subjectsToShow =
                activeTab === "in-progress"
                  ? categorized.inProgress
                  : activeTab === "not-started"
                  ? categorized.notStarted
                  : categorized.completed

              const icon =
                activeTab === "in-progress" ? (
                  <Clock className="size-5 text-blue-500" />
                ) : activeTab === "not-started" ? (
                  <AlertCircle className="size-5 text-red-500" />
                ) : (
                  <CheckCircle2 className="size-5 text-green-500" />
                )

              const title =
                activeTab === "in-progress"
                  ? "In Progress"
                  : activeTab === "not-started"
                  ? "Not Started"
                  : "Completed"

              const titleColor =
                activeTab === "in-progress"
                  ? "text-blue-500"
                  : activeTab === "not-started"
                  ? "text-red-500"
                  : "text-green-500"

              return subjectsToShow.length > 0 ? (
                renderSection(activeTab, subjectsToShow, icon, title, titleColor)
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">{icon}</EmptyMedia>
                    <EmptyTitle>No {title.toLowerCase()} subjects</EmptyTitle>
                    <EmptyDescription>You don&apos;t have any subjects in the {title} category yet.</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button variant="outline" onClick={() => setActiveTab("all")}>
                      View all subjects
                    </Button>
                  </EmptyContent>
                </Empty>
              )
            })()
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
