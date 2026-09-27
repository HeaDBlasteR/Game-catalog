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
    try { await page.screenshot({ path: path.join(SHOTS, `DATA-FAIL-${results.length}.png`) }); } catch {}
    await page.keyboard.press('Escape').catch(() => {});
  }
}
const expect = (c, m) => { if (!c) throw new Error(m); };

async function useFixedWindowSize() {
  await app.evaluate(({ BrowserWindow }) => {
    const [window] = BrowserWindow.getAllWindows();
    if (window) {
      window.setSize(1280, 800);
      window.center();
    }
  });
}

const card = title => page.locator(`.game-card:has(.game-title-button:text-is("${title}"))`);

async function closeToast() {
  await page.locator('.toast-close').first().click().catch(() => {});
  await page.waitForTimeout(150);
}

async function login(username, password) {
  await page.fill('#login-username', username);
  await page.fill('#login-password', password);
  await page.click('button.auth-submit');
}

async function addGame(title, genres) {
  await page.click('button:has-text("Добавить игру")');
  await page.fill('#title', title);
  await page.fill('#developer', 'Dev');
  await page.fill('#releaseDate', '2024-01-01');
  await page.fill('#filePath', EXE);
  for (const genre of genres) {
    await page.locator(`.genre-checkbox-item:has-text("${genre}") input`).first().check();
  }
  await page.click('.game-form-modal-content button[type=submit]');
  await page.waitForSelector(`.game-title-button:text-is("${title}")`);
  await closeToast();
}

async function rate(title, stars) {
  await card(title).locator('.rate-button').click();
  await page.waitForSelector('.rating-stars');
  await page.locator('.rating-star').nth(stars - 1).click();
  await page.click('button:has-text("Сохранить оценку")');
  await page.waitForSelector('.toast');
  await closeToast();
}

(async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'gc-data-'));
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
  await useFixedWindowSize();
  await page.waitForSelector('#login-username', { timeout: 20000 });

  await step('Подготовка каталога', async () => {
    await login('admin', 'admin');
    await page.waitForSelector('.metric-card');
    await addGame('Alpha', ['Action packed', 'MOBA']);
    await addGame('Beta', ['Action packed']);
  });

  await step('Пользователь оценивает и запускает игры', async () => {
    await page.click('.sidebar-logout-btn');
    await page.click('a:has-text("Зарегистрироваться")');
    await page.fill('#register-username', 'player');
    await page.fill('#register-password', 'player');
    await page.click('button.auth-submit');
    await page.waitForSelector('.game-card');
    await rate('Alpha', 5);
    await rate('Beta', 3);
    await card('Alpha').locator('.favorite-button').click();
    await page.waitForSelector('.toast');
    await closeToast();
    await card('Alpha').locator('.launch-button').click();
    await page.waitForTimeout(3000);
  });

  await step('Иконка с неподдерживаемым типом отклоняется', async () => {
    const result = await page.evaluate(() => window.electronAPI
      .setUserGameIcon(1, 'data:text/html;base64,PHNjcmlwdD4=')
      .then(() => 'ok', e => e.message));
    expect(result.includes('APP_ERROR:iconUnsupportedType'), result);
  });

  await step('Иконка не в формате data URL отклоняется', async () => {
    const result = await page.evaluate(() => window.electronAPI
      .setUserGameIcon(1, 'C:/Windows/System32/whoami.exe')
      .then(() => 'ok', e => e.message));
    expect(result.includes('APP_ERROR:iconInvalidFormat'), result);
  });

  await step('Слишком большая иконка отклоняется', async () => {
    const result = await page.evaluate(() => window.electronAPI
      .setUserGameIcon(1, 'data:image/png;base64,' + 'A'.repeat(7 * 1024 * 1024))
      .then(() => 'ok', e => e.message));
    expect(result.includes('APP_ERROR:iconTooLarge'), result);
  });

  await step('Пустая иконка отклоняется', async () => {
    const result = await page.evaluate(() => window.electronAPI
      .setUserGameIcon(1, 'data:image/png;base64,')
      .then(() => 'ok', e => e.message));
    expect(result.includes('APP_ERROR:iconInvalidFormat'), result);
  });

  await step('Удаление жанра не удаляет игры', async () => {
    await page.click('.sidebar-logout-btn');
    await login('admin', 'admin');
    await page.waitForSelector('.metric-card');
    await page.click('a.nav-link:has-text("Жанры")');
    await page.locator('tr:has(td:text-is("MOBA")) button:has-text("Удалить")').click();
    await page.click('.confirm-modal-content button:has-text("Удалить")');
    await page.waitForSelector('.toast');
    await closeToast();

    await page.click('a.nav-link:has-text("Управление каталогом")');
    await page.waitForSelector('.game-card');
    expect(await page.locator('.game-card').count() === 2, 'games disappeared');
    const alpha = await card('Alpha').textContent();
    expect(alpha.includes('Action packed'), alpha);
    expect(!alpha.includes('MOBA'), alpha);
  });

  await step('Игра без жанров остается в каталоге', async () => {
    await page.click('a.nav-link:has-text("Жанры")');
    await page.locator('tr:has(td:text-is("Action packed")) button:has-text("Удалить")').click();
    await page.click('.confirm-modal-content button:has-text("Удалить")');
    await page.waitForSelector('.toast');
    await closeToast();

    await page.click('a.nav-link:has-text("Управление каталогом")');
    await page.waitForSelector('.game-card');
    expect(await page.locator('.game-card').count() === 2, 'games disappeared');
    const alpha = await card('Alpha').textContent();
    expect(alpha.includes('Жанры: -'), alpha);
    await page.screenshot({ path: path.join(SHOTS, 'data-01-genreless-games.png') });
  });

  await step('Оценки переживают удаление жанров', async () => {
    const alpha = await card('Alpha').textContent();
    expect(alpha.includes('(5.0)'), alpha);
    expect(alpha.includes('Оценок: 1'), alpha);
  });

  await step('Удаление игры убирает ее у пользователя вместе со статистикой', async () => {
    await card('Alpha').locator('button:has-text("Удалить")').click();
    await page.click('.confirm-modal-content button:has-text("Удалить")');
    await page.waitForSelector('.toast');
    await closeToast();

    const totalRatings = await page.locator('.metric-card:has-text("Всего оценок") p').textContent();
    expect(totalRatings === '1', 'total ratings ' + totalRatings);

    await page.click('.sidebar-logout-btn');
    await login('player', 'player');
    await page.waitForSelector('.game-card');
    expect(await page.locator('.game-card').count() === 1, 'deleted game still visible');
    expect(await card('Alpha').count() === 0, 'deleted game still visible');

    await page.check('#onlyFavorites');
    await page.waitForSelector('.empty-state');
    await page.uncheck('#onlyFavorites');
  });

  await step('Отзыв оставшейся игры на месте', async () => {
    const reviews = await page.evaluate(() => window.electronAPI.getGameReviews(2).then(r => r.length, e => 'ERR ' + e.message));
    expect(reviews === 1, 'reviews ' + reviews);
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
