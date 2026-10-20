// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, it } from "bun:test"
import {
  MAX_QUESTION_IMAGE_BYTES,
  validateQuestionImage,
} from "@/lib/tools/mock-tests/image-validation"

function png(size = 33) {
  const bytes = new Uint8Array(size)
  bytes.set([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48,
    0x44, 0x52,
  ])
  return bytes
}

describe("question image upload validation", () => {
  it("recognizes PNG and JPEG signatures with canonical extensions", () => {
    expect(validateQuestionImage(png(), "image/png")).toEqual({
      mimeType: "image/png",
      extension: "png",
      sizeBytes: 33,
    })
    expect(
      validateQuestionImage(
        new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
        "image/jpeg"
      ).extension
    ).toBe("jpg")
  })

  it("recognizes lossy, lossless, and extended WebP signatures", () => {
    for (const variant of [0x20, 0x4c, 0x58]) {
      const bytes = new Uint8Array(20)
      bytes.set([0x52, 0x49, 0x46, 0x46])
      bytes.set([0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, variant], 8)
      expect(validateQuestionImage(bytes, "image/webp").extension).toBe("webp")
    }
  })

  it("rejects empty, oversized, truncated, and disguised files", () => {
    expect(() => validateQuestionImage(new Uint8Array(), "image/png")).toThrow(
      "non-empty"
    )
    expect(() =>
      validateQuestionImage(png(MAX_QUESTION_IMAGE_BYTES + 1), "image/png")
    ).toThrow("5 MB")
    expect(() =>
      validateQuestionImage(png().subarray(0, 8), "image/png")
    ).toThrow("Choose a PNG")
    expect(() => validateQuestionImage(png(), "image/jpeg")).toThrow(
      "does not match"
    )
    expect(() =>
      validateQuestionImage(
        new TextEncoder().encode('<svg onload="alert(1)"></svg>'),
        "image/png"
      )
    ).toThrow("SVG")
    expect(() => validateQuestionImage(png(), "image/svg+xml")).toThrow(
      "does not match"
    )
  })

  it("allows exactly the size limit", () => {
    expect(
      validateQuestionImage(png(MAX_QUESTION_IMAGE_BYTES), "image/png")
        .sizeBytes
    ).toBe(MAX_QUESTION_IMAGE_BYTES)
  })
})
