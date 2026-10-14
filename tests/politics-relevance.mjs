import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicPrefix = 'https://pooriya-jamie.github.io/annotation-platform-demo/';
const target = process.env.DEMO_BASE_URL || new URL('../index.html#politics-relevance', import.meta.url).href;
assert.ok(target.startsWith('file:') || target.startsWith(publicPrefix), 'Only the static demo may be exercised');
const published = target.startsWith(publicPrefix);
const shots = path.join(root, 'shots', 'politics-relevance', published ? 'published' : 'local');
await mkdir(shots, { recursive: true });
const html = (await readFile(path.join(root, 'index.html'), 'utf8')).replace(/\r\n/g, '\n');
for (const asset of ['app.js', 'politics-relevance.js', 'politics-relevance.css']) {
  const data = (await readFile(path.join(root, asset), 'utf8')).replace(/\r\n/g, '\n');
  const version = createHash('sha256').update(data).digest('hex').slice(0, 12);
  assert.ok(html.includes(`${asset}?v=${version}`), `Version ${asset} after editing it`);
}
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [], requests = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('request', request => { if (/^https?:/i.test(request.url())) requests.push({ method: request.method(), url: request.url() }); });
const panel = () => page.locator('#politics-preview-root');
const political = () => panel().getByRole('radio', { name: 'Political', exact: true });
const negative = () => panel().getByRole('radio', { name: 'Not political / insufficient visible evidence', exact: true });
const save = () => panel().getByRole('button', { name: 'Save & next', exact: true });
const progress = () => panel().locator('.pol-progress');
async function start() { await panel().getByRole('button', { name: 'Open annotation preview' }).click(); }
async function reset() {
  await page.locator('[data-action="reset-demo"]').click();
  await panel().getByRole('heading', { name: 'Before you begin' }).waitFor();
  await start();
}
async function tools() {
  const details = panel().locator('.pol-preview-tools');
  if (!(await details.evaluate(el => el.open))) await details.locator('summary').click();
}
async function capture(name) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.screenshot({ path: path.join(shots, name), fullPage: true });
}

