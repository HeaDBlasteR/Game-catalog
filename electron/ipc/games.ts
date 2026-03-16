import { dialog, ipcMain } from 'electron';
import { gameDb } from '../database-service';
import { AppDataSource } from '../data-source';
import { exec } from 'child_process';
import { promisify } from 'util';
import { User } from '../../src/entities/User';
const execAsync = promisify(exec);

export function registerGamesHandlers() {
  ipcMain.handle('games:getAll', async (event, userId?: number) => {
    try {
      return await gameDb.getAll(userId);
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('games:get', async (event, id: number, userId?: number) => {
    try {
      return await gameDb.getById(id, userId);
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('games:uploadIconFromPC', async (event, scope: 'admin' | 'user', userId?: number) => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Выберите иконку игры',
        properties: ['openFile'],
        filters: [{ name: 'Иконки', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg', 'ico'] }]
      });

      if (canceled || !filePaths.length) {
        return null;
      }

      if (scope === 'user') {
        if (!userId) throw new Error('Не передан userId для пользовательской иконки');
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOneBy({ id: userId });
        if (!user) throw new Error('Пользователь не найден');
      }

      return await gameDb.uploadIconFromLocalFile(filePaths[0], scope, userId);
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('games:setUserIcon', async (event, userId: number, gameId: number, iconPath: string | null) => {
    try {
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOneBy({ id: userId });
      if (!user) throw new Error('Пользователь не найден');

      const game = await gameDb.getById(gameId);
      if (!game) throw new Error('Игра не найдена');

      await gameDb.setUserIcon(userId, gameId, iconPath);
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('games:launch', async (event, gameId: number, userId: number) => {
    try {
      const game = await gameDb.getById(gameId);
      if (!game) throw new Error('Game not found');
      await execAsync(`"${game.filePath}"`);
      return gameId;
    } catch (err: any) {
      throw new Error(err.message);
    }
  });
}