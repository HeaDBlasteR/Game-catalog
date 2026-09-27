const { _electron: electron } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PROJECT = path.resolve(__dirname, '..');
const OUT = process.env.TEST_ARTIFACTS ?? path.join(__dirname, '.artifacts');
const SHOTS = path.join(OUT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const EXE = 'C:\\Windows\\System32\\whoami.exe';
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
    try { await page.screenshot({ path: path.join(SHOTS, `FEAT-FAIL-${results.length}.png`) }); } catch {}
  }
}
const expect = (c, m) => { if (!c) throw new Error(m); };

async function toast(expected) {
  const t = page.locator('.toast p').first();
  await t.waitFor({ timeout: 5000 });
  const text = await t.textContent();
  await page.locator('.toast-close').first().click().catch(() => {});
  expect(text === expected, `toast "${text}" != "${expected}"`);
}

async function login(u, p) {
  await page.fill('#login-username', u);
  await page.fill('#login-password', p);
  await page.click('button.auth-submit');
}

(async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'gc-feat-'));
  const env = { ...process.env, NODE_ENV: 'production' };
  delete env.ELECTRON_RUN_AS_NODE;
  app = await electron.launch({
    executablePath: require('electron'),
    args: [PROJECT, `--user-data-dir=${userData}`],
    cwd: PROJECT,
    env
  });
  page = await app.firstWindow();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.waitForSelector('#login-username', { timeout: 20000 });
  await app.evaluate(({ dialog }, exe) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [exe] });
  }, EXE);

  await step('Вход администратора', async () => {
    await login('admin', 'admin');
    await page.waitForSelector('.metric-card');
  });

  await step('Выбор exe через диалог подставляет путь и иконку', async () => {
    await page.click('button:has-text("Добавить игру")');
    await page.click('.file-path-row button:has-text("Выбрать файл")');
    await page.waitForSelector('.game-form-icon-preview');
    await toast('Файл игры выбран, иконка взята из него.');
    expect(await page.inputValue('#filePath') === EXE, await page.inputValue('#filePath'));
    const src = await page.locator('.game-form-icon-preview').getAttribute('src');
    expect(src.startsWith('data:image/png;base64,') && src.length > 500, 'icon not extracted: ' + src.slice(0, 40));
    await page.screenshot({ path: path.join(SHOTS, 'feat-01-pick-exe.png') });
  });

  await step('Сохранение игры с извлечённой иконкой', async () => {
    await page.fill('#title', 'Whoami');
    await page.fill('#developer', 'Microsoft');
    await page.fill('#releaseDate', '2009-10-22');
    await page.fill('#description', 'Утилита показывает текущего пользователя.\nВторая строка описания.');
    await page.locator('.genre-checkbox-item input').nth(0).check();
    await page.click('.game-form-modal-content button[type=submit]');
    await toast('Игра добавлена.');
    await page.locator('.game-card img.game-icon').waitFor();
  });

  await step('Окно подробностей: описание, дата, жанры', async () => {
    await page.click('.game-card .game-details-button');
    const modal = page.locator('.game-details-content');
    await modal.waitFor();
    const text = await modal.innerText();
    expect(text.includes('Whoami'), 'title');
    expect(text.includes('Microsoft'), 'developer');
    expect(text.includes('22 октября 2009'), 'date: ' + text);
    expect(text.includes('Вторая строка описания.'), 'description');
    expect(text.includes('Игру еще никто не оценил.'), 'no ratings text');
    expect(await modal.locator('.genre-chip').count() === 1, 'genre chip');
    await page.screenshot({ path: path.join(SHOTS, 'feat-02-details.png') });
  });

  await step('Окно подробностей закрывается по Escape', async () => {
    await page.keyboard.press('Escape');
    expect(await page.locator('.game-details-content').count() === 0, 'still open');
  });

  await step('Открытие по клику на название', async () => {
    await page.click('.game-title-button');
    await page.locator('.game-details-content').waitFor();
    await page.click('.game-details-content button:has-text("Закрыть")');
    expect(await page.locator('.game-details-content').count() === 0, 'still open');
  });

  await step('Дата релиза на английском', async () => {
    await page.click('.sidebar-language-switcher .language-option:has-text("EN")');
    await page.click('.game-card .game-details-button');
    const text = await page.locator('.game-details-content').innerText();
    expect(text.includes('October 22, 2009'), text);
    await page.keyboard.press('Escape');
    await page.click('.sidebar-language-switcher .language-option:has-text("RU")');
  });

  await step('Смена пароля: неверный текущий', async () => {
    await page.click('a.nav-link:has-text("Профиль")');
    await page.fill('#currentPassword', 'nope');
    await page.fill('#newPassword', 'newpass');
    await page.fill('#repeatPassword', 'newpass');
    await page.click('button:has-text("Сменить пароль")');
    await toast('Текущий пароль указан неверно.');
  });

  await step('Смена пароля: пароли не совпадают', async () => {
    await page.fill('#currentPassword', 'admin');
    await page.fill('#newPassword', 'newpass');
    await page.fill('#repeatPassword', 'other');
    await page.click('button:has-text("Сменить пароль")');
    await toast('Пароли не совпадают.');
  });

  await step('Смена пароля: слишком короткий', async () => {
    await page.fill('#currentPassword', 'admin');
    await page.fill('#newPassword', 'ab');
    await page.fill('#repeatPassword', 'ab');
    await page.click('button:has-text("Сменить пароль")');
    await toast('Пароль должен быть не короче 4 символов.');
  });

  await step('Смена пароля: успех и вход с новым паролем', async () => {
    await page.fill('#currentPassword', 'admin');
    await page.fill('#newPassword', 'newpass');
    await page.fill('#repeatPassword', 'newpass');
    await page.click('button:has-text("Сменить пароль")');
    await toast('Пароль изменен.');
    expect(await page.inputValue('#currentPassword') === '', 'form not cleared');
    await page.screenshot({ path: path.join(SHOTS, 'feat-03-password.png') });
    await page.click('.sidebar-logout-btn');
    await login('admin', 'admin');
    const err = await page.locator('.error-text').textContent({ timeout: 5000 });
    expect(err === 'Неверное имя пользователя или пароль.', err);
    await page.fill('#login-password', 'newpass');
    await page.click('button.auth-submit');
    await page.waitForSelector('.metric-card');
  });

  await step('Оценка пользователя видна в подробностях', async () => {
    await page.click('.sidebar-logout-btn');
    await page.click('a:has-text("Зарегистрироваться")');
    await page.fill('#register-username', 'player');
    await page.fill('#register-password', 'player');
    await page.click('button.auth-submit');
    await page.waitForSelector('.game-card');
    await page.click('.rate-button');
    await page.locator('.rating-star').nth(3).click();
    await page.click('button:has-text("Сохранить оценку")');
    await toast('Оценка сохранена.');
    await page.click('.game-card .game-details-button');
    const text = await page.locator('.game-details-content').innerText();
    expect(text.includes('Ваша оценка: 4'), text);
    expect(text.includes('Всего оценок: 1'), text);
    const width = await page.locator('.rating-bar-row:has(.rating-bar-label:text-is("4 ★")) .rating-bar-fill').evaluate(el => el.style.width);
    expect(width === '100%', 'bar width ' + width);
    await page.screenshot({ path: path.join(SHOTS, 'feat-04-details-rated.png') });
    await page.keyboard.press('Escape');
  });

  await step('Пользователь не может выбрать exe (API)', async () => {
    const r = await page.evaluate(() => window.electronAPI.pickExecutable().then(() => 'ok', e => e.message));
    expect(r.includes('APP_ERROR:forbidden'), r);
  });

  await step('Нет ошибок в консоли', async () => {
    expect(errors.length === 0, errors.join(' || '));
  });

  const pass = results.filter(r => r[0] === 'PASS').length;
  console.log(`\nИТОГО: ${pass}/${results.length} passed`);
  results.filter(r => r[0] === 'FAIL').forEach(r => console.log('  FAIL:', r[1], '-', r[2]));
  if (pass !== results.length) process.exitCode = 1;
  await app.close();
  fs.rmSync(userData, { recursive: true, force: true });
})().catch(async e => {
  console.error('FATAL', e);
  try { await app.close(); } catch {}
  process.exit(1);
});
