export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```(?:\w+)?\n?([\s\S]*?)```/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*(?:[-+*]|\d+[.)])\s+/gm, "")
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}
