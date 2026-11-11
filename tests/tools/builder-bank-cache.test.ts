// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import { QueryClient } from "@tanstack/react-query"
import {
  builderBankKey,
  builderBankPrefix,
  builderBankUiKey,
  type BuilderBankFilters,
} from "@/lib/tools/mock-tests/builder-bank-cache"

const filters: BuilderBankFilters = {
  query: "",
  type: "ALL",
  difficulty: "ALL",
  page: 1,
}
describe("builder bank cache boundaries", () => {
  test("isolates data by viewer/workspace while normalizing equivalent search text", () => {
    expect(
      builderBankKey("workspace", "viewer", {
        ...filters,
        query: "  algebra  ",
      })
    ).toEqual(
      builderBankKey("workspace", "viewer", { ...filters, query: "algebra" })
    )
    expect(builderBankKey("workspace", "viewer", filters)).not.toEqual(
      builderBankKey("workspace", "another-viewer", filters)
    )
    expect(builderBankKey("workspace", "viewer", filters)).not.toEqual(
      builderBankKey("another-workspace", "viewer", filters)
    )
  })
  test("different filters/pages cannot overwrite the currently requested result", () => {
    const keys = [
      filters,
      { ...filters, type: "NUMERIC" as const },
      { ...filters, difficulty: "UNSET" as const },
      { ...filters, page: 2 },
      { ...filters, query: "algebra" },
    ].map((value) => JSON.stringify(builderBankKey("w", "v", value)))
    expect(new Set(keys).size).toBe(5)
  })
  test("restoration memory belongs to one assessment and identity", () => {
    expect(builderBankUiKey("w", "v", "a")).not.toEqual(
      builderBankUiKey("w", "v", "b")
    )
    expect(builderBankUiKey("w", "v", "a")).not.toEqual(
      builderBankUiKey("w", "other", "a")
    )
  })
  test("question creation/edit invalidation expires all filters in the affected workspace only", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: 60_000, gcTime: 0 } },
    })
    const first = builderBankKey("a", "viewer", filters),
      second = builderBankKey("a", "viewer", { ...filters, page: 2 }),
      other = builderBankKey("b", "viewer", filters)
    client.setQueryData(first, { bank: [] })
    client.setQueryData(second, { bank: [] })
    client.setQueryData(other, { bank: [] })
    await client.invalidateQueries({
      queryKey: builderBankPrefix("a"),
      refetchType: "none",
    })
    expect(client.getQueryState(first)?.isInvalidated).toBe(true)
    expect(client.getQueryState(second)?.isInvalidated).toBe(true)
    expect(client.getQueryState(other)?.isInvalidated).toBe(false)
    client.clear()
  })
})
