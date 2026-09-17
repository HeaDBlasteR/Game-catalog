import { dialog, ipcMain, shell } from 'electron';
import { gameDb } from '../database-service';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { assertId, requireAdmin, requireUser } from '../session';

async function runGame(filePath: string): Promise<void> {
  if (path.extname(filePath).toLowerCase() !== '.exe') {
    const error = await shell.openPath(filePath);
    if (error) throw new Error(error);
    return;
  }

  return new Promise((resolve, reject) => {
    const child = spawn(filePath, [], {
      cwd: path.dirname(filePath),
      stdio: 'ignore',
      windowsHide: false
    });
    child.once('error', reject);
    child.once('exit', () => resolve());
  });
}

export function registerGamesHandlers() {
  ipcMain.handle('games:getAll', async event => {
    try {
      const user = await requireUser(event);
      return await gameDb.getAll(user.id);
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('games:get', async (event, id: number) => {
    try {
      const user = await requireUser(event);
      return await gameDb.getById(assertId(id), user.id);
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('games:uploadIconFromPC', async (event, scope: 'admin' | 'user') => {
    try {
      if (scope !== 'admin' && scope !== 'user') throw new Error('Некорректный тип иконки');
      const user = scope === 'admin' ? await requireAdmin(event) : await requireUser(event);

      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Выберите иконку игры',
        properties: ['openFile'],
        filters: [{ name: 'Иконки', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg', 'ico'] }]
      });

      if (canceled || !filePaths.length) {
        return null;
      }

      return await gameDb.uploadIconFromLocalFile(filePaths[0], scope, user.id);
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('games:setUserIcon', async (event, gameId: number, iconPath: string | null) => {
    try {
      const user = await requireUser(event);
      if (iconPath !== null && typeof iconPath !== 'string') throw new Error('Некорректный формат иконки');

      const game = await gameDb.getById(assertId(gameId));
      if (!game) throw new Error('Игра не найдена');

      await gameDb.setUserIcon(user.id, game.id, iconPath);
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('games:launch', async (event, gameId: number) => {
    try {
      await requireUser(event);
      const game = await gameDb.getById(assertId(gameId));
      if (!game) throw new Error('Игра не найдена');

      const filePath = game.filePath.trim().replace(/^"(.*)"$/, '$1');
      if (!filePath || !path.isAbsolute(filePath) || !fs.existsSync(filePath)) {
        throw new Error('Файл игры не найден. Проверьте путь к исполняемому файлу');
      }

      await runGame(filePath);
      return game.id;
    } catch (err: any) {
      throw new Error(err.message);
    }
  });
}
