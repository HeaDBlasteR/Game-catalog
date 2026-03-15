import { ipcMain } from 'electron';
import { genreDb } from '../database-service';

export function registerGenresHandlers() {
  ipcMain.handle('genres:getAll', async () => {
    try {
      return await genreDb.getAll();
    } catch (err: any) {
      throw new Error(err.message);
    }
  });
}