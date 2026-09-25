// @ts-nocheck
import { prisma } from "../lib/prisma"
import { createClient } from "@supabase/supabase-js"

async function main() {
  const newHash = await Bun.password.hash("TestPassword123!", "bcrypt")
  await prisma.$executeRawUnsafe(
    "UPDATE auth.users SET encrypted_password = $1 WHERE email IN ($2, $3)",
    newHash,
    "sharmaharshitraj02@gmail.com",
    "sharmaharshitraj@gmail.com"
  )
  console.log("Updated password for both users")


  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

  const { data, error } = await supabase.auth.signInWithPassword({
    email: "sharmaharshitraj02@gmail.com",
    password: "TestPassword123!"
  })

  if (error) {
    console.error("Sign in failed:", error)
  } else {
    console.log("Sign in successful! Session user:", data.user?.email)
    console.log("Access token present:", Boolean(data.session?.access_token))
  }
}

main().catch(console.error).finally(() => process.exit(0))
