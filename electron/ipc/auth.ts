import { dialog, ipcMain } from 'electron';
import { AppDataSource } from '../data-source';
import { gameDb } from '../database-service';
import { User } from '../../src/entities/User';
import { assertString, clearSession, requireUser, setSessionUser } from '../session';

const ICON_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_ICON_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon'
]);

type UpdateProfileInput = {
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  iconPath?: string | null;
};

function toPublicUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.displayName ?? null,
    email: user.email ?? null,
    phone: user.phone ?? null,
    iconPath: user.iconPath ?? null
  };
}

function normalizeNullableText(value: string | null | undefined, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function validateProfileIconPath(iconPath?: string | null): string | null {
  if (typeof iconPath !== 'string') return null;

  const trimmed = iconPath.trim();
  if (!trimmed) return null;

  const match = /^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/.exec(trimmed);
  if (!match) {
    throw new Error('Некорректный формат data URL для иконки профиля');
  }

  const mimeType = match[1].toLowerCase();
  if (!ALLOWED_ICON_MIME_TYPES.has(mimeType)) {
    throw new Error('Неподдерживаемый формат иконки профиля');
  }

  const binary = Buffer.from(match[2], 'base64');
  if (!binary.length) {
    throw new Error('Иконка профиля не содержит данных');
  }

  if (binary.length > ICON_UPLOAD_MAX_BYTES) {
    throw new Error('Иконка слишком большая. Максимальный размер: 5 МБ');
  }

  return `data:${mimeType};base64,${binary.toString('base64')}`;
}

export function registerAuthHandlers() {
  ipcMain.handle('auth:login', async (event, username: string, password: string) => {
    try {
      const userRepo = AppDataSource.getRepository(User);
      const normalizedUsername = assertString(username, 'Имя пользователя').trim();
      const user = normalizedUsername ? await userRepo.findOneBy({ username: normalizedUsername }) : null;
      if (!user || !(await user.checkPassword(assertString(password, 'Пароль')))) {
        throw new Error('Неверное имя пользователя или пароль');
      }
      setSessionUser(event, user.id);
      return toPublicUser(user);
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('auth:register', async (event, username: string, password: string) => {
    try {
      const normalizedUsername = assertString(username, 'Имя пользователя').trim();
      if (!normalizedUsername) throw new Error('Имя пользователя обязательно');
      if (normalizedUsername.length > 64) throw new Error('Имя пользователя не должно быть длиннее 64 символов');
      if (!assertString(password, 'Пароль')) throw new Error('Пароль обязателен');
      if (Buffer.byteLength(password) > 72) throw new Error('Пароль слишком длинный');

      const userRepo = AppDataSource.getRepository(User);
      const existing = await userRepo.findOneBy({ username: normalizedUsername });
      if (existing) throw new Error('Пользователь с таким именем уже существует');
      const user = new User();
      user.username = normalizedUsername;
      await user.setPassword(password);
      user.role = 'user';
      const saved = await userRepo.save(user);
      setSessionUser(event, saved.id);
      return toPublicUser(saved);
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('auth:logout', async event => {
    clearSession(event.sender.id);
    return { success: true };
  });

  ipcMain.handle('auth:getProfile', async event => {
    try {
      const user = await requireUser(event);
      return toPublicUser(user);
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('auth:uploadProfileIconFromPC', async event => {
    try {
      const user = await requireUser(event);

      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Выберите иконку профиля',
        properties: ['openFile'],
        filters: [{ name: 'Иконки', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg', 'ico'] }]
      });

      if (canceled || !filePaths.length) {
        return null;
      }

      return await gameDb.uploadIconFromLocalFile(filePaths[0], 'user', user.id);
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('auth:updateProfile', async (event, input: UpdateProfileInput) => {
    try {
      const userRepo = AppDataSource.getRepository(User);
      const user = await requireUser(event);
      if (!input || typeof input !== 'object') throw new Error('Некорректные данные профиля');

      if ('displayName' in input) {
        user.displayName = normalizeNullableText(input.displayName, 64);
      }

      if ('email' in input) {
        user.email = normalizeNullableText(input.email, 254);
      }

      if ('phone' in input) {
        user.phone = normalizeNullableText(input.phone, 32);
      }

      if ('iconPath' in input) {
        user.iconPath = validateProfileIconPath(input.iconPath);
      }

      const saved = await userRepo.save(user);
      return toPublicUser(saved);
    } catch (err: any) {
      throw new Error(err.message);
    }
  });
}