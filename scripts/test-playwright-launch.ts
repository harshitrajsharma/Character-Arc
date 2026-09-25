import { chromium } from "playwright"

async function main() {
  console.log("Launching Chromium...")
  const browser = await chromium.launch({ headless: true })
  console.log("Browser launched!")
  const page = await browser.newPage()
  await page.goto("http://localhost:3000/login")
  console.log("Page title:", await page.title())
  await browser.close()
  console.log("Done!")
}

main().catch(console.error).finally(() => process.exit(0))
