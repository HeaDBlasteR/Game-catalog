import { ipcMain } from 'electron';
import { AppDataSource } from '../data-source';
import { User } from '../../src/entities/User';

export function registerAuthHandlers() {
  ipcMain.handle('auth:login', async (event, username: string, password: string) => {
    try {
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOneBy({ username });
      if (!user) throw new Error('User not found');
      const isValid = await user.checkPassword(password);
      if (!isValid) throw new Error('Invalid password');
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('auth:register', async (event, username: string, password: string) => {
    try {
      const userRepo = AppDataSource.getRepository(User);
      const existing = await userRepo.findOneBy({ username });
      if (existing) throw new Error('Username already exists');
      const user = new User();
      user.username = username;
      await user.setPassword(password);
      user.role = 'user';
      const saved = await userRepo.save(user);
      const { password: _, ...userWithoutPassword } = saved;
      return userWithoutPassword;
    } catch (err: any) {
      throw new Error(err.message);
    }
  });
}