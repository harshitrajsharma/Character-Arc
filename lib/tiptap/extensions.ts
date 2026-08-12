import { Color } from "@tiptap/extension-color"
import { Highlight } from "@tiptap/extension-highlight"
import { Image } from "@tiptap/extension-image"
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table"
import { TaskItem } from "@tiptap/extension-task-item"
import { TaskList } from "@tiptap/extension-task-list"
import { TextStyle } from "@tiptap/extension-text-style"
import { CharacterCount, Placeholder, TrailingNode } from "@tiptap/extensions"
import { StarterKit } from "@tiptap/starter-kit"

import { BlockMath, InlineMath } from "@/lib/tiptap/math"

/**
 * Shared Tiptap extension set for every rich-text field in the mock-tests
 * tool. Schema-level extensions only (no node views): the math node views
 * are added by the editor component so this module stays safe to import
 * from server code.
 */
export function buildEditorExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      },
    }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    Image.configure({ allowBase64: false, inline: false }),
    Placeholder.configure({ placeholder }),
    CharacterCount,
    TrailingNode,
    InlineMath,
    BlockMath,
  ]
}
