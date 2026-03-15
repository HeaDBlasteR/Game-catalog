import { ipcMain } from 'electron';
import { gameDb } from '../database-service';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

export function registerGamesHandlers() {
  ipcMain.handle('games:getAll', async () => {
    try {
      return await gameDb.getAll();
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('games:get', async (event, id: number) => {
    try {
      return await gameDb.getById(id);
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