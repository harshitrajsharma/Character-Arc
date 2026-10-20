import { z } from "zod"
import { getVerifiedClaims } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { canReadQuestionImage } from "@/lib/tools/mock-tests/question-image-access"
import {
  getPrivateQuestionImageStorage,
  getQuestionImageBucket,
} from "@/lib/tools/mock-tests/question-image-storage"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params
  if (!z.uuid().safeParse(fileId).success)
    return new Response(null, { status: 404 })
  const file = await prisma.fileObject.findFirst({
    where: {
      id: fileId,
      bucket: getQuestionImageBucket(),
      status: "READY",
      deletedAt: null,
      mimeType: "image/webp",
    },
    select: { id: true, workspaceId: true, storagePath: true },
  })
  if (!file) return new Response(null, { status: 404 })
  const claims = await getVerifiedClaims()
  if (!(await canReadQuestionImage(file, claims?.sub ?? null))) {
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    })
  }
  try {
    const { storage } = await getPrivateQuestionImageStorage()
    const { data, error } = await storage.download(file.storagePath)
    if (error || !data) return new Response(null, { status: 404 })
    return new Response(data, {
      headers: {
        "Content-Type": "image/webp",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
        Vary: "Cookie",
      },
    })
  } catch {
    return new Response("Image storage is temporarily unavailable.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    })
  }
}
