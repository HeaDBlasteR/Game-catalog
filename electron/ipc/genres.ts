import { ipcMain } from 'electron';
import { genreDb } from '../database-service';
import { requireUser } from '../session';

export function registerGenresHandlers() {
  ipcMain.handle('genres:getAll', async event => {
    try {
      await requireUser(event);
      return await genreDb.getAll();
    } catch (err: any) {
      throw new Error(err.message);
    }
  });
}
