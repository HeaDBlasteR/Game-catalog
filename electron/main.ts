import 'reflect-metadata';
import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import { AppDataSource } from './data-source';
import { User } from '../src/entities/User';
import { registerAuthHandlers } from './ipc/auth';
import { registerGamesHandlers } from './ipc/games';
import { registerRatingsHandlers } from './ipc/ratings';
import { registerAdminHandlers } from './ipc/admin';
import { registerGenresHandlers } from './ipc/genres';
import { DefaultGenreService } from './services/default-genre-service';
import { clearSession } from './session';
import { mt, registerI18nHandlers } from './i18n';

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
      sandbox: true,
      webSecurity: true,
    },
  });

  const webContentsId = win.webContents.id;
  win.webContents.on('destroyed', () => clearSession(webContentsId));
  win.webContents.on('did-navigate', () => clearSession(webContentsId));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  try {
    await AppDataSource.initialize();
    await createDefaultAdmin();
    await DefaultGenreService.ensureDefaultGenres();
  } catch (err: any) {
    dialog.showErrorBox(mt('startupErrorTitle'), `${mt('startupErrorMessage')}\n${err?.message ?? err}`);
    app.quit();
    return;
  }

  registerI18nHandlers();
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