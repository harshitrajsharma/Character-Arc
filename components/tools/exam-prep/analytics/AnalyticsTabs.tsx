"use client"

import { useEffect } from "react"
import dynamic from "next/dynamic"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  useAnalytics,
  TAB_KEYS,
} from "@/components/tools/exam-prep/contexts/analytics-context"

const REACHABLE_TABS = [TAB_KEYS.ACTIVITY, TAB_KEYS.PROGRESS]

const isReachableTab = (tab: string) => REACHABLE_TABS.includes(tab)

function AnalyticsTabLoading() {
  return (
    <div className="h-full min-h-[240px] animate-pulse rounded-md bg-muted/40" />
  )
}

const ActivityDetailsDaywise = dynamic(
  () =>
    import("./activity-details-daywise").then(
      (mod) => mod.ActivityDetailsDaywise
    ),
  { loading: AnalyticsTabLoading }
)

const StudyProgressAnalytics = dynamic(
  () =>
    import("./StudyProgressAnalytics").then(
      (mod) => mod.StudyProgressAnalytics
    ),
  { loading: AnalyticsTabLoading }
)

export function AnalyticsTabs() {
  const { activeTab, setActiveTab } = useAnalytics()
  const activeReachableTab = isReachableTab(activeTab)
    ? activeTab
    : TAB_KEYS.ACTIVITY

  useEffect(() => {
    if (!isReachableTab(activeTab)) {
      setActiveTab(TAB_KEYS.ACTIVITY)
    }
  }, [activeTab, setActiveTab])

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  return (
    <Tabs
      defaultValue={activeReachableTab}
      value={activeReachableTab}
      onValueChange={handleTabChange}
      className="flex h-full w-full flex-col"
    >
      <TabsList className="mb-6 grid grid-cols-2 gap-2">
        <TabsTrigger
          value={TAB_KEYS.ACTIVITY}
          className="data-[state=active]:bg-green-100 data-[state=active]:text-green-900 dark:data-[state=active]:bg-green-900 dark:data-[state=active]:text-green-100"
        >
          Day Progress
        </TabsTrigger>
        <TabsTrigger
          value={TAB_KEYS.PROGRESS}
          className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900 dark:data-[state=active]:bg-blue-900 dark:data-[state=active]:text-blue-100"
        >
          Subject Progress
        </TabsTrigger>
        {/* <TabsTrigger value={TAB_KEYS.LEARNING} className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900 dark:data-[state=active]:bg-purple-900 dark:data-[state=active]:text-purple-100">
          Learning Patterns
        </TabsTrigger>
        <TabsTrigger value={TAB_KEYS.PHASES} className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900 dark:data-[state=active]:bg-amber-900 dark:data-[state=active]:text-amber-100">
          Study Phases
        </TabsTrigger> */}
      </TabsList>

      <div className="flex h-full flex-1 flex-col">
        {activeReachableTab === TAB_KEYS.ACTIVITY && (
          <TabsContent
            value={TAB_KEYS.ACTIVITY}
            className="mt-0 h-full flex-1 focus-visible:ring-0 focus-visible:outline-none"
          >
            <div className="h-full">
              {/* Activity Details */}
              <ActivityDetailsDaywise />
            </div>
          </TabsContent>
        )}

        {activeReachableTab === TAB_KEYS.PROGRESS && (
          <TabsContent
            value={TAB_KEYS.PROGRESS}
            className="mt-0 h-full flex-1 focus-visible:ring-0 focus-visible:outline-none"
          >
            <StudyProgressAnalytics />
          </TabsContent>
        )}
      </div>
    </Tabs>
  )
}
