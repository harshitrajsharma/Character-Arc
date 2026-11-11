/** Read-only rendered paint diagnosis; no DOM styling or domain data is changed. */
import { writeFile } from "node:fs/promises"
import assert from "node:assert/strict"
import { chromium } from "playwright"
import sharp from "sharp"
import { getBrowserTestConfig } from "./lib/browser-test-config"

const config = getBrowserTestConfig()
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  colorScheme: "dark",
  reducedMotion: "reduce",
})
const page = await context.newPage()
page.setDefaultNavigationTimeout(120_000)
page.setDefaultTimeout(40_000)
try {
  await page.goto(`${config.baseUrl}/login`, { waitUntil: "domcontentloaded" })
  await page.locator('input[name="email"]').fill(config.email)
  await page.locator('input[name="password"]').fill(config.password)
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await page.waitForURL(
    (url) => !url.pathname.includes("/login") || url.searchParams.has("error")
  )
  if (new URL(page.url()).pathname === "/login")
    throw new Error("Web sign-in did not verify.")
  await page
    .getByRole("heading", { name: "Workspace", exact: true })
    .waitFor({ timeout: 90_000 })
  const sidebar = page.locator('[data-slot="sidebar"][data-state]')
  const reports: object[] = []
  const capture = async (theme: string, state: string) => {
    const layers = await page.evaluate(`(() => {
      const style=(el,pseudo)=>{const s=getComputedStyle(el,pseudo);const r=el.getBoundingClientRect();return {
        tag:el.tagName,slot:el.getAttribute('data-slot'),class:el.className,
        rect:{x:r.x,y:r.y,width:r.width,height:r.height},
        backgroundColor:s.backgroundColor,backgroundImage:s.backgroundImage,backdropFilter:s.backdropFilter,
        filter:s.filter,opacity:s.opacity,boxShadow:s.boxShadow,position:s.position,zIndex:s.zIndex,
        isolation:s.isolation,transform:s.transform,color:s.color,content:pseudo?s.content:undefined
      }};
      const selectors=['html','body','header.fixed','[data-slot="sidebar-wrapper"]','[data-slot="sidebar"][data-state]',
        '[data-slot="sidebar-container"]','[data-slot="sidebar-inner"]','[data-slot="sidebar-header"]',
        '[data-slot="sidebar-content"]','[data-slot="sidebar-footer"]','[data-slot="sidebar-inset"]'];
      const layers=selectors.map(selector=>{const el=document.querySelector(selector);return {selector,normal:el?style(el):null,
        before:el?style(el,'::before'):null,after:el?style(el,'::after'):null}});
      const points=[[100,300],[200,700],[270,300],[700,300]].map(([x,y])=>({x,y,elements:document.elementsFromPoint(x,y).map(el=>style(el))}));
      const allPainted=Array.from(document.querySelectorAll('[data-slot="sidebar-inner"] *')).map(el=>style(el)).filter(s=>s.backgroundColor!=='rgba(0, 0, 0, 0)'||s.backgroundImage!=='none');
      const selected=document.querySelector('[data-slot="sidebar-inner"] [aria-current="page"]');
      const c=document.createElement('canvas');c.width=c.height=1;const ctx=c.getContext('2d');
      const pixel=(color,under)=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=under;ctx.fillRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return Array.from(ctx.getImageData(0,0,1,1).data).slice(0,3)};
      const luminance=rgb=>rgb.map(v=>{const n=v/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
      let selectedContrast=null;
      if(selected){const s=getComputedStyle(selected);const bg=pixel(s.backgroundColor,getComputedStyle(document.body).backgroundColor);const fg=pixel(s.color,'rgb('+bg.join(',')+')');const values=[luminance(bg),luminance(fg)].sort((a,b)=>b-a);selectedContrast={background:bg,foreground:fg,ratio:(values[0]+.05)/(values[1]+.05)}}
      return {layers,points,allPainted,selectedContrast};
    })()`)
    const checks = layers as {
      layers: Array<{
        selector: string
        normal: { backgroundColor: string; backdropFilter: string }
      }>
      selectedContrast: { ratio: number }
    }
    for (const selector of ["header.fixed", '[data-slot="sidebar-inner"]']) {
      const normal = checks.layers.find(
        (layer) => layer.selector === selector
      )?.normal
      if (!normal) throw new Error(`Missing glass layer: ${selector}`)
      assert.equal(normal?.backgroundColor, "rgba(0, 0, 0, 0)")
      assert.equal(normal.backdropFilter, "blur(24px)")
    }
    assert.ok(
      checks.selectedContrast.ratio >= 4.5,
      `Selected sidebar contrast ${theme}/${state}`
    )
    const buffer = await page.screenshot({
      path: `scratch/release-sidebar-glass-${theme}-${state}.png`,
      animations: "disabled",
    })
    const pixels = []
    for (const [x, y] of [
      [200, 700],
      [270, 700],
      [700, 700],
    ]) {
      pixels.push({
        x,
        y,
        rgba: [
          ...(await sharp(buffer)
            .extract({ left: x, top: y, width: 1, height: 1 })
            .ensureAlpha()
            .raw()
            .toBuffer()),
        ],
      })
    }
    reports.push({ theme, state, layers, pixels })
  }
  for (const theme of ["dark", "light"] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" })
    await page.waitForFunction(
      (dark) => document.documentElement.classList.contains("dark") === dark,
      theme === "dark"
    )
    if ((await sidebar.getAttribute("data-state")) === "expanded")
      await sidebar.locator('[data-slot="sidebar-trigger"]').click()
    await page.mouse.move(900, 100)
    await page.waitForFunction(
      "document.querySelector('[data-slot=sidebar][data-state]')?.getAttribute('data-collapsible') === 'icon'"
    )
    await capture(theme, "collapsed")
    await sidebar.locator('[data-slot="sidebar-content"]').hover()
    await page.waitForFunction(
      "document.querySelector('[data-slot=sidebar][data-state]')?.getAttribute('data-collapsible') === 'icon-hover'"
    )
    await capture(theme, "hover")
    await sidebar.locator('[data-slot="sidebar-trigger"]').click()
    await page.mouse.move(900, 100)
    await capture(theme, "expanded")
  }
  const mobileReports: object[] = []
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForFunction(
    "document.querySelector('[data-slot=sidebar][data-state]') === null"
  )
  for (const theme of ["dark", "light"] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" })
    await page.waitForFunction(
      (dark) => document.documentElement.classList.contains("dark") === dark,
      theme === "dark"
    )
    await page.keyboard.press("Control+b")
    const mobile = page.locator('[data-slot="sidebar"][data-mobile="true"]')
    await mobile.waitFor()
    const styles = await mobile.evaluate((el) => {
      const s = getComputedStyle(el)
      return {
        backgroundColor: s.backgroundColor,
        backdropFilter: s.backdropFilter,
        boxShadow: s.boxShadow,
      }
    })
    assert.equal(styles.backgroundColor, "rgba(0, 0, 0, 0)")
    assert.equal(styles.backdropFilter, "blur(24px)")
    assert.ok(
      styles.boxShadow === "none" ||
      styles.boxShadow.replaceAll("rgba(0, 0, 0, 0)", "").replace(/0px|[,\s]/g, "") === "",
      "Mobile sidebar must not paint a shadow"
    )
    mobileReports.push({ theme, styles })
    await page.screenshot({
      path: `scratch/release-sidebar-glass-${theme}-mobile.png`,
      animations: "disabled",
    })
    await page.keyboard.press("Escape")
    await mobile.waitFor({ state: "hidden" })
  }
  await writeFile(
    "scratch/release-sidebar-glass-layers.json",
    JSON.stringify(
      { passed: true, baseUrl: config.baseUrl, reports, mobileReports },
      null,
      2
    )
  )
  console.log(
    "PASS: Recorded actual sidebar/navbar paint layers and pixel samples in dark/light collapsed/hover/expanded states."
  )
} finally {
  await context.close()
  await browser.close()
}
