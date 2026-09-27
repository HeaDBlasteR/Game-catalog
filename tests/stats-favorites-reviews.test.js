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
    try { await page.screenshot({ path: path.join(SHOTS, `F2-FAIL-${results.length}.png`) }); } catch {}
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

async function waitForToast(expected) {
  const toasts = page.locator('.toast p');
  const deadline = Date.now() + 20000;

  while (Date.now() < deadline) {
    if ((await toasts.allTextContents()).some(text => text.includes(expected))) {
      while (await page.locator('.toast-close').count()) {
        await page.locator('.toast-close').first().click().catch(() => {});
        await page.waitForTimeout(100);
      }
      return;
    }
    await page.waitForTimeout(100);
  }

  throw new Error(`toast ${JSON.stringify(await toasts.allTextContents())} != "${expected}"`);
}

async function toast(expected) {
  await waitForToast(expected);
}

const card = title => page.locator(`.game-card:has(.game-title-button:text-is("${title}"))`);
const titles = () => page.locator('.game-title-button').allTextContents();

async function addGame(title) {
  await page.click('button:has-text("Добавить игру")');
  await page.fill('#title', title);
  await page.fill('#developer', 'Dev');
  await page.fill('#releaseDate', '2024-01-01');
  await page.fill('#filePath', EXE);
  await page.locator('.genre-checkbox-item input').nth(0).check();
  await page.click('.game-form-modal-content button[type=submit]');
  await toast('Игра добавлена.');
}

