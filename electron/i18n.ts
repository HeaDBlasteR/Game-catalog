import { app, ipcMain } from 'electron';

type MainLanguage = 'ru' | 'en';

const messages = {
  ru: {
    profileIconDialogTitle: 'Выберите иконку профиля',
    gameIconDialogTitle: 'Выберите иконку игры',
    iconFilterName: 'Иконки',
    startupErrorTitle: 'Ошибка запуска',
    startupErrorMessage: 'Не удалось подключиться к базе данных:'
  },
  en: {
    profileIconDialogTitle: 'Choose a profile icon',
    gameIconDialogTitle: 'Choose a game icon',
    iconFilterName: 'Icons',
    startupErrorTitle: 'Startup error',
    startupErrorMessage: 'Failed to connect to the database:'
  }
};

let currentLanguage: MainLanguage | null = null;

function getLanguage(): MainLanguage {
  if (currentLanguage) return currentLanguage;
  return app.getLocale().toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

export function mt(key: keyof typeof messages.ru): string {
  return messages[getLanguage()][key];
}

export function registerI18nHandlers() {
  ipcMain.handle('app:setLanguage', (_event, language: unknown) => {
    if (language === 'ru' || language === 'en') {
      currentLanguage = language;
    }
  });
}
