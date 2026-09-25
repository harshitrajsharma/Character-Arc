import { prisma } from "../lib/prisma"

async function main() {
  const users = await prisma.$queryRawUnsafe<any[]>(
    "SELECT id, email, encrypted_password FROM auth.users"
  )
  console.log("Auth users count:", users.length)
  for (const u of users) {
    console.log({ id: u.id, email: u.email, hasPassword: Boolean(u.encrypted_password) })
  }

  const profiles = await prisma.profile.findMany({
    include: {
      memberships: {
        include: {
          workspace: true
        }
      }
    }
  })

  console.log("Profiles and Workspaces:", JSON.stringify(profiles, null, 2))
}

main().catch(console.error).finally(() => process.exit(0))


