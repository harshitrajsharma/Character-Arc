"use client"

import { AssessmentCard } from "./assessment-card"
import type { AssessmentListViewProps } from "./types"

export function AssessmentListView({
  workspaceSlug,
  mode,
  items,
  canWrite = false,
  cloningId,
  onClone,
  activeAttempts,
}: AssessmentListViewProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {items.map((item) => (
        <AssessmentCard
          key={item.id}
          workspaceSlug={workspaceSlug}
          mode={mode}
          item={item}
          canWrite={canWrite}
          isCloning={cloningId === item.id}
          onClone={onClone}
          activeAttemptId={activeAttempts?.[item.id]}
          layout="list"
        />
      ))}
    </div>
  )
}
