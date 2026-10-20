"use server"

import { createHash, randomUUID } from "node:crypto"
import sharp from "sharp"
import { prisma } from "@/lib/prisma"
import { getWorkspaceIdentity } from "@/lib/workspaces/workspace-access"
import { getMockTestsWriteContext } from "@/lib/tools/definitions/mock-tests/action-context"
import {
  MAX_QUESTION_IMAGE_BYTES,
  validateQuestionImage,
  QuestionImageValidationError,
} from "../image-validation"
import { getPrivateQuestionImageStorage } from "../question-image-storage"
import { workspaceSlugSchema } from "./common"

export async function uploadQuestionImageAction(
  workspaceSlug: string,
  formData: FormData
): Promise<{ src: string; fileId: string } | { error: string }> {
  const slug = workspaceSlugSchema.parse(workspaceSlug)
  const context = await getMockTestsWriteContext(slug)
  const workspace = await getWorkspaceIdentity(slug)
  try {
    const file = formData.get("file")
    if (!(file instanceof File)) throw new Error("Choose an image to upload.")
    if (file.size > MAX_QUESTION_IMAGE_BYTES)
      throw new Error("Images must be 5 MB or smaller.")
    const input = new Uint8Array(await file.arrayBuffer())
    validateQuestionImage(input, file.type)
    const { bucket, storage } = await getPrivateQuestionImageStorage()

    // Decode untrusted input, bound decoded pixels, strip metadata and any trailing
    // payload by encoding fresh pixels. Animated sources use their first frame.
    let image: Buffer
    try {
      image = await sharp(input, {
        limitInputPixels: 20_000_000,
        failOn: "error",
        animated: false,
      })
        .rotate()
        .webp({ quality: 90 })
        .toBuffer()
    } catch {
      throw new Error(
        "This image could not be read. Choose a valid image below 20 megapixels."
      )
    }
    if (image.byteLength > MAX_QUESTION_IMAGE_BYTES) {
      throw new Error(
        "The processed image is too large. Resize it and try again."
      )
    }

    const fileId = randomUUID()
    const storagePath = `${context.workspaceId}/${fileId}.webp`
    await prisma.$transaction(async (tx) => {
      await tx.fileObject.create({
        data: {
          id: fileId,
          workspaceId: context.workspaceId,
          uploadedById: workspace.userId,
          bucket,
          storagePath,
          originalName: file.name.slice(0, 255),
          mimeType: "image/webp",
          sizeBytes: BigInt(image.byteLength),
          sha256: createHash("sha256").update(image).digest("hex"),
          status: "UPLOADING",
        },
      })
    })
    try {
      const { error } = await storage.upload(storagePath, image, {
        contentType: "image/webp",
        cacheControl: "0",
        upsert: false,
      })
      if (error) throw new Error("The image could not be uploaded. Try again.")
      await prisma.$transaction(async (tx) => {
        await tx.fileObject.update({
          where: { id: fileId },
          data: { status: "READY" },
        })
      })
    } catch (error) {
      // A failed final DB update must not leave a readable object behind.
      try {
        const cleanup = await storage.remove([storagePath])
        if (cleanup.error)
          console.error("Question image cleanup needs retry", { fileId })
      } catch {
        console.error("Question image cleanup needs retry", { fileId })
      }
      await prisma
        .$transaction(async (tx) => {
          await tx.fileObject.update({
            where: { id: fileId },
            data: { status: "FAILED" },
          })
        })
        .catch(() => undefined)
      throw error
    }
    return { src: `/api/question-images/${fileId}`, fileId }
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    const expected =
      error instanceof QuestionImageValidationError ||
      /^(Choose an image|Images must be|Image uploads are not configured|Image storage is unavailable|Question image storage must|This image could not be read|The processed image is too large|The image could not be uploaded)/.test(
        message
      )
    if (!expected) console.error("Question image upload failed")
    return {
      error: expected ? message : "The image could not be uploaded. Try again.",
    }
  }
}
