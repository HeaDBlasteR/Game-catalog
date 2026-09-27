import { ipcMain } from 'electron';
import { gameDb, ratingDb } from '../database-service';
import { assertId, assertString, requireUser } from '../session';
import { appError } from '../../src/shared/app-error';

export function registerRatingsHandlers() {
  ipcMain.handle('ratings:rate', async (event, gameId: number, rating: 1|2|3|4|5, comment: unknown) => {
    try {
      const user = await requireUser(event);
      if (user.role === 'admin') {
        throw appError('adminCannotRate');
      }

      if (![1, 2, 3, 4, 5].includes(rating)) {
        throw appError('ratingOutOfRange');
      }

      const game = await gameDb.getById(assertId(gameId));
      if (!game) throw appError('gameNotFound');

      let normalizedComment: string | null = null;
      if (comment !== undefined && comment !== null) {
        const text = assertString(comment).trim();
        normalizedComment = text ? text.slice(0, 1000) : null;
      }

      await ratingDb.addOrUpdateRating(user.id, game.id, rating, normalizedComment);
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('ratings:getDistribution', async (event, gameId: number) => {
    try {
      await requireUser(event);
      return await ratingDb.getDistribution(assertId(gameId));
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('ratings:getReviews', async (event, gameId: number) => {
    try {
      await requireUser(event);
      return await ratingDb.getReviews(assertId(gameId));
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('ratings:getUserReview', async (event, gameId: number) => {
    try {
      const user = await requireUser(event);
      const rating = await ratingDb.getUserRating(user.id, assertId(gameId));
      return rating ? { rating: rating.rating, comment: rating.comment } : null;
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
