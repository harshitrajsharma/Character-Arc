"use client"

import {
  BookCheckIcon,
  BookOpenIcon,
  CircleCheckIcon,
  FlaskConicalIcon,
} from "lucide-react"

import {
  SegmentedSelector,
  type SegmentedSelectorOption,
} from "@/components/ui/segmented-selector"
import { stageActiveVariants } from "../shared-styles"

import type { SyllabusStage } from "./syllabus-model"

const stages: readonly SegmentedSelectorOption<SyllabusStage>[] = [
  {
    value: "learning",
    label: "Learn",
    icon: BookOpenIcon,
    activeClassName: stageActiveVariants.learning,
  },
  {
    value: "revision",
    label: "Revise",
    icon: BookCheckIcon,
    activeClassName: stageActiveVariants.revision,
  },
  {
    value: "practice",
    label: "Practice",
    icon: FlaskConicalIcon,
    activeClassName: stageActiveVariants.practice,
  },
  {
    value: "test",
    label: "Test",
    icon: CircleCheckIcon,
    activeClassName: stageActiveVariants.test,
  },
]

type SyllabusStageSelectorProps = {
  value: SyllabusStage
  onChange: (stage: SyllabusStage) => void
}

export function SyllabusStageSelector({
  value,
  onChange,
}: SyllabusStageSelectorProps) {
  return (
    <SegmentedSelector
      value={value}
      options={stages}
      onValueChange={onChange}
      ariaLabel="Progress stage"
      collapsedLabelsOnMobile
    />
  )
}
