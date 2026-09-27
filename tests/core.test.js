const { _electron: electron } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PROJECT = path.resolve(__dirname, '..');
const OUT = process.env.TEST_ARTIFACTS ?? path.join(__dirname, '.artifacts');
const SHOTS = path.join(OUT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const consoleErrors = [];
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
    try { await page.screenshot({ path: path.join(SHOTS, `FAIL-${results.length}.png`) }); } catch {}
    await page.keyboard.press('Escape').catch(() => {});
  }
}

function expect(cond, msg) { if (!cond) throw new Error(msg); }

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

async function expectToast(expected) {
  await waitForToast(expected);
}

async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); }

async function login(u, p) {
  await page.goto(page.url().split('#')[0] + '#/login');
  await page.fill('#login-username', u);
  await page.fill('#login-password', p);
  await page.click('button.auth-submit');
}

async function logout() {
  await page.click('.sidebar-logout-btn');
  await page.waitForSelector('#login-username');
}

(async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'gc-e2e-'));
  const png = path.join(OUT, 'icon.png');
  fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGP8z8DwnwEIGGEMBgYGBgA5DgP+GRsVxQAAAABJRU5ErkJggg==', 'base64'));
  const env = { ...process.env, NODE_ENV: 'production' };
  delete env.ELECTRON_RUN_AS_NODE;

  app = await electron.launch({
    executablePath: require('electron'),
    args: [PROJECT, `--user-data-dir=${userData}`],
    cwd: PROJECT,
    env
  });
  page = await app.firstWindow();
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
  await useFixedWindowSize();
  await page.waitForSelector('#login-username', { timeout: 20000 });

  await app.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] });
  }, png);

  const dbPath = await app.evaluate(({ app }) => app.getPath('userData'));
  console.log('userData:', dbPath);

  await step('Неавторизованный вызов API отклоняется', async () => {
    const r = await page.evaluate(() => window.electronAPI.getGames().then(() => 'ok', e => e.message));
    expect(r.includes('APP_ERROR:authRequired'), r);
  });

  await step('Вход с неверным паролем', async () => {
    await login('admin', 'wrong');
    const err = await page.locator('.error-text').textContent({ timeout: 5000 });
    expect(err === 'Неверное имя пользователя или пароль.', err);
  });

  await step('Вход несуществующего пользователя', async () => {
    await login('nobody', 'x');
    await page.waitForTimeout(500);
    const err = await page.locator('.error-text').textContent();
    expect(err === 'Неверное имя пользователя или пароль.', err);
  });

  await step('Вход администратора', async () => {
    await login('admin', 'admin');
    await page.waitForSelector('text=Управление каталогом >> nth=0');
    await page.waitForSelector('.metric-card');
    await shot('01-admin-catalog');
  });

  await step('Админ не может ставить оценки (API)', async () => {
    const r = await page.evaluate(() => window.electronAPI.rateGame(1, 5).then(() => 'ok', e => e.message));
    expect(r.includes('APP_ERROR:adminCannotRate'), r);
  });

  await step('Жанры: создание', async () => {
    await page.click('a.nav-link:has-text("Жанры")');
    await page.click('button:has-text("Создать жанр")');
    await page.fill('#genreCreateName', 'Тестовый жанр');
    await page.fill('#genreCreateDescription', 'Описание');
    await page.click('.genre-modal-content button[type=submit]');
    await expectToast('Жанр добавлен');
    await page.waitForSelector('td:text-is("Тестовый жанр")');
  });

  await step('Жанры: дубль даёт правильную ошибку', async () => {
    await page.click('button:has-text("Создать жанр")');
    await page.fill('#genreCreateName', 'Тестовый жанр');
    await page.click('.genre-modal-content button[type=submit]');
    await expectToast('Жанр с таким названием уже существует');
    await shot('02-genre-duplicate');
    await page.click('.genre-modal-content button:has-text("Отмена")');
  });

  await step('Жанры: редактирование', async () => {
    await page.locator('tr:has(td:text-is("Тестовый жанр")) button:has-text("Редактировать")').click();
    await page.fill('#genreEditName', 'Тестовый жанр 2');
    await page.click('.genre-modal-content button[type=submit]');
    await expectToast('Жанр обновлен');
    await page.waitForSelector('td:text-is("Тестовый жанр 2")');
  });

  await step('Жанры: удаление с подтверждением', async () => {
    await page.locator('tr:has(td:text-is("Тестовый жанр 2")) button:has-text("Удалить")').click();
    await page.click('.confirm-modal-content button:has-text("Удалить")');
    await expectToast('Жанр удален');
    expect(await page.locator('td:text-is("Тестовый жанр 2")').count() === 0, 'genre still present');
  });

  async function addGame(title, filePath, withIcon) {
    await page.click('button:has-text("Добавить игру")');
    await page.fill('#title', title);
    await page.fill('#developer', 'Dev Studio');
    await page.fill('#releaseDate', '2024-05-01');
    await page.fill('#filePath', filePath);
    await page.locator('.genre-checkbox-item input').nth(0).check();
    await page.locator('.genre-checkbox-item input').nth(5).check();
    if (withIcon) {
      await page.click('.game-form-modal-content button:has-text("Загрузить с ПК")');
      await page.waitForSelector('.game-form-icon-preview');
      await expectToast('Иконка игры загружена');
    }
    await page.click('.game-form-modal-content button[type=submit]');
  }

  await step('Игра: без жанра не сохраняется', async () => {
    await page.click('a.nav-link:has-text("Управление каталогом")');
    await page.click('button:has-text("Добавить игру")');
    await page.fill('#title', 'X');
    await page.fill('#developer', 'X');
    await page.fill('#releaseDate', '2024-01-01');
    await page.fill('#filePath', 'C:\\x.exe');
    await page.click('.game-form-modal-content button[type=submit]');
    await expectToast('Выберите хотя бы один жанр');
    await page.click('.game-form-modal-content button:has-text("Отмена")');
  });

  await step('Игра: добавление с иконкой', async () => {
    await addGame('Whoami Game', 'C:\\Windows\\System32\\whoami.exe', true);
    await expectToast('Игра добавлена');
    await page.waitForSelector('.game-card .game-title-button:text-is("Whoami Game")');
    await shot('03-game-added');
  });

  await step('Игра: добавление второй (битый путь)', async () => {
    await addGame('Broken Game', 'C:\\nope\\missing.exe', false);
    await expectToast('Игра добавлена');
  });

  await step('Игра: редактирование', async () => {
    await page.locator('.game-card:has(.game-title-button:text-is("Broken Game")) button:has-text("Редактировать")').click();
    expect(await page.inputValue('#title') === 'Broken Game', 'form not prefilled');
    await page.fill('#title', 'Broken Game 2');
    await page.click('.game-form-modal-content button[type=submit]');
    await expectToast('Игра обновлена');
    await page.waitForSelector('.game-card .game-title-button:text-is("Broken Game 2")');
  });

  await step('Статистика админа', async () => {
    const txt = await page.locator('.metric-card').first().textContent();
    expect(txt.includes('2'), txt);
  });

  await step('Выход администратора', async () => { await logout(); });

  await step('После выхода API закрыт', async () => {
    const r = await page.evaluate(() => window.electronAPI.getGenres().then(() => 'ok', e => e.message));
    expect(r.includes('APP_ERROR:authRequired'), r);
  });

  await step('Регистрация пользователя', async () => {
    await page.click('a:has-text("Зарегистрироваться")');
    await page.fill('#register-username', '  tester  ');
    await page.fill('#register-password', 'pass123');
    await page.click('button.auth-submit');
    await page.waitForSelector('.game-card');
    await shot('04-user-catalog');
  });

  await step('Логин обрезается при регистрации', async () => {
    const name = await page.locator('.sidebar-user-name').textContent();
    expect(name === 'tester', `"${name}"`);
  });

  await step('Пользователь не может вызвать админ-API', async () => {
    const r = await page.evaluate(() => window.electronAPI.deleteGame(1).then(() => 'ok', e => e.message));
    expect(r.includes('APP_ERROR:forbidden'), r);
    const r2 = await page.evaluate(() => window.electronAPI.addGenre({ name: 'hack', description: '' }).then(() => 'ok', e => e.message));
    expect(r2.includes('APP_ERROR:forbidden'), r2);
  });

  await step('Пользователь не видит админ-страницу жанров', async () => {
    await page.goto(page.url().split('#')[0] + '#/genres');
    await page.waitForTimeout(300);
    expect(!page.url().includes('/genres'), page.url());
    expect(await page.locator('a.nav-link:has-text("Жанры")').count() === 0, 'genres link visible');
  });

  await step('Поиск и фильтр по жанру', async () => {
    await page.fill('#searchGame', 'whoami');
    expect(await page.locator('.game-card').count() === 1, 'search');
    await page.fill('#searchGame', 'zzz');
    await page.waitForSelector('text=Ничего не найдено');
    await page.fill('#searchGame', '');
    const options = await page.locator('#genreFilter option').allTextContents();
    await page.selectOption('#genreFilter', options[1]);
    expect(await page.locator('.game-card').count() === 2, 'genre filter');
    await page.selectOption('#genreFilter', options[3]);
    await page.waitForSelector('text=Ничего не найдено');
    await page.selectOption('#genreFilter', 'Все');
  });

  await step('Запуск игры → окно оценки → сохранение', async () => {
    const card = page.locator('.game-card:has(.game-title-button:text-is("Whoami Game"))');
    expect((await card.locator('.rate-button').textContent()).includes('☆'), 'already rated?');
    await card.locator('.launch-button').click();
    await page.waitForSelector('.rating-stars', { timeout: 60000 });
    await page.locator('.rating-star').nth(3).click();
    await shot('05-rating-modal');
    await page.click('button:has-text("Сохранить оценку")');
    await expectToast('Оценка сохранена');
    await page.waitForFunction(() => {
      const c = [...document.querySelectorAll('.game-card')].find(e => e.querySelector('h3').textContent === 'Whoami Game');
      return c && c.querySelector('.rate-button').textContent.includes('⭐') && c.textContent.includes('(4.0)');
    }, null, { timeout: 5000 });
  });

  await step('Повторный запуск не показывает окно оценки', async () => {
    await page.locator('.game-card:has(.game-title-button:text-is("Whoami Game")) .launch-button').click();
    await page.waitForTimeout(1500);
    expect(await page.locator('.rating-stars').count() === 0, 'modal shown again');
  });

  await step('Изменение оценки через звезду', async () => {
    await page.locator('.game-card:has(.game-title-button:text-is("Whoami Game")) .rate-button').click();
    await page.locator('.rating-star').nth(1).click();
    await page.click('button:has-text("Сохранить оценку")');
    await expectToast('Оценка сохранена');
    await page.waitForSelector('.game-card:has(.game-title-button:text-is("Whoami Game")) >> text=(2.0)');
  });

  await step('Оценка вне диапазона отклоняется (API)', async () => {
    const r = await page.evaluate(() => window.electronAPI.rateGame(1, 9).then(() => 'ok', e => e.message));
    expect(r.includes('APP_ERROR:ratingOutOfRange'), r);
  });

  await step('Запуск игры с битым путём', async () => {
    await page.locator('.game-card:has(.game-title-button:text-is("Broken Game 2")) .launch-button').click();
    await expectToast('Файл игры не найден');
  });

  await step('Своя иконка игры: загрузка и сброс', async () => {
    const card = page.locator('.game-card:has(.game-title-button:text-is("Broken Game 2"))');
    await card.locator('button:has-text("Загрузить с ПК")').click();
    await expectToast('Иконка игры успешно сохранена');
    await card.locator('img.game-icon').waitFor();
    await card.locator('button:has-text("Сбросить")').click();
    await expectToast('Иконка игры успешно сохранена');
    await card.locator('.game-icon-placeholder').waitFor();
  });

  await step('Профиль: форматирование телефона и сохранение', async () => {
    await page.click('a.nav-link:has-text("Профиль")');
    await page.fill('#displayName', 'Тестер');
    await page.fill('#email', 'tester@example.com');
    await page.click('#phone');
    expect(await page.inputValue('#phone') === '+7', 'no +7 prefix');
    await page.locator('#phone').pressSequentially('9001234567');
    const phone = await page.inputValue('#phone');
    expect(phone === '+7 (900) 123-45-67', phone);
    await page.click('button:has-text("Загрузить иконку с ПК")');
    await expectToast('Иконка профиля загружена');
    await page.click('button:has-text("Сохранить профиль")');
    await expectToast('Профиль сохранен');
    expect(await page.locator('.sidebar-user-name').textContent() === 'Тестер', 'sidebar name');
    await page.locator('img.sidebar-user-avatar').waitFor();
    await shot('06-profile');
  });

  await step('Профиль: пустой "+7" не сохраняется', async () => {
    await page.fill('#phone', '');
    await page.click('#phone');
    await page.click('button:has-text("Сохранить профиль")');
    await expectToast('Профиль сохранен');
    const p = await page.evaluate(() => window.electronAPI.getProfile().then(u => u.phone));
    expect(p === null, String(p));
  });

  await step('Профиль сохраняется после повторного входа', async () => {
    await logout();
    await login('tester', 'pass123');
    await page.waitForSelector('.game-card');
    expect(await page.locator('.sidebar-user-name').textContent() === 'Тестер', 'name lost');
  });

  await step('Регистрация занятого логина', async () => {
    await logout();
    await page.click('a:has-text("Зарегистрироваться")');
    await page.fill('#register-username', 'tester');
    await page.fill('#register-password', 'x');
    await page.click('button.auth-submit');
    const err = await page.locator('.error-text').textContent({ timeout: 5000 });
    expect(err === 'Пользователь с таким именем уже существует.', err);
  });

  await step('Админ удаляет игру, рейтинг/статистика обновляются', async () => {
    await login('admin', 'admin');
    await page.waitForSelector('.metric-card');
    const total = await page.locator('.metric-card:has-text("Всего оценок") p').textContent();
    expect(total === '1', 'total ratings ' + total);
    await page.locator('.game-card:has(.game-title-button:text-is("Whoami Game")) button:has-text("Удалить")').click();
    await page.click('.confirm-modal-content button:has-text("Удалить")');
    await expectToast('Игра удалена');
    expect(await page.locator('.game-card').count() === 1, 'not deleted');
    await shot('07-after-delete');
  });

  await step('Внешняя навигация и новые окна заблокированы', async () => {
    const before = page.url();
    await page.evaluate(() => { window.open('https://example.com'); });
    await page.evaluate(() => { location.href = 'https://example.com'; }).catch(() => {});
    await page.waitForTimeout(1000);
    expect(page.url() === before, page.url());
    const windows = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
    expect(windows === 1, 'windows ' + windows);
  });

  await step('Нет ошибок в консоли renderer', async () => {
    const relevant = consoleErrors.filter(e => !e.includes('Error invoking remote method'));
    expect(relevant.length === 0, relevant.join(' || '));
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