(async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'gc-f2-'));
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

  await step('Админ добавляет две игры', async () => {
    await page.fill('#login-username', 'admin');
    await page.fill('#login-password', 'admin');
    await page.click('button.auth-submit');
    await page.waitForSelector('.metric-card');
    await addGame('Alpha Game');
    await addGame('Zulu Game');
    expect((await titles()).join(',') === 'Alpha Game,Zulu Game', (await titles()).join(','));
  });

  await step('Регистрация игрока', async () => {
    await page.click('.sidebar-logout-btn');
    await page.click('a:has-text("Зарегистрироваться")');
    await page.fill('#register-username', 'gamer');
    await page.fill('#register-password', 'gamer');
    await page.click('button.auth-submit');
    await page.waitForSelector('.game-card');
  });

  await step('Добавление в избранное', async () => {
    expect(await card('Zulu Game').locator('.favorite-button').textContent() === '♡', 'already favorite');
    await card('Zulu Game').locator('.favorite-button').click();
    await toast('Игра добавлена в избранное.');
    await page.waitForSelector('.game-card .favorite-button.active');
    expect(await card('Zulu Game').locator('.favorite-button').textContent() === '♥', 'not marked');
  });

  await step('Фильтр «Только избранное»', async () => {
    await page.check('#onlyFavorites');
    expect((await titles()).join(',') === 'Zulu Game', (await titles()).join(','));
    await page.uncheck('#onlyFavorites');
    expect((await titles()).length === 2, 'filter not reset');
  });

  await step('Избранное сохраняется после перезахода', async () => {
    await page.click('.sidebar-logout-btn');
    await page.fill('#login-username', 'gamer');
    await page.fill('#login-password', 'gamer');
    await page.click('button.auth-submit');
    await page.waitForSelector('.game-card');
    expect(await card('Zulu Game').locator('.favorite-button').textContent() === '♥', 'favorite lost');
  });

  await step('Удаление из избранного', async () => {
    await card('Zulu Game').locator('.favorite-button').click();
    await toast('Игра удалена из избранного.');
    await page.check('#onlyFavorites');
    await page.waitForSelector('text=В избранном пусто');
    await page.uncheck('#onlyFavorites');
    await card('Zulu Game').locator('.favorite-button').click();
    await toast('Игра добавлена в избранное.');
  });

  await step('Запуск игры записывает статистику', async () => {
    await card('Alpha Game').locator('.launch-button').click();
    await page.waitForSelector('.rating-stars', { timeout: 60000 });
    await page.locator('.rating-star').nth(3).click();
    await page.fill('#ratingComment', 'Хорошая утилита, запускается быстро.');
    await page.screenshot({ path: path.join(SHOTS, 'f2-01-rating-comment.png') });
    await page.click('button:has-text("Сохранить оценку")');
    await toast('Оценка сохранена.');
    const text = await card('Alpha Game').innerText();
    expect(text.includes('Наиграно:'), text);
    expect(text.includes('Последний запуск:'), text);
  });

  await step('Статистика и отзыв в окне подробностей', async () => {
    await card('Alpha Game').locator('.game-details-button').click();
    const modal = page.locator('.game-details-content');
    await modal.waitFor();
    await modal.locator('.review-item').first().waitFor();
    const text = await modal.textContent();
    expect(text.includes('Ваша статистика'), 'stats block');
    expect(text.includes('Запусков'), 'launch count label');
    expect(text.includes('gamer'), 'review author: ' + text);
    expect(text.includes('Хорошая утилита, запускается быстро.'), 'review text');
    expect(text.includes('★★★★☆'), 'review stars');
    await page.screenshot({ path: path.join(SHOTS, 'f2-02-details-stats.png') });
    await page.keyboard.press('Escape');
  });

  await step('Повторное открытие оценки подставляет отзыв', async () => {
    await card('Alpha Game').locator('.rate-button').click();
    await page.waitForSelector('#ratingComment');
    await page.waitForFunction(
      expected => document.querySelector('#ratingComment')?.value === expected,
      'Хорошая утилита, запускается быстро.',
      { timeout: 20000 }
    );
    const active = await page.locator('.rating-star.active').count();
    expect(active === 4, 'stars ' + active);
    await page.fill('#ratingComment', '');
    await page.click('button:has-text("Сохранить оценку")');
    await toast('Оценка сохранена.');
    await card('Alpha Game').locator('.game-details-button').click();
    await page.locator('.game-details-content .review-item').first().waitFor();
    const text = await page.locator('.game-details-content').textContent();
    expect(text.includes('Без комментария.'), text);
    await page.keyboard.press('Escape');
  });

  await step('Сортировка по названию и по новизне', async () => {
    await page.selectOption('#sortGames', 'title');
    expect((await titles()).join(',') === 'Alpha Game,Zulu Game', (await titles()).join(','));
    await page.selectOption('#sortGames', 'newest');
    expect((await titles()).join(',') === 'Zulu Game,Alpha Game', (await titles()).join(','));
  });

  await step('Сортировка по наигранному и последнему запуску', async () => {
    await page.selectOption('#sortGames', 'playtime');
    expect((await titles())[0] === 'Alpha Game', (await titles()).join(','));
    await page.selectOption('#sortGames', 'lastPlayed');
    expect((await titles())[0] === 'Alpha Game', (await titles()).join(','));
    await page.screenshot({ path: path.join(SHOTS, 'f2-03-catalog-sorted.png') });
  });

  await step('Сортировка по рейтингу', async () => {
    await card('Zulu Game').locator('.rate-button').click();
    await page.waitForSelector('.rating-stars');
    await page.locator('.rating-star').nth(4).click();
    await page.click('button:has-text("Сохранить оценку")');
    await toast('Оценка сохранена.');
    await page.selectOption('#sortGames', 'rating');
    expect((await titles()).join(',') === 'Zulu Game,Alpha Game', (await titles()).join(','));
  });

  await step('Отзывы видны другому пользователю', async () => {
    await page.click('.sidebar-logout-btn');
    await page.click('a:has-text("Зарегистрироваться")');
    await page.fill('#register-username', 'second');
    await page.fill('#register-password', 'second');
    await page.click('button.auth-submit');
    await page.waitForSelector('.game-card');
    await card('Zulu Game').locator('.game-details-button').click();
    await page.locator('.game-details-content .review-item').first().waitFor();
    const text = await page.locator('.game-details-content').textContent();
    expect(text.includes('gamer'), text);
    expect(text.includes('Вы еще не запускали эту игру.'), 'stats for new user');
    await page.keyboard.press('Escape');
    expect(await card('Zulu Game').locator('.favorite-button').textContent() === '♡', 'favorite leaked to another user');
  });

  await step('Переводы новых элементов на английском', async () => {
    await page.click('.sidebar-language-switcher .language-option:has-text("EN")');
    const shell = await page.locator('.dashboard-shell').innerText();
    const cyr = shell.match(/[А-Яа-яЁё][^\n]*/g);
    expect(!cyr, cyr && cyr.join(' | '));
    await card('Alpha Game').locator('.game-details-button').click();
    await page.locator('.game-details-content .review-item').first().waitFor();
    const modal = await page.locator('.game-details-content').textContent();
    const cyr2 = modal.match(/[А-Яа-яЁё][^\n]*/g);
    expect(!cyr2 || cyr2.every(x => x.includes('Хорошая')), cyr2 && cyr2.join(' | '));
    expect(modal.includes('Your stats') && modal.includes('Reviews'), modal);
    await page.screenshot({ path: path.join(SHOTS, 'f2-04-details-en.png') });
    await page.keyboard.press('Escape');
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
