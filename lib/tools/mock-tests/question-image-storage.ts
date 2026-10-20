import "server-only"

import { createClient } from "@supabase/supabase-js"

export function getQuestionImageBucket() {
  return (
    process.env.SUPABASE_QUESTION_IMAGES_BUCKET ||
    "character-arc-question-images"
  )
}

export async function getPrivateQuestionImageStorage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      "Image uploads are not configured. Add the server-only SUPABASE_SECRET_KEY and create the private 'character-arc-question-images' bucket (or set SUPABASE_QUESTION_IMAGES_BUCKET)."
    )
  }
  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  const bucket = getQuestionImageBucket()
  const { data, error } = await client.storage.getBucket(bucket)
  if (error || !data) {
    throw new Error(
      `Image storage is unavailable. Create the private '${bucket}' bucket and check its server configuration.`
    )
  }
  if (data.public) {
    throw new Error(
      "Question image storage must use a private bucket. Disable public access before uploading images."
    )
  }
  return { bucket, storage: client.storage.from(bucket) }
}
