import { ipcMain } from 'electron';
import { ratingDb } from '../database-service';

export function registerRatingsHandlers() {
  ipcMain.handle('ratings:rate', async (event, userId: number, gameId: number, rating: 1|2|3|4|5) => {
    try {
      await ratingDb.addOrUpdateRating(userId, gameId, rating);
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('ratings:getUserRating', async (event, userId: number, gameId: number) => {
    try {
      const rating = await ratingDb.getUserRating(userId, gameId);
      return rating ? rating.rating : null;
    } catch (err: any) {
      throw new Error(err.message);
    }
  });
}