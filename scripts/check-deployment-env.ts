import { config } from "dotenv"
import { validateDeploymentEnvironment } from "../lib/config/deployment-environment"

config({ path: ".env.local", quiet: true })
config({ quiet: true })
const result = validateDeploymentEnvironment(process.env, {
  production: process.argv.includes("--production"),
})
for (const warning of result.warnings) console.warn(`Notice: ${warning}`)
for (const error of result.errors) console.error(`Configuration: ${error}`)
if (result.errors.length) process.exitCode = 1
else
  console.log(
    "Deployment environment shape is valid. No credentials were printed and no remote changes were made."
  )
