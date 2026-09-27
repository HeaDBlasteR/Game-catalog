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
    try { await page.screenshot({ path: path.join(SHOTS, `EN-FAIL-${results.length}.png`) }); } catch {}
  }
}
const expect = (c, m) => { if (!c) throw new Error(m); };
const cyrillicIn = async selector => {
  const text = await page.locator(selector).first().innerText();
  const found = text.match(/[А-Яа-яЁё][^\n]*/g);
  return found ? found.join(' | ') : null;
};

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
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'gc-en-'));
  await launch(userData);

  await step('По умолчанию русский', async () => {
    expect((await page.locator('.auth-card h2').textContent()) === 'Вход', 'not ru');
    await page.screenshot({ path: path.join(SHOTS, 'en-00-login-ru.png') });
  });

  await step('Переключение на EN на экране входа', async () => {
    await page.click('.language-option:has-text("EN")');
    expect((await page.locator('.auth-card h2').textContent()) === 'Log in', 'title');
    expect(await page.evaluate(() => document.documentElement.lang) === 'en', 'html lang');
    const cyr = await cyrillicIn('.auth-shell');
    expect(!cyr, cyr);
    await page.screenshot({ path: path.join(SHOTS, 'en-01-login.png') });
  });

  await step('Ошибка входа на английском', async () => {
    await page.fill('#login-username', 'admin');
    await page.fill('#login-password', 'bad');
    await page.click('button.auth-submit');
    const err = await page.locator('.error-text').textContent({ timeout: 5000 });
    expect(err === 'Invalid username or password.', err);
  });

  await step('Ошибка переводится при смене языка', async () => {
    await page.click('.language-option:has-text("RU")');
    const err = await page.locator('.error-text').textContent();
    expect(err === 'Неверное имя пользователя или пароль.', err);
    await page.click('.language-option:has-text("EN")');
  });

  await step('Админ-каталог полностью на английском', async () => {
    await page.fill('#login-password', 'admin');
    await page.click('button.auth-submit');
    await page.waitForSelector('.metric-card');
    expect((await page.locator('.dashboard-topbar h1').textContent()) === 'Catalog management', 'h1');
    const cyr = await cyrillicIn('.dashboard-shell');
    expect(!cyr, cyr);
  });

  await step('Форма игры на английском + ошибка жанра', async () => {
    await page.click('button:has-text("Add game")');
    const cyr = await cyrillicIn('.game-form-modal-content');
    expect(!cyr, cyr);
    await page.fill('#title', 'Whoami');
    await page.fill('#developer', 'MS');
    await page.fill('#releaseDate', '2024-01-01');
    await page.fill('#filePath', 'C:\\Windows\\System32\\whoami.exe');
    await page.click('.game-form-modal-content button[type=submit]');
    const toast = await page.locator('.toast p').textContent({ timeout: 5000 });
    expect(toast === 'Select at least one genre.', toast);
    await page.screenshot({ path: path.join(SHOTS, 'en-02-game-form.png') });
    await page.locator('.genre-checkbox-item input').nth(0).check();
    await page.click('.game-form-modal-content button[type=submit]');
    await page.waitForSelector('.toast p:text-is("Game added.")');
  });

  await step('Жанры: таблица и описания на английском', async () => {
    await page.click('a.nav-link:has-text("Genres")');
    await page.waitForSelector('td:text-is("Action packed")');
    const desc = await page.locator('tr:has(td:text-is("Action packed")) td').nth(1).textContent();
    expect(desc === 'Dynamic, fast-paced games full of combat.', desc);
    const cyr = await cyrillicIn('.dashboard-shell');
    expect(!cyr, cyr);
    await page.screenshot({ path: path.join(SHOTS, 'en-03-genres.png') });
  });

  await step('Дубль жанра — ошибка на английском', async () => {
    await page.click('button:has-text("Create genre")');
    await page.fill('#genreCreateName', 'MOBA');
    await page.click('.genre-modal-content button[type=submit]');
    await page.waitForSelector('.toast p:text-is("A genre with this name already exists.")');
    await page.click('.genre-modal-content button:has-text("Cancel")');
  });

  await step('Удаление — окно подтверждения на английском', async () => {
    await page.click('a.nav-link:has-text("Catalog management")');
    await page.locator('.game-card button:has-text("Delete")').first().click();
    const txt = await page.locator('.confirm-modal-content').innerText();
    expect(txt.includes('Delete game?') && txt.includes('The game "Whoami" will be removed'), txt);
    await page.click('.confirm-modal-content button:has-text("Cancel")');
  });

  await step('Заголовок системного диалога на английском', async () => {
    await app.evaluate(({ dialog }) => {
      global.__dialogTitle = null;
      dialog.showOpenDialog = async options => { global.__dialogTitle = options.title + '|' + options.filters[0].name; return { canceled: true, filePaths: [] }; };
    });
    await page.click('a.nav-link:has-text("Profile")');
    await page.click('button:has-text("Upload icon from PC")');
    await page.waitForTimeout(300);
    const title = await app.evaluate(() => global.__dialogTitle);
    expect(title === 'Choose a profile icon|Icons', title);
    const cyr = await cyrillicIn('.dashboard-shell');
    expect(!cyr, cyr);
    await page.screenshot({ path: path.join(SHOTS, 'en-04-profile.png') });
  });

  await step('Язык сохраняется после перезапуска', async () => {
    await app.close();
    await launch(userData);
    expect((await page.locator('.auth-card h2').textContent()) === 'Log in', 'language not persisted');
  });

  await step('Пользователь: каталог и окно оценки на английском', async () => {
    await page.click('a:has-text("Sign up")');
    await page.fill('#register-username', 'user1');
    await page.fill('#register-password', 'pass');
    await page.click('button.auth-submit');
    await page.waitForSelector('.game-card');
    let cyr = await cyrillicIn('.dashboard-shell');
    expect(!cyr, cyr);
    await page.locator('.launch-button').first().click();
    await page.waitForSelector('.rating-stars', { timeout: 10000 });
    cyr = await cyrillicIn('.rating-modal-content');
    expect(!cyr, cyr);
    await page.screenshot({ path: path.join(SHOTS, 'en-05-rating.png') });
    await page.click('button:has-text("Save rating")');
    await page.waitForSelector('.toast p:text-is("Rating saved.")');
  });

  await step('Переключатель в боковой панели возвращает русский', async () => {
    await page.click('.sidebar-language-switcher .language-option:has-text("RU")');
    expect((await page.locator('.dashboard-topbar h1').textContent()) === 'Каталог игр', 'not switched');
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