try {
  await page.goto(target);
  await panel().getByRole('heading', { name: 'Before you begin' }).waitFor();
  assert.match(await panel().innerText(), /politics from any country/);
  assert.match(await panel().innerText(), /Reporting or explaining politics counts/);
  assert.match(await panel().innerText(), /leave the political answer blank/);
  assert.doesNotMatch(await panel().innerText(), /completion policy|decision pending|flag that separately/i);
  await capture('instructions.png');
  await start();
  assert.equal(await panel().getByRole('radio').count(), 2);
  assert.equal(await panel().getByRole('checkbox').count(), 0);
  assert.equal(await panel().getByRole('combobox').count(), 0);
  assert.equal(await panel().getByLabel('Illustrative completion policy').count(), 0);
  assert.equal(await panel().locator('input[name="political_relevance"]:checked').count(), 0);
  assert.equal(await page.locator('iframe,video,audio').count(), 0);
  await capture('desktop.png');
  await save().click();
  assert.match(await panel().locator('.pol-feedback').innerText(), /Choose one answer before saving/);
  await negative().check();
  assert.equal(await negative().inputValue(), 'not_political/insufficient_visible_evidence');
  await political().check();
  assert.equal(await political().inputValue(), 'political');
  assert.equal(await panel().getByRole('button', { name: 'Take a break', exact: true }).count(), 0);
  assert.equal(await political().isChecked(), true); assert.match(await progress().innerText(), /0 of 3/);
  await panel().getByRole('button', { name: 'Save & leave', exact: true }).click();
  await panel().getByRole('heading', { name: 'Your draft is kept in this tab' }).waitFor();
  await panel().getByRole('button', { name: 'Return to preview' }).click();
  assert.equal(await political().isChecked(), true); assert.match(await progress().innerText(), /0 of 3/);
  await tools(); await panel().getByRole('button', { name: 'Simulate next save failing' }).click();
  await save().click();
  assert.match(await panel().locator('.pol-feedback').innerText(), /Example save failure/);
  assert.equal(await political().isChecked(), true); assert.match(await progress().innerText(), /0 of 3/);
  await save().click(); assert.match(await progress().innerText(), /1 of 3/);
  await negative().check(); await save().click(); assert.match(await progress().innerText(), /2 of 3/);
  assert.equal(await political().isDisabled(), true);
  assert.equal(await negative().isDisabled(), true);
  assert.equal(await panel().locator('input[name="political_relevance"]:checked').count(), 0);
  await save().click(); assert.match(await panel().locator('.pol-feedback').innerText(), /Leave the political answer blank and use Skip for now/);
  await panel().getByRole('button', { name: 'Skip for now', exact: true }).click();
  await panel().getByRole('heading', { name: 'Preview unfinished' }).waitFor();
  assert.match(await panel().innerText(), /2 of 3/);
  assert.equal(await panel().getByRole('heading', { name: 'Preview complete', exact: true }).count(), 0);
  assert.match(await panel().innerText(), /Skips are not negative answers or completed assessments/);
  assert.equal(await panel().getByRole('combobox').count(), 0);
  await page.reload(); await panel().getByRole('heading', { name: 'Before you begin' }).waitFor();
  await start(); assert.match(await progress().innerText(), /0 of 3/);
  await political().check();
  await panel().getByRole('button', { name: 'Skip for now', exact: true }).click();
  await page.getByRole('heading', { name: 'Leave this answer unfinished?' }).waitFor();
  await page.locator('#dlg [data-dlg="confirm"]').click();
  assert.match(await progress().innerText(), /0 of 3/);
  await panel().getByRole('button', { name: '1. TikTok', exact: true }).click();
  assert.equal(await political().isChecked(), true); assert.equal(await negative().isChecked(), false);
  await panel().getByRole('button', { name: 'Play preview', exact: true }).click();
  await panel().getByText('Supplemental evidence: 3 screenshots', { exact: true }).click();
  await panel().getByRole('button', { name: 'Enlarge screenshot 1', exact: true }).click();
  await page.getByRole('heading', { name: 'Screenshot 1 of 3', exact: true }).waitFor();
  await page.keyboard.press('ArrowRight'); await page.getByRole('heading', { name: 'Screenshot 2 of 3', exact: true }).waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await panel().getByRole('button', { name: 'Enlarge screenshot 1', exact: true }).evaluate(el => el === document.activeElement), true);
  assert.equal(await panel().getByRole('button', { name: 'Play preview', exact: true }).count(), 1);
  await panel().getByRole('button', { name: 'Enlarge screenshot 1', exact: true }).click();
  await page.evaluate(() => { location.hash = '#manager'; });
  await page.getByRole('heading', { name: 'Running a study, from upload to export', exact: true }).waitFor();
  assert.equal(await page.locator('#pol-image-dialog').evaluate(el => el.open), false);
  await page.evaluate(() => { location.hash = '#politics-relevance'; });
  await panel().getByRole('heading', { name: 'Politics — Video Relevance', exact: true }).waitFor();
  assert.equal(await panel().getByRole('button', { name: 'Play preview', exact: true }).count(), 1);
  await reset(); await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(await panel().getByRole('radio').count(), 2);
  assert.equal(await panel().getByRole('checkbox').count(), 0);
  assert.equal(await panel().getByRole('combobox').count(), 0);
  await capture('mobile.png');
  assert.equal(await panel().locator('input[name="political_relevance"]:checked').count(), 0);
  await page.evaluate(() => { location.hash = '#mental-health-relevance'; });
  await page.locator('#mh-preview-root').getByRole('heading', { name: 'Before you begin' }).waitFor();
  await page.locator('#mh-preview-root').getByRole('button', { name: 'Open annotation preview' }).click();
  await page.locator('#mh-preview-root').getByRole('radio', { name: 'Related', exact: true }).check();
  await page.locator('#mh-preview-root').getByRole('button', { name: 'Save & next', exact: true }).click();
  assert.match(await page.locator('.mh-progress').innerText(), /1 of 3/);
  await page.evaluate(() => { location.hash = '#annotator'; });
  await page.getByRole('heading', { name: 'Labeling public posts, one item at a time', exact: true }).waitFor();
  assert.deepEqual(errors, []);
  assert.ok(requests.every(request => published && request.method === 'GET' && request.url.startsWith(publicPrefix)), 'Only published static demo assets may load');
  const result = { passed: true, published, answer_options: 2, additional_classification_controls: 0, page_errors: errors, static_gets: requests.length, backend_or_external_calls: 0, real_study_policy_changed: false, screenshots: ['instructions.png','desktop.png','mobile.png'] };
  await writeFile(path.join(shots, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
