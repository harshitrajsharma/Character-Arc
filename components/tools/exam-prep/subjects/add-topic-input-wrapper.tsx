'use client';

import { AddTopicInput } from "./add-topic-input";
import type { BaseTopic } from "@/types/progressapp/domain";

type AddTopicInputWrapperProps = {
  examId: string;
  chapterId: string;
  onAddTopic: (topic: Pick<BaseTopic, 'id' | 'name'>) => void;
  onClose: () => void;
}

export function AddTopicInputWrapper(props: AddTopicInputWrapperProps) {
  return <AddTopicInput {...props} />;
}