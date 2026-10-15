import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const chromePath = process.argv[2];
const outputPath = process.argv[3];
if (!chromePath || !outputPath) throw new Error("usage: capture-chrome-gpu.mjs <chrome.exe> <output.txt>");
if (!fs.existsSync(chromePath)) throw new Error("Chrome not found: " + chromePath);
const profilePath = fs.mkdtempSync(path.join(os.tmpdir(), "yor-world-chrome-gpu-"));
const activePortFile = path.join(profilePath, "DevToolsActivePort");
let browser;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
try {
  browser = spawn(chromePath, [
    "--headless=new",
    "--remote-debugging-port=0",
    "--user-data-dir=" + profilePath,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "chrome://gpu/",
  ], { windowsHide: true, stdio: "ignore" });
  const deadline = Date.now() + 30_000;
  while (!fs.existsSync(activePortFile)) {
    if (browser.exitCode !== null) throw new Error("Chrome exited before DevTools started (" + browser.exitCode + ")");
    if (Date.now() > deadline) throw new Error("Timed out waiting for Chrome DevTools");
    await delay(100);
  }
  const [portLine] = fs.readFileSync(activePortFile, "utf8").split(/\r?\n/);
  const port = Number(portLine);
  const version = await (await fetch("http://127.0.0.1:" + port + "/json/version")).json();
  let page;
  while (!page) {
    const targets = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
    page = targets.find((target) => target.type === "page" && target.url.startsWith("chrome://gpu"));
    if (!page && Date.now() > deadline) throw new Error("Timed out waiting for chrome://gpu target");
    if (!page) await delay(100);
  }
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const text = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out reading chrome://gpu")), 10_000);
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== 1) return;
      clearTimeout(timeout);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result?.result?.value ?? "");
    });
    socket.send(JSON.stringify({
      id: 1,
      method: "Runtime.evaluate",
      params: { expression: "document.body.innerText", returnByValue: true, awaitPromise: true },
    }));
  });
  socket.close();
  const body = String(text);
  const report = [
    "Browser: " + version.Browser,
    "Captured from: " + page.url,
    "Capture mode: isolated headless Chrome profile on this Windows PC",
    "Captured at: " + new Date().toISOString(),
    "Body SHA-256: " + createHash("sha256").update(body).digest("hex"),
    "",
    body,
  ].join("\n");
  fs.writeFileSync(outputPath, report, "utf8");
  process.stdout.write(report.split(/\r?\n/).filter((line) => /^(Browser:|Captured from:|Capture mode:|.*WebGL.*|.*Hardware accelerated.*|.*Software only.*|.*Unavailable.*)/i.test(line)).join("\n"));
} finally {
  if (browser && browser.exitCode === null) browser.kill();
  const tempRoot = path.resolve(os.tmpdir()) + path.sep;
  const resolvedProfile = path.resolve(profilePath);
  if (!resolvedProfile.startsWith(tempRoot)) throw new Error("Refusing to remove profile outside temp root: " + resolvedProfile);
  fs.rmSync(resolvedProfile, { recursive: true, force: true });
}

