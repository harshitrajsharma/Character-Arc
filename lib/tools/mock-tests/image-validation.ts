export const MAX_QUESTION_IMAGE_BYTES = 5 * 1024 * 1024

export type QuestionImageMime = "image/png" | "image/jpeg" | "image/webp"

export class QuestionImageValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "QuestionImageValidationError"
  }
}

/** Validate actual upload bytes, never just the browser's MIME or filename.
 * Signature validation is not a full image decode; the eventual storage upload
 * must also decode/re-encode images before serving untrusted input.
 */
export function validateQuestionImage(
  bytes: Uint8Array,
  declaredMime: string
): {
  mimeType: QuestionImageMime
  extension: "png" | "jpg" | "webp"
  sizeBytes: number
} {
  if (bytes.byteLength === 0) {
    throw new QuestionImageValidationError("Choose a non-empty image.")
  }
  if (bytes.byteLength > MAX_QUESTION_IMAGE_BYTES) {
    throw new QuestionImageValidationError("Images must be 5 MB or smaller.")
  }

  let detected:
    | { mimeType: QuestionImageMime; extension: "png" | "jpg" | "webp" }
    | undefined
  const matches = (offset: number, signature: number[]) =>
    signature.every((value, index) => bytes[offset + index] === value)

  // PNG's first chunk is IHDR (13 bytes); reject signature-only/truncated files.
  if (
    bytes.byteLength >= 33 &&
    matches(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) &&
    matches(8, [0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
  ) {
    detected = { mimeType: "image/png", extension: "png" }
  } else if (
    bytes.byteLength >= 4 &&
    matches(0, [0xff, 0xd8, 0xff]) &&
    ![0, 0xff].includes(bytes[3])
  ) {
    detected = { mimeType: "image/jpeg", extension: "jpg" }
  } else if (
    bytes.byteLength >= 20 &&
    matches(0, [0x52, 0x49, 0x46, 0x46]) &&
    matches(8, [0x57, 0x45, 0x42, 0x50]) &&
    matches(12, [0x56, 0x50, 0x38]) &&
    [0x20, 0x4c, 0x58].includes(bytes[15])
  ) {
    detected = { mimeType: "image/webp", extension: "webp" }
  }

  if (!detected) {
    throw new QuestionImageValidationError(
      "Choose a PNG, JPEG, or WebP image. SVG and other file types are not supported."
    )
  }
  if (declaredMime.toLowerCase().trim() !== detected.mimeType) {
    throw new QuestionImageValidationError(
      "The file content does not match its image type. Export it as PNG, JPEG, or WebP and try again."
    )
  }
  return { ...detected, sizeBytes: bytes.byteLength }
}
