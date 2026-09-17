import { ipcMain } from 'electron';
import { gameDb, ratingDb } from '../database-service';
import { assertId, requireUser } from '../session';

export function registerRatingsHandlers() {
  ipcMain.handle('ratings:rate', async (event, gameId: number, rating: 1|2|3|4|5) => {
    try {
      const user = await requireUser(event);
      if (user.role === 'admin') {
        throw new Error('Администратор не может ставить оценки играм');
      }

      if (![1, 2, 3, 4, 5].includes(rating)) {
        throw new Error('Оценка должна быть от 1 до 5');
      }

      const game = await gameDb.getById(assertId(gameId));
      if (!game) throw new Error('Игра не найдена');

      await ratingDb.addOrUpdateRating(user.id, game.id, rating);
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('ratings:getUserRating', async (event, gameId: number) => {
    try {
      const user = await requireUser(event);
      const rating = await ratingDb.getUserRating(user.id, assertId(gameId));
      return rating ? rating.rating : null;
    } catch (err: any) {
      throw new Error(err.message);
    }
  });
}
