'use client';

import { useState } from "react";
import { Star, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { TopicUpdateData, TopicResponse } from "@/types/progressapp/domain";


interface TopicActionsProps {
  topicId: string;
  topicName: string;
  isImportant: boolean;
  onUpdate: (chapterId: string, topicId: string, data: TopicUpdateData) => Promise<TopicResponse>;
  onDelete: (topicId: string) => void;
  chapterId: string;
}

export function TopicActions({
  topicId,
  topicName,
  isImportant,
  onUpdate,
  onDelete,
  chapterId
}: TopicActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editedName, setEditedName] = useState(topicName);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpdate = async (data: TopicUpdateData) => {
    setIsUpdating(true);
    try {
      const response = await onUpdate(chapterId, topicId, data);
      return response;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editedName.trim() === "") return;
    
    const response = await handleUpdate({ name: editedName.trim() });
    if (response.success) {
      setShowEditDialog(false);
    }
  };

  const handleDeleteTopic = async () => {
    setIsDeleting(true);
    try {
      onDelete(topicId);
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-1 ml-auto">
      {/* Star button - always visible */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 transition-colors hover:text-yellow-400",
          isImportant ? "text-yellow-500 hover:text-yellow-600" : "opacity-0 group-hover:opacity-100"
        )}
        onClick={() => handleUpdate({ important: !isImportant })}
        disabled={isUpdating}
      >
        <Star className={cn("h-4 w-4 ", isImportant && "fill-current")} />
      </Button>

      {/* Other action buttons - only visible on hover */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setShowEditDialog(true)}
          disabled={isUpdating}
        >
          <Pencil className="h-4 w-4 hover:text-yellow-400" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isUpdating}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Topic</DialogTitle>
              <DialogDescription>
                Change the name of this topic. Click save when you&apos;re done.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                id="name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="mt-2"
                disabled={isUpdating}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={isUpdating || editedName.trim() === ""}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Topic</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{topicName}&quot;? This action cannot be undone.
              All progress for this topic will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTopic}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete Topic"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 