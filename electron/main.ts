import { app, BrowserWindow } from 'electron';
import path from 'path';
import { AppDataSource } from './data-source';
import { User } from '../src/entities/User';
import 'reflect-metadata';

async function createDefaultAdmin() {
  const userRepo = AppDataSource.getRepository(User);
  const adminExists = await userRepo.findOneBy({ role: 'admin' });
  if (!adminExists) {
    const admin = new User();
    admin.username = 'admin';
    await admin.setPassword('admin');
    admin.role = 'admin';
    await userRepo.save(admin);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 2880,
    height: 1800,
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
  await createDefaultAdmin();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});