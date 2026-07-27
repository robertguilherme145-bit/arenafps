import fs from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://localhost:5173";
const outputDir = new URL("../.artifacts/visual/", import.meta.url);
await fs.mkdir(outputDir, { recursive:true });
const browser = await chromium.launch({ headless:true, executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe" });
const scenarios = [
  { name:"home-desktop", path:"/", width:1440, height:900 },
  { name:"home-mobile", path:"/", width:390, height:844 },
  { name:"login-desktop", path:"/entrar", width:1440, height:900 },
  { name:"tournament-desktop", path:"/torneios/1", width:1440, height:900 },
  { name:"admin-progression", path:"/admin?module=progression", width:1440, height:900, auth:true },
  { name:"admin-access", path:"/admin?module=access", width:1440, height:900, auth:true },
  { name:"admin-access-game", path:"/admin?module=access&game=1", width:1440, height:900, auth:true }
].filter((scenario) => !process.env.SCENARIO || scenario.name === process.env.SCENARIO);
const report = [];
for (const scenario of scenarios) {
  const context = await browser.newContext({ viewport:{ width:scenario.width, height:scenario.height } });
  if (scenario.auth && process.env.TEST_TOKEN) await context.addInitScript((token) => localStorage.setItem("arena-camp-token", token), process.env.TEST_TOKEN);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const response = await page.goto(`${baseUrl}${scenario.path}`, { waitUntil:"networkidle", timeout:30000 });
  await page.screenshot({ path:new URL(`${scenario.name}.png`, outputDir).pathname.slice(1), fullPage:true });
  const layout = await page.evaluate(() => ({
    title:document.title,
    textLength:(document.body.innerText || "").trim().length,
    scrollWidth:document.documentElement.scrollWidth,
    clientWidth:document.documentElement.clientWidth,
    scrollHeight:document.documentElement.scrollHeight,
    overflowElements:[...document.querySelectorAll("body *")].filter((element) => {
      const rect=element.getBoundingClientRect();
      return rect.right > document.documentElement.clientWidth + 2 || rect.left < -2;
    }).slice(0,12).map((element) => ({ tag:element.tagName, className:String(element.className).slice(0,180), text:(element.textContent||"").trim().slice(0,80), left:Math.round(element.getBoundingClientRect().left), right:Math.round(element.getBoundingClientRect().right) }))
  }));
  report.push({ ...scenario, status:response?.status(), errors:[...new Set(errors)], horizontalOverflow:layout.scrollWidth > layout.clientWidth + 2, ...layout });
  await context.close();
}
await browser.close();
await fs.writeFile(new URL("report.json", outputDir), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
