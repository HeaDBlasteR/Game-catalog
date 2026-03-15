import { ipcMain } from 'electron';
import { gameDb, genreDb } from '../database-service';
import { AppDataSource } from '../data-source';
import { User } from '../../src/entities/User';

async function checkAdmin(userId: number): Promise<boolean> {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOneBy({ id: userId });
  return user?.role === 'admin';
}

export function registerAdminHandlers() {
  ipcMain.handle('admin:addGame', async (event, gameData, adminUserId: number) => {
    try {
      if (!await checkAdmin(adminUserId)) throw new Error('Access denied');
      const newGame = await gameDb.create(gameData);
      return newGame;
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('admin:updateGame', async (event, id: number, updates, adminUserId: number) => {
    try {
      if (!await checkAdmin(adminUserId)) throw new Error('Access denied');
      await gameDb.update(id, updates);
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('admin:deleteGame', async (event, id: number, adminUserId: number) => {
    try {
      if (!await checkAdmin(adminUserId)) throw new Error('Access denied');
      await gameDb.delete(id);
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('admin:addGenre', async (event, genreData, adminUserId: number) => {
    try {
      if (!await checkAdmin(adminUserId)) throw new Error('Access denied');
      return await genreDb.create(genreData.name, genreData.description);
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('admin:deleteGenre', async (event, id: number, adminUserId: number) => {
    try {
      if (!await checkAdmin(adminUserId)) throw new Error('Access denied');
      await genreDb.delete(id);
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message);
    }
  });
}