import { app, BrowserWindow } from 'electron';
import path from 'path';
import { AppDataSource } from './data-source';
import { User } from '../src/entities/User';
import 'reflect-metadata';
import { registerAuthHandlers } from './ipc/auth';
import { registerGamesHandlers } from './ipc/games';
import { registerRatingsHandlers } from './ipc/ratings';
import { registerAdminHandlers } from './ipc/admin';
import { registerGenresHandlers } from './ipc/genres';
import { DefaultGenreService } from './services/default-genre-service';
import { migrateLegacyIconsToDatabase } from './database-service';

async function createDefaultAdmin() {
  const userRepo = AppDataSource.getRepository(User);
  const adminExists = await userRepo.findOneBy({ role: 'admin' });
  if (!adminExists) {
    const admin = new User();
    admin.username = 'admin';
    await admin.setPassword('admin');
    admin.role = 'admin';
    await userRepo.save(admin);
    console.log('Default admin created');
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  await AppDataSource.initialize();
  await migrateLegacyIconsToDatabase();
  await createDefaultAdmin();
  await DefaultGenreService.ensureDefaultGenres();

  registerAuthHandlers();
  registerGamesHandlers();
  registerGenresHandlers();
  registerRatingsHandlers();
  registerAdminHandlers();

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});