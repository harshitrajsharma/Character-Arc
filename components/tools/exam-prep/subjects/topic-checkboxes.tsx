import { memo, useCallback, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import type { BaseTopic } from "@/types/progressapp/domain";
import { getRequiredRevisions, getRequiredPractices, getRequiredTests } from "@/lib/tools/exam-prep/progress/rules";

type ChapterCategory = "learning" | "revision" | "practice" | "test"

const progressCheckboxStyle = "data-[state=checked]:border-brand-violet data-[state=checked]:bg-brand-violet data-[state=checked]:text-brand-violet-foreground"

interface TopicCheckboxesProps {
  topic: BaseTopic;
  category: ChapterCategory;
  onTopicToggle: (topicId: string, checkboxIndex?: number) => void;
  isPending?: (topicId: string) => boolean;
}

function TopicCheckboxesComponent({
  topic,
  category,
  onTopicToggle,
  isPending
}: TopicCheckboxesProps) {
  const topicStatuses = useMemo(() => {
    if (category === 'learning') {
      return [topic.learningStatus];
    }

    let maxCount = 1;
    if (category === 'revision') maxCount = getRequiredRevisions({ important: topic.important });
    if (category === 'practice') maxCount = getRequiredPractices({ important: topic.important });
    if (category === 'test') maxCount = getRequiredTests({ important: topic.important });

    return Array.from({ length: maxCount }).map((_, index) => {
      switch (category) {
        case 'revision':
          return topic.revisionCount >= (index + 1);
        case 'practice':
          return topic.practiceCount >= (index + 1);
        case 'test':
          return topic.testCount >= (index + 1);
        default:
          return false;
      }
    });
  }, [category, topic.learningStatus, topic.revisionCount, topic.practiceCount, topic.testCount, topic.important]);

  const handleToggle = useCallback((index?: number) => {
    onTopicToggle(topic.id, index);
  }, [topic.id, onTopicToggle]);

  const isDisabled = useMemo(() => {
    return isPending?.(topic.id) ?? false;
  }, [isPending, topic.id]);

  if (category === 'learning') {
    return (
      <Checkbox
        id={`${topic.id}-${category}`}
        checked={topicStatuses[0]}
        onCheckedChange={() => handleToggle()}
        disabled={isDisabled}
        className={progressCheckboxStyle}
        data-topic-id={topic.id}
      />
    );
  }

  return (
    <div className="flex items-center gap-1" data-topic-id={topic.id}>
      {topicStatuses.map((isChecked, index) => (
        <Checkbox
          key={`${topic.id}-${category}-${index}`}
          id={`${topic.id}-${category}-${index}`}
          checked={isChecked}
          onCheckedChange={() => handleToggle(index)}
          disabled={isDisabled}
          className={progressCheckboxStyle}
          data-topic-id={topic.id}
        />
      ))}
    </div>
  );
}

TopicCheckboxesComponent.displayName = 'TopicCheckboxes';
export const TopicCheckboxes = memo(TopicCheckboxesComponent);
export type { ChapterCategory }
