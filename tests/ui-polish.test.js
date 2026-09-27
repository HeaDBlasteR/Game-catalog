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
    try { await page.screenshot({ path: path.join(SHOTS, `POLISH-FAIL-${results.length}.png`) }); } catch {}
  }
}
const expect = (c, m) => { if (!c) throw new Error(m); };

async function closeToast() {
  await page.locator('.toast-close').first().click().catch(() => {});
  await page.waitForTimeout(150);
}

async function addGame(title, genre) {
  await page.click('button:has-text("Добавить игру")');
  await page.fill('#title', title);
  await page.fill('#developer', 'Dev');
  await page.fill('#releaseDate', '2024-01-01');
  await page.fill('#filePath', EXE);
  await page.locator(`.genre-checkbox-item:has-text("${genre}") input`).first().check();
  await page.click('.game-form-modal-content button[type=submit]');
  await page.waitForSelector(`.game-title-button:text-is("${title}")`);
  await closeToast();
}

(async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'gc-polish-'));
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

  await step('Пустой каталог приглашает добавить игру', async () => {
    await page.fill('#login-username', 'admin');
    await page.fill('#login-password', 'admin');
    await page.click('button.auth-submit');
    await page.waitForSelector('.metric-card');
    const empty = page.locator('.empty-state');
    await empty.waitFor();
    const text = await empty.textContent();
    expect(text.includes('Каталог пуст'), text);
    expect(text.includes('Добавьте первую игру'), text);
    await page.screenshot({ path: path.join(SHOTS, 'polish-01-empty-admin.png') });
  });

  await step('Кнопка из пустого состояния открывает форму', async () => {
    await page.click('.empty-state button:has-text("Добавить игру")');
    await page.waitForSelector('.game-form-modal-content');
    await page.keyboard.press('Escape');
    expect(await page.locator('.game-form-modal-content').count() === 0, 'form still open');
  });

  await step('Escape закрывает форму игры', async () => {
    await addGame('Escape Test', 'Action packed');
    await page.locator('.game-card button:has-text("Редактировать")').first().click();
    await page.waitForSelector('.game-form-modal-content');
    await page.keyboard.press('Escape');
    expect(await page.locator('.game-form-modal-content').count() === 0, 'form still open');
  });

  await step('Escape закрывает окно подробностей и оценки', async () => {
    await page.click('.game-card .game-details-button');
    await page.waitForSelector('.game-details-content');
    await page.keyboard.press('Escape');
    expect(await page.locator('.game-details-content').count() === 0, 'details still open');
  });

  await step('Escape закрывает окно подтверждения', async () => {
    await page.locator('.game-card button:has-text("Удалить")').first().click();
    await page.waitForSelector('.confirm-modal-content');
    await page.keyboard.press('Escape');
    expect(await page.locator('.confirm-modal-content').count() === 0, 'confirm still open');
  });

  await step('Escape закрывает окна жанров', async () => {
    await page.click('a.nav-link:has-text("Жанры")');
    await page.waitForSelector('.admin-table');
    await page.click('button:has-text("Создать жанр")');
    await page.waitForSelector('.genre-modal-content');
    await page.keyboard.press('Escape');
    expect(await page.locator('.genre-modal-content').count() === 0, 'create still open');

    await page.locator('tr:has(td:text-is("MOBA")) button:has-text("Редактировать")').click();
    await page.waitForSelector('.genre-modal-content');
    await page.keyboard.press('Escape');
    expect(await page.locator('.genre-modal-content').count() === 0, 'edit still open');
  });

  await step('Удаление жанра предупреждает о количестве игр', async () => {
    await page.locator('tr:has(td:text-is("Action packed")) button:has-text("Удалить")').click();
    const confirm = page.locator('.confirm-modal-content');
    await confirm.waitFor();
    const note = await confirm.locator('.confirm-modal-note').textContent();
    expect(note.includes('Игр с этим жанром: 1'), note);
    await page.screenshot({ path: path.join(SHOTS, 'polish-02-genre-warning.png') });
    await page.keyboard.press('Escape');
  });

  await step('Для пустого жанра предупреждения нет', async () => {
    await page.locator('tr:has(td:text-is("Puzzle")) button:has-text("Удалить")').click();
    const confirm = page.locator('.confirm-modal-content');
    await confirm.waitFor();
    expect(await confirm.locator('.confirm-modal-note').count() === 0, 'note shown for unused genre');
    await page.keyboard.press('Escape');
  });

  await step('Счетчик обновляется после добавления игры в жанр', async () => {
    await page.click('a.nav-link:has-text("Управление каталогом")');
    await addGame('Second Action', 'Action packed');
    await page.click('a.nav-link:has-text("Жанры")');
    await page.locator('tr:has(td:text-is("Action packed")) button:has-text("Удалить")').click();
    const note = await page.locator('.confirm-modal-note').textContent();
    expect(note.includes('Игр с этим жанром: 2'), note);
    await page.keyboard.press('Escape');
  });

  await step('Пользователь видит свое пустое состояние', async () => {
    await page.click('.sidebar-logout-btn');
    await page.click('a:has-text("Зарегистрироваться")');
    await page.fill('#register-username', 'viewer');
    await page.fill('#register-password', 'viewer');
    await page.click('button.auth-submit');
    await page.waitForSelector('.game-card');
    await page.check('#onlyFavorites');
    const text = await page.locator('.empty-state').textContent();
    expect(text.includes('В избранном пусто'), text);
    await page.uncheck('#onlyFavorites');
  });

  await step('Escape закрывает окно оценки', async () => {
    await page.locator('.game-card .rate-button').first().click();
    await page.waitForSelector('.rating-stars');
    await page.keyboard.press('Escape');
    expect(await page.locator('.rating-stars').count() === 0, 'rating modal still open');
  });

  await step('Фильтр без совпадений дает общее пустое состояние', async () => {
    await page.fill('#searchGame', 'zzzzz');
    const text = await page.locator('.empty-state').textContent();
    expect(text.includes('Ничего не найдено'), text);
    await page.fill('#searchGame', '');
  });

  await step('Пустые состояния переведены на английский', async () => {
    await page.click('.sidebar-language-switcher .language-option:has-text("EN")');
    await page.check('#onlyFavorites');
    const text = await page.locator('.empty-state').textContent();
    expect(text.includes('No favorites yet'), text);
    await page.uncheck('#onlyFavorites');
    await page.click('.sidebar-language-switcher .language-option:has-text("RU")');
  });

  await step('Нет ошибок в консоли', async () => {
    expect(errors.length === 0, errors.join(' || '));
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
