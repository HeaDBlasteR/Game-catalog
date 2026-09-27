const { _electron: electron } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PROJECT = path.resolve(__dirname, '..');
const OUT = process.env.TEST_ARTIFACTS ?? path.join(__dirname, '.artifacts');
const SHOTS = path.join(OUT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
let page;
let app;

async function step(name, fn) {
  try {
    await fn();
    results.push(['PASS', name]);
    console.log('PASS', name);
  } catch (e) {
    results.push(['FAIL', name, e.message.split('\n')[0]]);
    console.log('FAIL', name, '-', e.message.split('\n').slice(0, 3).join(' | '));
    try { await page.screenshot({ path: path.join(SHOTS, `THEME-FAIL-${results.length}.png`) }); } catch {}
  }
}
const expect = (c, m) => { if (!c) throw new Error(m); };
const theme = () => page.evaluate(() => document.documentElement.dataset.theme);
const bodyBackground = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

async function launch(userData) {
  const env = { ...process.env, NODE_ENV: 'production' };
  delete env.ELECTRON_RUN_AS_NODE;
  app = await electron.launch({
    executablePath: require('electron'),
    args: [PROJECT, `--user-data-dir=${userData}`],
    cwd: PROJECT,
    env
  });
  page = await app.firstWindow();
  await page.waitForSelector('#login-username', { timeout: 20000 });
}

(async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'gc-theme-'));
  await launch(userData);

  let lightBackground = '';

  await step('Светлая тема по умолчанию', async () => {
    expect((await theme()) === 'light', await theme());
    lightBackground = await bodyBackground();
  });

  await step('Переключение на темную тему на экране входа', async () => {
    await page.click('.theme-switcher');
    expect((await theme()) === 'dark', await theme());
    const dark = await bodyBackground();
    expect(dark !== lightBackground, 'background did not change: ' + dark);
    await page.screenshot({ path: path.join(SHOTS, 'theme-dark-login.png') });
  });

  await step('Тема сохраняется после перезапуска', async () => {
    await app.close();
    await launch(userData);
    expect((await theme()) === 'dark', 'theme not persisted: ' + (await theme()));
  });

  await step('Темная тема применяется внутри приложения', async () => {
    await page.fill('#login-username', 'admin');
    await page.fill('#login-password', 'admin');
    await page.click('button.auth-submit');
    await page.waitForSelector('.metric-card');
    expect((await theme()) === 'dark', await theme());
    const sidebar = await page.evaluate(() => getComputedStyle(document.querySelector('.dashboard-sidebar')).backgroundColor);
    const text = await page.evaluate(() => getComputedStyle(document.querySelector('.dashboard-topbar h1')).color);
    expect(sidebar === 'rgb(22, 28, 40)', 'sidebar ' + sidebar);
    expect(text === 'rgb(231, 236, 247)', 'text ' + text);
    await page.screenshot({ path: path.join(SHOTS, 'theme-dark-catalog.png') });
  });

  await step('Возврат к светлой теме из боковой панели', async () => {
    await page.click('.sidebar-preferences .theme-switcher');
    expect((await theme()) === 'light', await theme());
    expect((await bodyBackground()) === lightBackground, 'light background not restored');
  });

  await step('Тема и язык независимы', async () => {
    await page.click('.sidebar-language-switcher .language-option:has-text("EN")');
    await page.click('.sidebar-preferences .theme-switcher');
    expect((await theme()) === 'dark', await theme());
    expect((await page.locator('.dashboard-topbar h1').textContent()) === 'Catalog management', 'language lost');
    const stored = await page.evaluate(() => [localStorage.getItem('theme'), localStorage.getItem('language')].join(','));
    expect(stored === 'dark,en', stored);
  });

  const pass = results.filter(r => r[0] === 'PASS').length;
  console.log(`\nTotal: ${pass}/${results.length} passed`);
  results.filter(r => r[0] === 'FAIL').forEach(r => console.log('  FAIL:', r[1], '-', r[2]));
  if (pass !== results.length) process.exitCode = 1;
  await app.close();
  fs.rmSync(userData, { recursive: true, force: true });
})().catch(async e => {
  console.error('FATAL', e);
  try { await app.close(); } catch {}
  process.exit(1);
});
