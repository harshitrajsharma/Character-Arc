import katex from "katex"
const texCache = new Map<string, string>()
const MAX_CACHE_SIZE = 1000

export function renderTex(tex: string, displayMode: boolean): string {
  const source = tex.trim()
  if (!source) {
    return `<span class="math-empty">${displayMode ? "$$" : "$"}$</span>`
  }
  const key = `${displayMode ? "D" : "I"}:${source}`
  const cached = texCache.get(key)
  if (cached !== undefined) return cached

  const result = katex.renderToString(source, {
    throwOnError: false,
    displayMode,
    output: "html",
  })
  if (texCache.size >= MAX_CACHE_SIZE) {
    const firstKey = texCache.keys().next().value
    if (firstKey) texCache.delete(firstKey)
  }
  texCache.set(key, result)
  return result
}
