import { ipcMain } from 'electron';
import { ratingDb } from '../database-service';
import { AppDataSource } from '../data-source';
import { User } from '../../src/entities/User';

export function registerRatingsHandlers() {
  ipcMain.handle('ratings:rate', async (event, userId: number, gameId: number, rating: 1|2|3|4|5) => {
    try {
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOneBy({ id: userId });
      if (!user) {
        throw new Error('Пользователь не найден');
      }
      if (user.role === 'admin') {
        throw new Error('Администратор не может ставить оценки играм');
      }

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