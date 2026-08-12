// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"

import {
  formatDateInTimeZone,
  formatIsoLocalDate,
  parseIsoLocalDate,
} from "../../lib/dates/local-date"

describe("local date helpers", () => {
  test("parses an ISO date without converting through UTC", () => {
    const date = parseIsoLocalDate("2027-02-28")

    expect(date?.getFullYear()).toBe(2027)
    expect(date?.getMonth()).toBe(1)
    expect(date?.getDate()).toBe(28)
  })

  test("rejects malformed and impossible dates", () => {
    expect(parseIsoLocalDate("2027-02-29")).toBeUndefined()
    expect(parseIsoLocalDate("28-02-2027")).toBeUndefined()
    expect(parseIsoLocalDate("")).toBeUndefined()
  })

  test("formats a local date as an ISO calendar date", () => {
    expect(formatIsoLocalDate(new Date(2027, 6, 18))).toBe("2027-07-18")
  })

  test("round-trips a valid ISO calendar date", () => {
    const date = parseIsoLocalDate("2028-02-29")

    expect(date && formatIsoLocalDate(date)).toBe("2028-02-29")
  })

  test("round-trips the date picker's earliest default year", () => {
    const date = parseIsoLocalDate("1900-01-01")

    expect(date?.getFullYear()).toBe(1900)
    expect(date && formatIsoLocalDate(date)).toBe("1900-01-01")
  })

  test("formats one instant in the exam timezone", () => {
    const instant = new Date("2026-08-01T20:30:00.000Z")

    expect(formatDateInTimeZone(instant, "Asia/Kolkata")).toBe("2026-08-02")
    expect(formatDateInTimeZone(instant, "America/New_York")).toBe(
      "2026-08-01"
    )
  })

  test("falls back safely when a stored timezone is invalid", () => {
    expect(
      formatDateInTimeZone(
        new Date("2026-08-01T20:30:00.000Z"),
        "Not/A_Timezone",
        "UTC"
      )
    ).toBe("2026-08-01")
  })
})
